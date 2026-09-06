import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const streamChat = vi.fn()
const getSessions = vi.fn().mockResolvedValue({ sessions: [] })

vi.mock('@/services/api', () => ({
  default: { streamChat, getSessions }
}))

describe('Phase B unified chat store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    streamChat.mockReset()
    getSessions.mockClear()
  })

  it('uses one streamed path for a new session and consumes the end session id', async () => {
    streamChat.mockImplementation(async (_request, { onStart, onDelta, onEnd }) => {
      onStart()
      onDelta('统一回答')
      await onEnd({ session_id: 'session-new', assistant_message_id: 12 })
    })
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    const router = { push: vi.fn() }

    await store.sendUnifiedMessage('你好', null, router)

    expect(store.currentSessionId).toBe('session-new')
    expect(store.messages.at(-1)).toMatchObject({ content: '统一回答', status: 'done', id: 12 })
    expect(router.push).toHaveBeenCalledWith('/chat/session-new')
  })

  it('uses the existing session for voice and image without another transport', async () => {
    streamChat.mockImplementation(async (_request, { onStart, onDelta, onEnd }) => {
      onStart()
      onDelta('收到')
      await onEnd({ session_id: 'existing', image_path: '/uploads/a.png' })
    })
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.currentSessionId = 'existing'

    await store.sendUnifiedMessage('语音转写', '/uploads/a.png', null, { responseStyle: 'voice_call' })

    expect(streamChat).toHaveBeenCalledWith({
      prompt: '语音转写',
      session_id: 'existing',
      image_path: '/uploads/a.png',
      response_style: 'voice_call'
    }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
    expect(store.currentSessionId).toBe('existing')
  })

  it('keeps the failed user turn and creates a retryable non-message error state', async () => {
    streamChat.mockRejectedValueOnce(new Error('network details'))
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.currentSessionId = 'session-existing'
    store.messages.push({ id: 'user-1', role: 'user', content: '帮我看看今天该处理什么' })

    await store.sendUnifiedMessage('帮我看看今天该处理什么')

    expect(store.messages.filter(message => message.role === 'user')).toHaveLength(1)
    expect(store.messages.at(-1)).toMatchObject({
      role: 'assistant',
      status: 'error',
      content: '',
      recovery: {
        kind: 'request_failed',
        message: '刚才没有发送成功。',
        retryable: true,
        retrying: false,
        userMessageId: 'user-1',
        conversationId: 'session-existing'
      }
    })
    expect(JSON.stringify(store.messages.at(-1))).not.toMatch(/network details|HTTP|transport|Core2|Legacy/)
  })

  it('retries the same turn once, preserves the conversation, and clears recovery on success', async () => {
    streamChat
      .mockRejectedValueOnce(new Error('offline'))
      .mockImplementationOnce(async (_request, { onStart, onDelta, onEnd }) => {
        onStart()
        onDelta('恢复成功')
        await onEnd({ session_id: 'session-existing', assistant_message_id: 22 })
      })
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.currentSessionId = 'session-existing'
    store.messages.push({ id: 'user-1', role: 'user', content: '原始问题' })
    await store.sendUnifiedMessage('原始问题')
    const failed = store.messages.at(-1)
    store.currentSessionId = 'another-session'

    await store.retryMessage(failed)

    expect(store.messages.filter(message => message.role === 'user')).toHaveLength(1)
    expect(store.messages.at(-1)).toMatchObject({ id: 22, content: '恢复成功', status: 'done' })
    expect(store.messages.at(-1).recovery).toBeUndefined()
    expect(streamChat).toHaveBeenLastCalledWith(expect.objectContaining({
      prompt: '原始问题',
      session_id: 'session-existing'
    }), expect.any(Object))
  })

  it('keeps retry available after another failure and ignores a double retry', async () => {
    let rejectRetry
    const pendingRetry = new Promise((_resolve, reject) => { rejectRetry = reject })
    streamChat.mockRejectedValueOnce(new Error('first')).mockReturnValueOnce(pendingRetry)
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.messages.push({ id: 'user-1', role: 'user', content: '原始问题' })
    await store.sendUnifiedMessage('原始问题')
    const failed = store.messages.at(-1)

    const firstRetry = store.retryMessage(failed)
    const duplicateRetry = store.retryMessage(failed)
    expect(streamChat).toHaveBeenCalledTimes(2)
    rejectRetry(new Error('second'))
    await Promise.all([firstRetry, duplicateRetry])

    expect(failed).toMatchObject({ status: 'error', recovery: { retryable: true, retrying: false } })
  })

  it('preserves partial output as interrupted and regenerates it from the original user turn', async () => {
    streamChat
      .mockImplementationOnce(async (_request, { onStart, onDelta }) => {
        onStart()
        onDelta('已经收到的部分内容')
        throw new Error('stream broke')
      })
      .mockImplementationOnce(async (_request, { onStart, onDelta, onEnd }) => {
        onStart()
        onDelta('完整回复')
        await onEnd({ session_id: 's-partial' })
      })
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.currentSessionId = 's-partial'
    store.messages.push({ id: 'user-p', role: 'user', content: '继续回答' })

    await store.sendUnifiedMessage('继续回答')
    const interrupted = store.messages.at(-1)
    expect(interrupted).toMatchObject({
      content: '已经收到的部分内容',
      status: 'interrupted',
      recovery: { kind: 'stream_interrupted', message: '回复中断', actionLabel: '重新生成' }
    })

    await store.retryMessage(interrupted)
    expect(store.messages.filter(message => message.role === 'user')).toHaveLength(1)
    expect(store.messages.at(-1)).toMatchObject({ content: '完整回复', status: 'done' })
  })

  it('turns an empty successful stream into a recoverable state', async () => {
    streamChat.mockImplementationOnce(async (_request, { onStart, onEnd }) => {
      onStart()
      await onEnd({ session_id: 's-empty' })
    })
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.messages.push({ id: 'user-empty', role: 'user', content: '请回答' })

    await store.sendUnifiedMessage('请回答')

    expect(store.messages.at(-1)).toMatchObject({
      status: 'error',
      recovery: {
        kind: 'empty_response',
        message: '小乐这次没有返回有效内容。',
        actionLabel: '重试',
        retryable: true
      }
    })
  })

  it('keeps stop as a completed partial response instead of a failure', async () => {
    streamChat.mockImplementationOnce((_request, { onStart, onDelta, signal }) => new Promise((_resolve, reject) => {
      onStart()
      onDelta('用户主动停止前的内容')
      signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
    }))
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.messages.push({ id: 'user-stop', role: 'user', content: '给我长回复' })

    const sending = store.sendUnifiedMessage('给我长回复')
    await Promise.resolve()
    store.stopGeneration()
    await sending

    expect(store.messages.at(-1)).toMatchObject({ content: '用户主动停止前的内容', status: 'done' })
    expect(store.messages.at(-1).recovery).toBeUndefined()
  })
})

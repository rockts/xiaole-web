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
})

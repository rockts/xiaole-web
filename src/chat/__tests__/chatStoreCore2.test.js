import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const chatCore2 = vi.fn()
const getSessions = vi.fn().mockResolvedValue({ sessions: [] })
vi.mock('@/services/api', () => ({ default: { chatCore2, getSessions } }))

describe('Core2 Store orchestration', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    chatCore2.mockReset()
    getSessions.mockClear()
  })

  it('renders one complete safe response and refreshes the shared session list', async () => {
    chatCore2.mockResolvedValue({ answer: '**ok**', intent: 'memory', sources: [{ title: '通知', url: 'https://example.com' }], action: null, conversation_id: 'raw-ignored' })
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    store.messages.push({ id: 1, role: 'assistant', content: '', status: 'thinking' })
    await store.sendMessageCore2('question', null, { push: vi.fn() })
    expect(store.messages[0]).toMatchObject({ content: '**ok**', status: 'done', core2: true, intent: 'memory' })
    expect(store.messages[0].sources).toEqual([{ title: '通知', url: 'https://example.com' }])
    expect(getSessions).toHaveBeenCalledOnce()
  })

  it('does not call legacy or submit twice while a Core2 request is pending', async () => {
    let release
    chatCore2.mockReturnValue(new Promise(resolve => { release = resolve }))
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    const first = store.sendMessageCore2('action')
    const second = await store.sendMessageCore2('duplicate')
    expect(second).toBe(false)
    expect(chatCore2).toHaveBeenCalledOnce()
    release({ answer: 'done', intent: 'action', sources: [], action: { status: 'success', summary: 'done' } })
    await first
  })

  it('shows a manual fallback action without resending to legacy', async () => {
    chatCore2.mockRejectedValue(new Error('offline'))
    const { useChatStore } = await import('../../stores/chat')
    const store = useChatStore()
    await store.sendMessageCore2('hi')
    expect(store.messages.at(-1)).toMatchObject({ core2Error: true, content: '小乐 2.0 暂时不可用' })
    expect(chatCore2).toHaveBeenCalledOnce()
  })
})

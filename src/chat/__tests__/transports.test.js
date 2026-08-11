import { describe, expect, it, vi } from 'vitest'
import { Core2ChatTransport, LegacyChatTransport, createChatTransport } from '../transports'

describe('chat transports', () => {
  it('legacy calls only the existing stream boundary', async () => {
    const streamChat = vi.fn().mockResolvedValue('legacy')
    const chatCore2 = vi.fn()
    const transport = new LegacyChatTransport({ streamChat })
    await transport.send({ message: 'hi', conversationId: 'c1' })
    expect(streamChat).toHaveBeenCalledOnce()
    expect(chatCore2).not.toHaveBeenCalled()
  })

  it('core2 maps the request and never calls legacy', async () => {
    const chatCore2 = vi.fn().mockResolvedValue({ answer: 'ok', intent: 'conversation', sources: [], action: null })
    const streamChat = vi.fn()
    const transport = new Core2ChatTransport({ chatCore2 })
    await transport.send({ message: 'hi', conversationId: 'c1', attachments: [] })
    expect(chatCore2).toHaveBeenCalledWith({ message: 'hi', conversation_id: 'c1', attachments: [] }, expect.any(Object))
    expect(streamChat).not.toHaveBeenCalled()
  })

  it('core2 rejects attachments before any request', async () => {
    const chatCore2 = vi.fn()
    const transport = new Core2ChatTransport({ chatCore2 })
    await expect(transport.send({ message: 'read', attachments: [{ name: 'a.pdf' }] })).rejects.toMatchObject({ code: 'CORE2_ATTACHMENTS_UNSUPPORTED' })
    expect(chatCore2).not.toHaveBeenCalled()
  })

  it('selector only selects a transport and exposes no intent router', () => {
    const selected = createChatTransport('core2', { chatCore2: vi.fn() })
    expect(selected).toBeInstanceOf(Core2ChatTransport)
    expect(selected.classifyIntent).toBeUndefined()
  })
})

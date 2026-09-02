import { describe, expect, it, vi } from 'vitest'
import { UnifiedChatTransport, createChatTransport } from '../transports'

describe('Phase B unified chat transport', () => {
  it('sends text, session, image and response style through one stream boundary', async () => {
    const streamChat = vi.fn().mockResolvedValue(undefined)
    const transport = new UnifiedChatTransport({ streamChat })
    const callbacks = { onDelta: vi.fn() }

    await transport.send({
      message: '请看图片',
      conversationId: 'c1',
      imagePath: '/uploads/a.png',
      responseStyle: 'voice_call',
      callbacks
    })

    expect(streamChat).toHaveBeenCalledWith({
      prompt: '请看图片',
      session_id: 'c1',
      image_path: '/uploads/a.png',
      response_style: 'voice_call'
    }, expect.objectContaining({ ...callbacks, signal: expect.any(AbortSignal) }))
  })

  it('creates the same transport without accepting a mode selector', () => {
    const first = createChatTransport({ streamChat: vi.fn() })
    const second = createChatTransport({ streamChat: vi.fn() })

    expect(first).toBeInstanceOf(UnifiedChatTransport)
    expect(second).toBeInstanceOf(UnifiedChatTransport)
  })
})

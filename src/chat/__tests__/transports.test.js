import { describe, expect, it, vi } from 'vitest'
import { createTurnContext } from '../turnContext'
import { UnifiedChatTransport, createChatTransport } from '../transports'

describe('Phase B unified chat transport', () => {
  it('creates one frozen semantic turn context from browser inputs', () => {
    const value = createTurnContext({
      now: () => new Date('2026-09-14T02:00:00.000Z'),
      randomUUID: () => '018f8f72-4c58-7b5e-9ef1-5d96f902c42a',
      resolveTimezone: () => 'Asia/Shanghai'
    })

    expect(value).toEqual({
      turn_id: '018f8f72-4c58-7b5e-9ef1-5d96f902c42a',
      requested_at: '2026-09-14T10:00:00+08:00',
      timezone: 'Asia/Shanghai'
    })
    expect(Object.isFrozen(value)).toBe(true)
  })

  it('sends text, session, image and response style through one stream boundary', async () => {
    const streamChat = vi.fn().mockResolvedValue(undefined)
    const transport = new UnifiedChatTransport({ streamChat })
    const callbacks = { onDelta: vi.fn() }

    await transport.send({
      message: '请看图片',
      conversationId: 'c1',
      imagePath: '/uploads/a.png',
      responseStyle: 'voice_call',
      turnContext: {
        turn_id: '018f8f72-4c58-7b5e-9ef1-5d96f902c42a',
        requested_at: '2026-09-14T10:00:00+08:00',
        timezone: 'Asia/Shanghai'
      },
      callbacks
    })

    expect(streamChat).toHaveBeenCalledWith({
      prompt: '请看图片',
      session_id: 'c1',
      image_path: '/uploads/a.png',
      response_style: 'voice_call',
      turn_context: {
        turn_id: '018f8f72-4c58-7b5e-9ef1-5d96f902c42a',
        requested_at: '2026-09-14T10:00:00+08:00',
        timezone: 'Asia/Shanghai'
      }
    }, expect.objectContaining({ ...callbacks, signal: expect.any(AbortSignal) }))
  })

  it('creates the same transport without accepting a mode selector', () => {
    const first = createChatTransport({ streamChat: vi.fn() })
    const second = createChatTransport({ streamChat: vi.fn() })

    expect(first).toBeInstanceOf(UnifiedChatTransport)
    expect(second).toBeInstanceOf(UnifiedChatTransport)
  })
})

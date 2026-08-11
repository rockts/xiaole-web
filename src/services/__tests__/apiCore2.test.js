import { beforeEach, describe, expect, it, vi } from 'vitest'

const post = vi.fn()
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      get: vi.fn(), post, delete: vi.fn(), patch: vi.fn()
    })
  }
}))

describe('Core2 API boundary', () => {
  beforeEach(() => post.mockReset())

  it('posts the backend schema once with retry disabled and returns only mapped fields', async () => {
    post.mockResolvedValue({
      answer: 'ok', intent: 'conversation', sources: [], action: null,
      diagnostics: { model: 'private' }, request_id: 'r', conversation_id: 'c1'
    })
    const { default: api } = await import('../api')
    const result = await api.chatCore2({ message: 'hi', conversation_id: 'c1', attachments: [] }, { signal: 'signal' })
    expect(post).toHaveBeenCalledOnce()
    expect(post).toHaveBeenCalledWith('/api/v2/chat', {
      message: 'hi', conversation_id: 'c1', attachments: []
    }, { timeout: 120000, retryCount: 3, signal: 'signal' })
    expect(result).toEqual({ answer: 'ok', intent: 'conversation', sources: [], action: null, conversationId: 'c1' })
  })

  it('throws a sanitized Core2 error without preserving response or config', async () => {
    const { createSafeCore2Error } = await import('../../chat/core2Response')
    const cause = new Error('network')
    cause.response = { status: 500, data: { secret: 'x' } }
    cause.config = { headers: { Authorization: 'Bearer secret' } }
    const error = createSafeCore2Error(cause)
    expect(error).toMatchObject({ name: 'Core2RequestError', status: 500 })
    expect(error.response).toBeUndefined()
    expect(error.config).toBeUndefined()
    expect(JSON.stringify(error)).not.toContain('secret')
  })
})

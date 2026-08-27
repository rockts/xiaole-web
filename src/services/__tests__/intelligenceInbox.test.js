import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const put = vi.fn()
vi.mock('axios', () => ({ default: { create: () => ({ interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } }, get, put, post: vi.fn(), delete: vi.fn(), patch: vi.fn() }) } }))

describe('Intelligence Inbox API boundary', () => {
  beforeEach(() => { get.mockReset(); put.mockReset() })

  it('uses only XiaoLe Backend endpoints and encodes event IDs', async () => {
    const { default: api } = await import('../api')
    await api.getIntelligenceInbox('requires_attention')
    await api.getIntelligenceInboxDetail('event:1')
    await api.markIntelligenceRead('event:1')
    expect(get).toHaveBeenNthCalledWith(1, '/api/v2/intelligence/inbox', { params: { filter: 'requires_attention' }, retryCount: 3 })
    expect(get).toHaveBeenNthCalledWith(2, '/api/v2/intelligence/inbox/event%3A1', { retryCount: 3 })
    expect(put).toHaveBeenCalledWith('/api/v2/intelligence/inbox/event%3A1/read', undefined, { retryCount: 3 })
  })
})

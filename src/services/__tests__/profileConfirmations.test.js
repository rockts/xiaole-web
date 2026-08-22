import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
const post = vi.fn()
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      get, post, delete: vi.fn(), patch: vi.fn()
    })
  }
}))

describe('Profile Confirmation API boundary', () => {
  beforeEach(() => { get.mockReset(); post.mockReset() })

  it('reads confirmations only through the XiaoLe v2 proxy', async () => {
    const { default: api } = await import('../api')
    await api.getProfileConfirmations()
    expect(get).toHaveBeenCalledWith('/api/v2/profile/confirmations', { retryCount: 3 })
  })

  it('keeps the operation payload and Idempotency-Key on one Axios request config', async () => {
    const { default: api } = await import('../api')
    const command = { operation: 'confirm', expected_version: 'a'.repeat(64), value: ['信息科技'] }
    await api.submitProfileConfirmation('current_teaching_subjects', command, 'same-action-uuid')
    expect(post).toHaveBeenCalledWith(
      '/api/v2/profile/confirmations/current_teaching_subjects',
      command,
      { headers: { 'Idempotency-Key': 'same-action-uuid' } }
    )
  })
})

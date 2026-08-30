import { beforeEach, describe, expect, it, vi } from 'vitest'

const get = vi.fn()
vi.mock('axios', () => ({
  default: {
    create: () => ({
      interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
      get,
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      patch: vi.fn()
    })
  }
}))

describe('Action current projection API boundary', () => {
  beforeEach(() => get.mockReset())

  it('requests the explicit current view while historical tasks keep the original query', async () => {
    const { default: api } = await import('../api')

    await api.getCurrentTasks(50)
    await api.getTasks('', 50)

    expect(get).toHaveBeenNthCalledWith(1, '/tasks', { params: { view: 'current', limit: 50 } })
    expect(get).toHaveBeenNthCalledWith(2, '/tasks', { params: { limit: 50 } })
  })
})

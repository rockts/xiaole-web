import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../services/api', () => ({
  default: {
    getProfileConfirmations: vi.fn(),
    submitProfileConfirmation: vi.fn()
  }
}))

import api from '../../services/api'
import { useProfileConfirmationsStore } from '../profileConfirmations'

const items = [
  { key: 'current_teaching_subjects', label: '当前任教学科', state: 'needs_confirmation', candidate_value: ['数学'], input_type: 'multi_text', options: [], version: 'a'.repeat(64) },
  { key: 'current_service_targets', label: '当前服务对象', state: 'needs_confirmation', candidate_value: null, input_type: 'multi_text', options: [], version: 'b'.repeat(64) },
  { key: 'current_role', label: '当前岗位', state: 'needs_confirmation', candidate_value: '教师', input_type: 'text', options: [], version: 'c'.repeat(64) },
  { key: 'preferred_name', label: '希望小乐怎么称呼你', state: 'needs_confirmation', candidate_value: null, input_type: 'text', options: [], version: 'd'.repeat(64) }
]

describe('profile confirmation store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    api.getProfileConfirmations.mockResolvedValue({ schema_version: 1, items })
    vi.stubGlobal('crypto', { randomUUID: vi.fn(() => 'action-uuid-1') })
  })

  it('loads the canonical four-item pending count', async () => {
    const store = useProfileConfirmationsStore()
    await store.load()
    expect(store.pendingCount).toBe(4)
    expect(store.items.map((item) => item.key)).toEqual([
      'current_teaching_subjects', 'current_service_targets', 'current_role', 'preferred_name'
    ])
  })

  it('submits confirm with the exact candidate, server version, and one UUID', async () => {
    api.submitProfileConfirmation.mockResolvedValue({ key: 'current_role', state: 'confirmed' })
    api.getProfileConfirmations
      .mockResolvedValueOnce({ schema_version: 1, items })
      .mockResolvedValueOnce({ schema_version: 1, items: items.filter((item) => item.key !== 'current_role') })
    const store = useProfileConfirmationsStore()
    await store.load()
    await store.submit(items[2], 'confirm')
    expect(api.submitProfileConfirmation).toHaveBeenCalledWith(
      'current_role',
      { operation: 'confirm', expected_version: 'c'.repeat(64), value: '教师' },
      'action-uuid-1'
    )
    expect(store.pendingCount).toBe(3)
  })

  it('submits replace with user input instead of candidate data', async () => {
    api.submitProfileConfirmation.mockResolvedValue({ key: 'preferred_name', state: 'confirmed' })
    const store = useProfileConfirmationsStore()
    await store.load()
    await store.submit(items[3], 'replace', '高老师')
    expect(api.submitProfileConfirmation).toHaveBeenCalledWith(
      'preferred_name',
      { operation: 'replace', expected_version: 'd'.repeat(64), value: '高老师' },
      'action-uuid-1'
    )
  })

  it('prevents a second submit while the same field is in flight', async () => {
    let resolveRequest
    api.submitProfileConfirmation.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve }))
    const store = useProfileConfirmationsStore()
    await store.load()
    const first = store.submit(items[2], 'confirm')
    const second = await store.submit(items[2], 'confirm')
    expect(second).toBe(false)
    expect(api.submitProfileConfirmation).toHaveBeenCalledTimes(1)
    resolveRequest({ key: 'current_role', state: 'confirmed' })
    await first
  })

  it('shows stale copy and reloads confirmations after 409', async () => {
    api.submitProfileConfirmation.mockRejectedValue({ response: { status: 409 } })
    const store = useProfileConfirmationsStore()
    await store.load()
    await expect(store.submit(items[2], 'confirm')).resolves.toBe(false)
    expect(store.errorFor('current_role')).toBe('这项资料刚刚发生了变化，请刷新后再确认。')
    expect(api.getProfileConfirmations).toHaveBeenCalledTimes(2)
  })

  it.each([
    [400, '提交的资料格式不正确，请检查后再试。'],
    [403, '当前账号暂时不能确认这项资料。'],
    [404, '这项资料目前不能确认，请刷新后再试。'],
    [413, '填写的内容太长，请缩短后再试。'],
    [500, '这项资料暂时没有保存成功，原来的资料没有被覆盖，请稍后再试。']
  ])('maps HTTP %i to safe user copy', async (status, message) => {
    api.submitProfileConfirmation.mockRejectedValue({ response: { status } })
    const store = useProfileConfirmationsStore()
    await store.load()
    await store.submit(items[2], 'confirm')
    expect(store.errorFor('current_role')).toBe(message)
  })

  it('reloads the canonical list through the complete 4 to 3 to 2 to 1 to 0 sequence', async () => {
    let remaining = [...items]
    api.getProfileConfirmations.mockImplementation(async () => ({ schema_version: 1, items: remaining }))
    api.submitProfileConfirmation.mockImplementation(async (key) => {
      remaining = remaining.filter((item) => item.key !== key)
      return { key, state: 'confirmed' }
    })
    const store = useProfileConfirmationsStore()
    await store.load()
    const counts = [store.pendingCount]
    for (const pending of items) {
      const operation = pending.candidate_value == null ? 'replace' : 'confirm'
      const value = pending.input_type === 'multi_text' ? ['教师'] : '高老师'
      await store.submit(pending, operation, value)
      counts.push(store.pendingCount)
    }
    expect(counts).toEqual([4, 3, 2, 1, 0])
  })
})

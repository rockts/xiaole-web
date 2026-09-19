import { beforeEach, describe, expect, it } from 'vitest'
import { clearTurnContext, resumeOrCreateTurnContext } from '../turnContext'

describe('semantic turn context persistence', () => {
  beforeEach(() => sessionStorage.clear())

  it('reuses frozen context across a page reload retry until confirmed complete', () => {
    const options = {
      storage: sessionStorage,
      now: () => new Date('2026-09-14T02:00:00Z'),
      randomUUID: () => '018f8f72-4c58-7b5e-9ef1-5d96f902c42a',
      resolveTimezone: () => 'Asia/Shanghai'
    }
    const first = resumeOrCreateTurnContext('same-action', options)
    const afterReload = resumeOrCreateTurnContext('same-action', {
      ...options,
      now: () => new Date('2026-09-14T03:00:00Z'),
      randomUUID: () => 'different-attempt-id'
    })
    expect(afterReload).toEqual(first)

    clearTurnContext('same-action', sessionStorage)
    const nextAction = resumeOrCreateTurnContext('same-action', {
      ...options,
      randomUUID: () => 'new-semantic-turn'
    })
    expect(nextAction.turn_id).toBe('new-semantic-turn')
  })
})

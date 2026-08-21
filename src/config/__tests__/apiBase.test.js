import { describe, expect, test } from 'vitest'

describe('production API base', () => {
  test('accepts api.xiaole.app as the only production API endpoint', async () => {
    const module = await import('../apiBase.js').catch(() => null)
    expect(module, 'central API base module must exist').not.toBeNull()

    expect(module.resolveApiBase(true, 'https://api.xiaole.app')).toBe('https://api.xiaole.app')
    expect(() => module.resolveApiBase(true, 'https://api.leke.xyz')).toThrow()
    expect(() => module.resolveApiBase(true, 'https://ai.leke.xyz')).toThrow()
    expect(() => module.resolveApiBase(true, '')).toThrow()
    expect(module.resolveApiBase(false, '')).toBe('')
  })
})

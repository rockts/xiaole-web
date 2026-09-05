import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  initializeTheme,
  resolvedTheme,
  setThemePreference,
  themePreference
} from '../themeAuthority'

function installMatchMedia(matches = false) {
  let listener
  const media = {
    matches,
    addEventListener: vi.fn((_event, callback) => { listener = callback }),
    removeEventListener: vi.fn()
  }
  vi.stubGlobal('matchMedia', vi.fn(() => media))
  return {
    media,
    change(nextMatches) {
      media.matches = nextMatches
      listener?.({ matches: nextMatches })
    }
  }
}

describe('theme authority', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('data-theme')
    vi.unstubAllGlobals()
  })

  it.each([
    ['dark', 'dark'],
    ['light', 'light']
  ])('uses xiaole_settings %s as the actual runtime theme', (preference, expected) => {
    installMatchMedia(false)
    localStorage.setItem('xiaole_settings', JSON.stringify({ theme: preference }))

    initializeTheme()

    expect(themePreference.value).toBe(preference)
    expect(resolvedTheme.value).toBe(expected)
    expect(document.documentElement.dataset.theme).toBe(expected)
  })

  it('applies and persists an explicit theme immediately', () => {
    installMatchMedia(false)
    initializeTheme()

    setThemePreference('dark')

    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(JSON.parse(localStorage.getItem('xiaole_settings'))).toEqual({ theme: 'dark' })
  })

  it('resolves system preference and updates live with the OS', () => {
    const system = installMatchMedia(true)
    localStorage.setItem('xiaole_settings', JSON.stringify({ theme: 'auto' }))
    initializeTheme()

    expect(resolvedTheme.value).toBe('dark')
    system.change(false)
    expect(resolvedTheme.value).toBe('light')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('migrates the old standalone theme key without changing the visible theme', () => {
    installMatchMedia(false)
    localStorage.setItem('theme', 'dark')

    initializeTheme()

    expect(localStorage.getItem('theme')).toBeNull()
    expect(JSON.parse(localStorage.getItem('xiaole_settings'))).toEqual({ theme: 'dark' })
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('keeps xiaole_settings authoritative when both historical keys exist', () => {
    installMatchMedia(false)
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('xiaole_settings', JSON.stringify({ theme: 'light', nickname: '小乐用户' }))

    initializeTheme()

    expect(localStorage.getItem('theme')).toBeNull()
    expect(JSON.parse(localStorage.getItem('xiaole_settings'))).toEqual({ theme: 'light', nickname: '小乐用户' })
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})

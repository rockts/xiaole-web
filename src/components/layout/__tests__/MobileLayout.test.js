import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const source = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), 'utf8')

describe('mobile viewport and bottom navigation layout contract', () => {
  it('uses one shared tab bar offset for the fixed nav and every page scroll container', () => {
    const app = source('../../../App.vue')
    const bottomNav = source('../MobileBottomNav.vue')

    expect(app).toContain('--mobile-tab-bar-height: 56px')
    expect(app).toContain('--mobile-tab-bar-offset: calc(var(--mobile-tab-bar-height) + env(safe-area-inset-bottom))')
    expect(app).toContain('padding-bottom: var(--mobile-tab-bar-offset)')
    expect(app).toContain('bottom: var(--mobile-tab-bar-offset)')
    expect(bottomNav).toContain('height: var(--mobile-tab-bar-offset)')
    expect(bottomNav).toContain('padding-bottom: env(safe-area-inset-bottom)')
  })

  it('keeps dynamic viewport units authoritative and removes per-page tab bar padding', () => {
    const app = source('../../../App.vue')
    expect(app).toContain('@supports not (height: 100dvh)')
    expect(app).not.toMatch(/height:\s*100dvh;[^}]*height:\s*calc\(var\(--app-vh/)
    expect(app).toContain('--mobile-page-end-space: 32px')
    expect(app).toContain('padding-bottom: var(--mobile-page-end-space)')
  })
})

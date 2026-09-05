import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import SettingsView from '../SettingsView.vue'
import { initializeTheme } from '@/theme/themeAuthority'

function useLightSystem() {
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  })))
}

describe('Settings experience', () => {
  beforeEach(() => {
    localStorage.clear()
    useLightSystem()
    initializeTheme()
  })

  const mountSettings = (attachTo) => {
    const stubs = { RouterLink: { template: '<a><slot /></a>' } }
    if (!attachTo) stubs.Teleport = true
    return mount(SettingsView, { attachTo, global: { stubs } })
  }

  it('shows the actual preference and applies a new theme globally before save', async () => {
    localStorage.setItem('xiaole_settings', JSON.stringify({ theme: 'dark' }))
    initializeTheme()
    const wrapper = mountSettings()

    expect(wrapper.get('[data-testid="theme-select"]').element.value).toBe('dark')
    await wrapper.get('[data-testid="theme-select"]').setValue('light')

    expect(document.documentElement.dataset.theme).toBe('light')
    expect(JSON.parse(localStorage.getItem('xiaole_settings')).theme).toBe('light')
  })

  it('uses non-blocking save feedback instead of window.alert', async () => {
    const alert = vi.spyOn(window, 'alert').mockImplementation(() => {})
    const wrapper = mountSettings()

    await wrapper.get('[data-testid="save-settings"]').trigger('click')

    expect(alert).not.toHaveBeenCalled()
    expect(wrapper.get('[role="status"]').text()).toContain('设置已保存')
  })

  it('explains reset scope before restoring system theme defaults', async () => {
    localStorage.setItem('xiaole_settings', JSON.stringify({ theme: 'dark', nickname: '小乐用户' }))
    initializeTheme()
    const wrapper = mountSettings()

    await wrapper.get('[data-testid="reset-settings"]').trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toMatch(/称呼|主题|默认/)
    await wrapper.get('.btn-confirm').trigger('click')
    await flushPromises()

    expect(JSON.parse(localStorage.getItem('xiaole_settings')).theme).toBe('auto')
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('moves keyboard focus into the reset dialog and closes it with Escape', async () => {
    const wrapper = mountSettings(document.body)

    await wrapper.get('[data-testid="reset-settings"]').trigger('click')
    await flushPromises()
    const dialog = document.querySelector('[role="dialog"]')
    expect(document.activeElement).toBe(dialog)

    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await flushPromises()
    expect(document.querySelector('[role="dialog"]')).toBeNull()
    wrapper.unmount()
  })

  it('marks settings that are not wired to product behavior as unavailable', () => {
    const wrapper = mountSettings()
    const unavailable = wrapper.findAll('[data-testid="unavailable-setting"]')

    expect(unavailable.length).toBeGreaterThanOrEqual(2)
    unavailable.forEach((item) => expect(item.attributes('aria-disabled')).toBe('true'))
  })
})

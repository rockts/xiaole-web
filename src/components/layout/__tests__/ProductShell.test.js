import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import SidebarModern from '../SidebarModern.vue'
import MobileBottomNav from '../MobileBottomNav.vue'
import { useChatStore } from '@/stores/chat'
import { initializeTheme } from '@/theme/themeAuthority'

vi.mock('@/services/api', () => ({
  default: {
    getSessions: vi.fn().mockResolvedValue({ sessions: [] }),
    updateSession: vi.fn().mockResolvedValue({ success: true }),
    deleteSession: vi.fn().mockResolvedValue({ success: true })
  }
}))

const routes = [
  '/home', '/chat', '/chat/:sessionId?', '/knowledge', '/action',
  '/conversations', '/settings', '/behavior'
].map((path) => ({ path, component: { template: '<div />' } }))

const sessions = Array.from({ length: 9 }, (_, index) => ({
  id: `s${index + 1}`,
  session_id: `s${index + 1}`,
  title: `会话 ${index + 1}`,
  updated_at: `2026-08-${String(20 - index).padStart(2, '0')}T10:00:00Z`,
  pinned: false
}))

const mountShell = async (width) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width })
  const pinia = createPinia()
  setActivePinia(pinia)
  const store = useChatStore()
  store.sessions = sessions
  store.loadSessions = vi.fn().mockResolvedValue()
  const router = createRouter({ history: createMemoryHistory(), routes })
  await router.push('/chat/s1')
  await router.isReady()
  const wrapper = mount(SidebarModern, { global: { plugins: [pinia, router] } })
  await flushPromises()
  return wrapper
}

describe('XiaoLe Phase A product shell', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })))
    initializeTheme()
  })

  it('uses the light and dark logo variants for the resolved theme', async () => {
    const light = await mountShell(1280)
    expect(light.get('[data-testid="sidebar-logo"]').attributes('src')).toContain('logo-xiaole.png')
    light.unmount()

    localStorage.setItem('xiaole_settings', JSON.stringify({ theme: 'dark' }))
    initializeTheme()
    const dark = await mountShell(1280)
    expect(dark.get('[data-testid="sidebar-logo"]').attributes('src')).toContain('logo-xiaole-white-lines.png')
  })

  it('renders the desktop product navigation and limits recent conversations to six', async () => {
    const wrapper = await mountShell(1280)
    expect(wrapper.get('[data-testid="new-chat"]')).toBeTruthy()
    expect(wrapper.findAll('[data-testid="primary-nav-item"]').map((item) => item.text())).toEqual([
      '首页', '对话', '知识', '行动'
    ])
    expect(wrapper.findAll('[data-testid="recent-conversation"]')).toHaveLength(6)
    expect(wrapper.get('[data-testid="view-all-conversations"]').attributes('href')).toBe('/conversations')
    expect(wrapper.get('[data-testid="settings-link"]').attributes('href')).toBe('/settings')
    expect(wrapper.text()).not.toContain('待办任务')
    expect(wrapper.text()).not.toContain('行为分析')
    expect(wrapper.text()).not.toContain('工具')
    expect(wrapper.find('[data-testid="recent-conversation"].active').exists()).toBe(true)
  })

  it('renders a compact mobile drawer with five conversations and no duplicated primary navigation', async () => {
    const wrapper = await mountShell(390)
    const drawer = wrapper.get('.product-sidebar')
    expect(drawer.attributes('aria-hidden')).toBe('true')
    expect(drawer.attributes()).toHaveProperty('inert')
    await wrapper.vm.toggle()
    expect(drawer.attributes('aria-hidden')).toBe('false')
    expect(drawer.attributes()).not.toHaveProperty('inert')
    expect(wrapper.findAll('[data-testid="primary-nav-item"]')).toHaveLength(0)
    expect(wrapper.findAll('[data-testid="recent-conversation"]')).toHaveLength(5)
    expect(wrapper.get('[data-testid="new-chat"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="view-all-conversations"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="settings-link"]')).toBeTruthy()
    expect(wrapper.get('[data-testid="advanced-link"]').attributes('href')).toBe('/behavior')
  })

  it('renders four mobile bottom destinations with touch-sized controls', async () => {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push('/home')
    await router.isReady()
    const wrapper = mount(MobileBottomNav, { global: { plugins: [router] } })
    expect(wrapper.findAll('[data-testid="mobile-primary-nav-item"]').map((item) => item.text())).toEqual([
      '首页', '对话', '知识', '行动'
    ])
    expect(wrapper.get('[data-testid="mobile-bottom-nav"]').classes()).toContain('mobile-bottom-nav')
  })
})

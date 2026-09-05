import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatView from '@/views/ChatView.vue'
import SettingsView from '@/views/SettingsView.vue'
import { migrateLegacyChatMode } from '../chatSettingsMigration'

const { route, router, uploadDocument, getSession } = vi.hoisted(() => ({
  route: { params: {}, path: '/chat' },
  router: { push: vi.fn(), replace: vi.fn() },
  uploadDocument: vi.fn().mockResolvedValue({ success: true, summary: '摘要', key_points: [], processing_time: 0, document_id: 1 }),
  getSession: vi.fn().mockResolvedValue({ messages: [] })
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router
}))

vi.mock('@/services/api', () => ({
  default: {
    getSessions: vi.fn().mockResolvedValue({ sessions: [] }),
    getSession,
    recognizeVoice: vi.fn(),
    uploadImage: vi.fn(),
    uploadDocument,
    streamChat: vi.fn()
  }
}))

const mountChat = (settingsValue) => {
  localStorage.clear()
  if (settingsValue !== undefined) localStorage.setItem('xiaole_settings', settingsValue)
  migrateLegacyChatMode()
  return mount(ChatView, {
    global: {
      plugins: [createPinia()],
      stubs: { Teleport: true, ShareDialog: true, VoiceModeDialog: true }
    }
  })
}

describe('Phase B one user-visible Chat', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    router.push.mockReset()
    router.replace.mockReset()
    uploadDocument.mockClear()
    getSession.mockReset()
    getSession.mockResolvedValue({ messages: [] })
    route.params = {}
    route.path = '/chat'
  })

  it.each([
    ['legacy', '{"chatMode":"legacy","theme":"dark"}'],
    ['core2', '{"chatMode":"core2","theme":"dark"}'],
    ['missing', '{"theme":"dark"}'],
    ['malformed', '{broken']
  ])('shows one Chat with no internal mode UI for %s settings', (_label, value) => {
    const wrapper = mountChat(value)

    expect(wrapper.text()).not.toMatch(/兼容模式|标准对话|Core2|Legacy|切换.*模式/)
    expect(wrapper.find('[data-testid="compatibility-mode-label"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="confirm-compatibility-mode"]').exists()).toBe(false)
    expect(localStorage.getItem('xiaole_settings') || '').not.toContain('chatMode')
    wrapper.unmount()
  })

  it('opens image attachment flow without creating a mode setting', async () => {
    const wrapper = mountChat('{"chatMode":"core2","theme":"dark"}')
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', {
      configurable: true,
      value: [new File(['image'], 'photo.png', { type: 'image/png' })]
    })

    await input.trigger('change')

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    await vi.waitFor(() => {
      expect(wrapper.find('.input-preview-area').exists()).toBe(true)
    })
    expect(localStorage.getItem('xiaole_settings') || '').not.toContain('chatMode')
    wrapper.unmount()
  })

  it('renders historical and new failures with one Chat product language', async () => {
    route.params = { sessionId: 'historical-session' }
    route.path = '/chat/historical-session'
    getSession.mockResolvedValue({
      title: '历史会话',
      messages: [
        { id: 1, role: 'assistant', content: '小乐 2.0 暂时不可用', core2Error: true },
        { id: 2, role: 'assistant', content: '这条历史回复当时生成失败了。' },
        { id: 3, role: 'assistant', content: '普通历史消息' },
        { id: 4, role: 'assistant', content: '新消息' }
      ]
    })

    const wrapper = mountChat()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('这条历史回复当时未能正常完成。')
    })
    expect(wrapper.text()).toContain('这条历史回复当时生成失败了。')
    expect(wrapper.text()).toContain('普通历史消息')
    expect(wrapper.text()).toContain('新消息')
    expect(wrapper.text()).not.toMatch(/标准对话|兼容模式|Compatibility|Core2|Legacy|小乐\s*2\.0/)
    wrapper.unmount()
  })

  it('does not expose or save a mode in the settings page', async () => {
    localStorage.setItem('xiaole_settings', '{"chatMode":"legacy","theme":"dark"}')
    migrateLegacyChatMode()
    vi.stubGlobal('alert', vi.fn())
    const wrapper = mount(SettingsView, { global: { stubs: { Teleport: true, RouterLink: { template: '<a><slot /></a>' } } } })

    expect(wrapper.text()).not.toMatch(/对话模式|兼容模式|标准对话|Core2|Legacy/)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
    const save = wrapper.findAll('button').find(button => button.text().includes('保存设置'))
    await save.trigger('click')
    expect(JSON.parse(localStorage.getItem('xiaole_settings'))).not.toHaveProperty('chatMode')
    wrapper.unmount()
    vi.unstubAllGlobals()
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatView from '@/views/ChatView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SettingsModal from '@/components/common/SettingsModal.vue'
import { migrateLegacyChatMode } from '../chatSettingsMigration'

const { route, router, uploadDocument } = vi.hoisted(() => ({
  route: { params: {}, path: '/chat' },
  router: { push: vi.fn(), replace: vi.fn() },
  uploadDocument: vi.fn().mockResolvedValue({ success: true, summary: '摘要', key_points: [], processing_time: 0, document_id: 1 })
}))

vi.mock('vue-router', () => ({
  useRoute: () => route,
  useRouter: () => router
}))

vi.mock('@/services/api', () => ({
  default: {
    getSessions: vi.fn().mockResolvedValue({ sessions: [] }),
    getSession: vi.fn().mockResolvedValue({ messages: [] }),
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

  it.each([
    ['settings page', SettingsView],
    ['settings modal', SettingsModal]
  ])('does not expose or save a mode in the %s', async (_label, component) => {
    localStorage.setItem('xiaole_settings', '{"chatMode":"legacy","theme":"dark"}')
    migrateLegacyChatMode()
    vi.stubGlobal('alert', vi.fn())
    const wrapper = mount(component)

    expect(wrapper.text()).not.toMatch(/对话模式|兼容模式|标准对话|Core2|Legacy/)
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(0)
    const save = wrapper.findAll('button').find(button => button.text().includes('保存设置'))
    await save.trigger('click')
    expect(JSON.parse(localStorage.getItem('xiaole_settings'))).not.toHaveProperty('chatMode')
    wrapper.unmount()
    vi.unstubAllGlobals()
  })
})

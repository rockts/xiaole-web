import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ChatView from '@/views/ChatView.vue'
import SettingsView from '@/views/SettingsView.vue'
import SettingsModal from '@/components/common/SettingsModal.vue'
import Core2ResultMeta from '@/components/chat/Core2ResultMeta.vue'
import { useChatStore } from '@/stores/chat'

const route = { params: {}, path: '/chat' }
const router = { push: vi.fn(), replace: vi.fn() }

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
    uploadDocument: vi.fn()
  }
}))

const mountChat = (mode) => {
  localStorage.setItem('xiaole_settings', JSON.stringify({ chatMode: mode }))
  return mount(ChatView, {
    global: {
      plugins: [createPinia()],
      stubs: {
        Teleport: true,
        ShareDialog: true,
        VoiceModeDialog: true
      }
    }
  })
}

describe('Phase E chat compatibility UX', () => {
  beforeEach(() => {
    localStorage.clear()
    router.push.mockReset()
    router.replace.mockReset()
    setActivePinia(createPinia())
  })

  it('keeps standard chat free of technical mode labels', () => {
    const wrapper = mountChat('core2')
    expect(wrapper.text()).not.toMatch(/小乐\s*2\.0|实验|Core2/)
    expect(wrapper.text()).not.toContain('标准对话')
    wrapper.unmount()
  })

  it('shows only a quiet compatibility label in legacy mode', () => {
    const wrapper = mountChat('legacy')
    expect(wrapper.get('[data-testid="compatibility-mode-label"]').text()).toBe('兼容模式')
    expect(wrapper.text()).not.toMatch(/小乐\s*1\.0|Legacy/)
    wrapper.unmount()
  })

  it.each([
    ['附件', '[title="附件"]'],
    ['语音', '[title="语音输入"]'],
    ['语音模式', '[title="语音模式"]']
  ])('prompts before using %s in standard mode without sending', async (capability, selector) => {
    const wrapper = mountChat('core2')
    const store = useChatStore()
    await wrapper.get(selector).trigger('click')
    expect(wrapper.get('[role="dialog"]').text()).toContain('需要使用兼容模式')
    expect(wrapper.get('[role="dialog"]').text()).toContain(capability)
    expect(store.messages).toHaveLength(0)
    expect(localStorage.getItem('xiaole_settings')).toContain('core2')
    wrapper.unmount()
  })

  it('prompts for an image dropped into standard chat and does not upload it', async () => {
    const wrapper = mountChat('core2')
    const input = wrapper.get('input[type="file"]')
    Object.defineProperty(input.element, 'files', { configurable: true, value: [new File(['x'], 'photo.png', { type: 'image/png' })] })
    await input.trigger('change')
    expect(wrapper.get('[role="dialog"]').text()).toContain('图片')
    expect(wrapper.find('.input-preview-area').exists()).toBe(false)
    expect(useChatStore().messages).toHaveLength(0)
    wrapper.unmount()
  })

  it('switches only after explicit confirmation using the existing storage values', async () => {
    const wrapper = mountChat('core2')
    await wrapper.get('[title="附件"]').trigger('click')
    expect(JSON.parse(localStorage.getItem('xiaole_settings')).chatMode).toBe('core2')
    await wrapper.get('[data-testid="confirm-compatibility-mode"]').trigger('click')
    expect(JSON.parse(localStorage.getItem('xiaole_settings')).chatMode).toBe('legacy')
    expect(useChatStore().messages).toHaveLength(0)
    wrapper.unmount()
  })

  it('moves keyboard focus into the compatibility dialog and restores it after Escape', async () => {
    const wrapper = mountChat('core2')
    document.body.appendChild(wrapper.element)
    const attachmentButton = wrapper.get('[title="附件"]')
    attachmentButton.element.focus()

    await attachmentButton.trigger('click')
    const dialog = wrapper.get('[role="dialog"]')
    expect(dialog.element.contains(document.activeElement)).toBe(true)

    await dialog.trigger('keydown', { key: 'Escape' })
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
    expect(document.activeElement).toBe(attachmentButton.element)
    wrapper.unmount()
  })
})

describe('Phase E settings and recovery copy', () => {
  it.each([
    ['settings page', SettingsView],
    ['settings modal', SettingsModal]
  ])('presents product mode names in the %s while retaining internal details under Advanced', (_label, component) => {
    localStorage.setItem('xiaole_settings', JSON.stringify({ chatMode: 'core2' }))
    const wrapper = mount(component)
    expect(wrapper.text()).toContain('标准对话')
    expect(wrapper.text()).toContain('兼容模式')
    expect(wrapper.text()).toContain('高级与诊断')
    expect(wrapper.findAll('input[type="radio"]').map(input => input.attributes('value'))).toEqual(['core2', 'legacy'])
    wrapper.unmount()
  })

  it('uses product language for standard chat recovery and keeps safe provenance only', async () => {
    const wrapper = mount(Core2ResultMeta, {
      props: {
        core2Error: true,
        intent: 'memory',
        sources: [
          { title: '乐知资料', url: 'https://example.com/source', diagnostics: { provider: 'hidden' }, request_id: 'hidden' },
          { title: '/private/internal.md', url: 'https://example.com/private' }
        ]
      }
    })
    expect(wrapper.text()).toContain('标准对话暂时不可用')
    expect(wrapper.text()).toContain('尝试兼容模式')
    expect(wrapper.text()).not.toMatch(/Core2|Legacy|provider|request_id|internal\.md/)
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('switch-legacy')).toHaveLength(1)
  })
})

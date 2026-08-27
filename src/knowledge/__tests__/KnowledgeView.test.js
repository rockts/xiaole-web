import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import KnowledgeView from '../../views/KnowledgeView.vue'

const routeState = vi.hoisted(() => ({ query: {} }))
vi.mock('vue-router', () => ({ useRoute: () => routeState }))

vi.mock('../../services/api', () => ({
  default: {
    getHome: vi.fn(),
    getKnowledgeProfile: vi.fn(),
    getKnowledgeFacts: vi.fn(),
    getKnowledgeDocuments: vi.fn(),
    getRecentMemories: vi.fn(),
    searchMemories: vi.fn(),
    getDocuments: vi.fn(),
    getDocument: vi.fn()
    ,getProfileConfirmations: vi.fn()
    ,submitProfileConfirmation: vi.fn()
  }
}))

import api from '../../services/api'

const profileFields = [
  { key: 'preferred_name', label: '称呼', value: '高老师', state: 'confirmed' },
  { key: 'current_school', label: '当前学校', value: '新华门小学', state: 'confirmed' },
  { key: 'current_role', label: '当前岗位', value: '信息科技教师', state: 'confirmed' },
  { key: 'current_teaching_subjects', label: '当前任教学科', value: ['信息科技', '人工智能'], state: 'needs_confirmation' },
  { key: 'current_service_audiences', label: '当前服务对象', value: '中学生', state: 'historical' },
  { key: 'secret', label: 'Secret', value: 'should-not-render', state: 'confirmed', path: '/private/profile.json' }
]

const facts = {
  current: [
    { key: 'current_role', label: '当前工作 / 职业', value: '信息科技教师', state: 'confirmed', updated_at: '2026-08-21T08:00:00Z', current_or_historical: 'current' }
  ],
  historical: [
    { key: 'historical_school', label: '历史学校', value: ['烟铺小学'], state: 'historical', current_or_historical: 'historical' }
  ]
}

const documents = [
  { id: 8, title: '教育规划.pdf', file_type: 'pdf', processing_status: 'completed', created_at: '2026-08-20T08:00:00Z', source_system: 'xiaole_upload', source_label: '来自小乐上传', summary_available: true, open_available: true },
  { id: 9, title: '课程笔记.md', file_type: 'md', processing_status: 'processing', created_at: '2026-08-19T08:00:00Z', source_system: 'xiaole_upload', source_label: '来自小乐上传', summary_available: false, open_available: false }
]

const confirmationItems = [
  { key: 'current_teaching_subjects', label: '当前任教学科', state: 'needs_confirmation', candidate_value: ['信息科技'], input_type: 'multi_text', options: [], version: 'a'.repeat(64) },
  { key: 'current_service_targets', label: '当前服务对象', state: 'needs_confirmation', candidate_value: null, input_type: 'multi_text', options: [], version: 'b'.repeat(64) },
  { key: 'current_role', label: '当前岗位', state: 'needs_confirmation', candidate_value: '教师', input_type: 'text', options: [], version: 'c'.repeat(64) },
  { key: 'preferred_name', label: '希望小乐怎么称呼你', state: 'needs_confirmation', candidate_value: null, input_type: 'text', options: [], version: 'd'.repeat(64) }
]

const defaults = () => {
  api.getKnowledgeProfile.mockResolvedValue({ fields: profileFields })
  api.getKnowledgeFacts.mockResolvedValue(facts)
  api.getKnowledgeDocuments.mockResolvedValue({ documents })
  api.getRecentMemories.mockRejectedValue(new Error('Legacy memory must not be called'))
  api.searchMemories.mockRejectedValue(new Error('Legacy memory search must not be called'))
  api.getDocuments.mockRejectedValue(new Error('Legacy documents must not be called'))
  api.getDocument.mockRejectedValue(new Error('Legacy document detail must not enrich the list'))
  api.getProfileConfirmations.mockResolvedValue({ schema_version: 1, items: confirmationItems })
  api.submitProfileConfirmation.mockResolvedValue({ schema_version: 1, key: 'current_role', state: 'confirmed', version: 'e'.repeat(64) })
}

const mountKnowledge = async () => {
  const wrapper = mount(KnowledgeView, {
    attachTo: document.body,
    global: {
      plugins: [createPinia()],
      stubs: {
        RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' }
      }
    }
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

const openTab = async (wrapper, name) => {
  await wrapper.get(`[data-knowledge-tab="${name}"]`).trigger('click')
  await flushPromises()
}

describe('XiaoLe Phase C Knowledge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = ''
    routeState.query = {}
    setActivePinia(createPinia())
    HTMLElement.prototype.scrollIntoView = vi.fn()
    defaults()
  })

  it('renders the three approved touchable entries with About me selected first', async () => {
    const wrapper = await mountKnowledge()
    expect(wrapper.findAll('[data-knowledge-tab]').map((tab) => tab.text())).toEqual(['关于我', '已知信息', '资料'])
    expect(wrapper.get('[data-knowledge-tab="about"]').attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-knowledge-panel="about"]').text()).toContain('高老师')
  })

  it('only renders allowed profile fields and separates pending and historical from current', async () => {
    const wrapper = await mountKnowledge()
    const about = wrapper.get('[data-knowledge-panel="about"]')
    expect(about.get('[data-test="profile-current"]').text()).toContain('信息科技教师')
    expect(about.get('[data-test="profile-current"]').text()).toContain('新华门小学')
    expect(about.get('[data-test="profile-pending"]').text()).toContain('信息科技、人工智能')
    const historical = about.get('[data-test="profile-historical"]')
    expect(historical.attributes('open')).toBeUndefined()
    expect(historical.text()).toContain('中学生')
    expect(about.text()).not.toContain('should-not-render')
    expect(about.text()).not.toMatch(/Secret|private\/profile|confidence|subject/i)
  })

  it('shows only safe current facts and keeps historical facts collapsed', async () => {
    const wrapper = await mountKnowledge()
    await openTab(wrapper, 'known')
    const panel = wrapper.get('[data-knowledge-panel="known"]')
    expect(panel.findAll('[data-test="fact-item"]')).toHaveLength(1)
    expect(panel.text()).toContain('信息科技教师')
    const historical = panel.get('[data-test="facts-historical"]')
    expect(historical.attributes('open')).toBeUndefined()
    expect(historical.text()).toContain('烟铺小学')
    expect(panel.find('[data-test="memory-search-input"]').exists()).toBe(false)
    expect(panel.find('[data-test="manage-memory"]').exists()).toBe(false)
    expect(api.getKnowledgeFacts).toHaveBeenCalledTimes(1)
    expect(api.getRecentMemories).not.toHaveBeenCalled()
    expect(api.searchMemories).not.toHaveBeenCalled()
  })

  it('shows safe facts empty and independent failure states without fallback', async () => {
    api.getKnowledgeFacts.mockResolvedValueOnce({ current: [], historical: [] })
    const empty = await mountKnowledge()
    await openTab(empty, 'known')
    expect(empty.get('[data-test="facts-empty"]').text()).toContain('还没有已确认的已知信息')

    api.getKnowledgeFacts.mockRejectedValueOnce(new Error('offline'))
    const failed = await mountKnowledge()
    await openTab(failed, 'known')
    expect(failed.get('[data-test="facts-error"]').text()).toContain('暂时无法读取')
    expect(failed.find('[data-knowledge-panel="about"]').exists()).toBe(false)
    expect(api.getRecentMemories).not.toHaveBeenCalled()
  })

  it('shows safe projected documents with true source and conditional open links', async () => {
    const wrapper = await mountKnowledge()
    await openTab(wrapper, 'documents')
    const panel = wrapper.get('[data-knowledge-panel="documents"]')
    expect(panel.findAll('[data-test="document-item"]')).toHaveLength(2)
    expect(panel.text()).toContain('教育规划.pdf')
    expect(panel.text()).toContain('来自小乐上传')
    expect(panel.text()).toContain('已完成')
    expect(panel.text()).toContain('处理中')
    expect(panel.text()).not.toContain('来自乐知资料')
    expect(panel.get('[data-test="document-detail"]').attributes('href')).toBe('/documents/8')
    expect(panel.findAll('[data-test="document-detail"]')).toHaveLength(1)
    expect(panel.get('[data-test="all-documents"]').attributes('href')).toBe('/documents')
    expect(api.getKnowledgeDocuments).toHaveBeenCalledWith(8)
    expect(api.getDocuments).not.toHaveBeenCalled()
    expect(api.getDocument).not.toHaveBeenCalled()
  })

  it('shows independent document empty and failure states', async () => {
    api.getKnowledgeDocuments.mockResolvedValueOnce({ documents: [] })
    const empty = await mountKnowledge()
    await openTab(empty, 'documents')
    expect(empty.get('[data-test="documents-empty"]').text()).toContain('还没有资料')

    api.getKnowledgeDocuments.mockRejectedValueOnce(new Error('offline'))
    const failed = await mountKnowledge()
    await openTab(failed, 'documents')
    expect(failed.get('[data-test="documents-error"]').text()).toContain('暂时无法读取')
    expect(failed.get('[data-test="upload-document"]').attributes('href')).toBe('/documents')
  })

  it('keeps safe facts and documents usable when Profile is unavailable', async () => {
    api.getKnowledgeProfile.mockRejectedValueOnce(new Error('profile unavailable'))
    const wrapper = await mountKnowledge()
    expect(wrapper.get('[data-test="profile-error"]').text()).toContain('暂时无法读取')
    await openTab(wrapper, 'known')
    expect(wrapper.findAll('[data-test="fact-item"]')).toHaveLength(1)
    await openTab(wrapper, 'documents')
    expect(wrapper.findAll('[data-test="document-item"]')).toHaveLength(2)
  })

  it('shows an honest empty state when the safe Profile has no displayable fields', async () => {
    api.getKnowledgeProfile.mockResolvedValueOnce({ fields: [] })
    const wrapper = await mountKnowledge()
    expect(wrapper.text()).toContain('还没有已确认的当前资料')
    expect(wrapper.find('[data-test="profile-error"]').exists()).toBe(false)
  })

  it('loads About me from the dedicated Knowledge Profile endpoint instead of Home', async () => {
    const wrapper = await mountKnowledge()
    expect(api.getKnowledgeProfile).toHaveBeenCalledTimes(1)
    expect(api.getHome).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="profile-current"]').text()).toContain('新华门小学')
  })

  it('never renders the retired Lezhi source copy', async () => {
    const wrapper = await mountKnowledge()
    await openTab(wrapper, 'known')
    expect(wrapper.text()).not.toContain('来自乐知资料')
    await openTab(wrapper, 'documents')
    expect(wrapper.text()).not.toContain('来自乐知资料')
  })

  it('renders four governed confirmation cards without leaking public or storage keys', async () => {
    const wrapper = await mountKnowledge()
    const section = wrapper.get('[data-test="profile-confirmations"]')
    expect(section.findAll('[data-test="confirmation-card"]')).toHaveLength(4)
    expect(section.text()).toContain('希望小乐怎么称呼你')
    expect(section.text()).not.toMatch(/preferred_name|current_student_groups|storage_key/)
  })

  it('maps the Home query to About me and focuses the confirmation section', async () => {
    routeState.query = { tab: 'profile', section: 'confirmations' }
    const wrapper = await mountKnowledge()
    expect(wrapper.get('[data-knowledge-tab="about"]').attributes('aria-selected')).toBe('true')
    const section = wrapper.get('[data-test="profile-confirmations"]')
    expect(document.activeElement).toBe(section.element)
    expect(section.element.scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
  })

  it('reloads the formal Profile and confirmation list after a successful action', async () => {
    api.getProfileConfirmations
      .mockResolvedValueOnce({ schema_version: 1, items: confirmationItems })
      .mockResolvedValueOnce({ schema_version: 1, items: confirmationItems.filter((item) => item.key !== 'current_role') })
    const wrapper = await mountKnowledge()
    const roleCard = wrapper.findAll('[data-test="confirmation-card"]').find((card) => card.text().includes('当前岗位'))
    await roleCard.get('[data-test="confirm-candidate"]').trigger('click')
    await flushPromises()
    expect(api.getProfileConfirmations).toHaveBeenCalledTimes(2)
    expect(api.getKnowledgeProfile).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll('[data-test="confirmation-card"]')).toHaveLength(3)
  })

  it('shows the calm completed state when no confirmations remain', async () => {
    api.getProfileConfirmations.mockResolvedValueOnce({ schema_version: 1, items: [] })
    const wrapper = await mountKnowledge()
    expect(wrapper.get('[data-test="profile-confirmations-complete"]').text()).toContain('目前没有需要确认的个人资料')
  })
})

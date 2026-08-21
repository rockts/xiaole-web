import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import KnowledgeView from '../../views/KnowledgeView.vue'

vi.mock('../../services/api', () => ({
  default: {
    getHome: vi.fn(),
    getKnowledgeProfile: vi.fn(),
    getRecentMemories: vi.fn(),
    searchMemories: vi.fn(),
    getDocuments: vi.fn(),
    getDocument: vi.fn()
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

const memories = [
  { id: 1, content: '持续推进小乐产品化。', tag: 'project', timestamp: '2026-08-21T08:00:00Z', source: '/private/memory.json', confidence: 0.98 },
  { id: 2, content: '资料中记录了教育数字化方向。', tag: 'document:教育规划.pdf', timestamp: '2026-08-20T08:00:00Z' }
]

const documents = [
  { id: 8, original_filename: '教育规划.pdf', file_type: 'pdf', status: 'completed', created_at: '2026-08-20T08:00:00Z' },
  { id: 9, original_filename: '课程笔记.md', file_type: 'md', status: 'processing', created_at: '2026-08-19T08:00:00Z' }
]

const defaults = () => {
  api.getKnowledgeProfile.mockResolvedValue({ fields: profileFields })
  api.getRecentMemories.mockResolvedValue({ memory: memories })
  api.searchMemories.mockResolvedValue({ memories: [memories[0]] })
  api.getDocuments.mockResolvedValue({ success: true, documents })
  api.getDocument.mockImplementation(async (id) => id === 8
    ? { success: true, document: { ...documents[0], summary: '这份资料梳理了教育数字化的长期方向。', key_points: ['关注教师成长', '推进人工智能教育'] } }
    : { success: true, document: documents[1] })
}

const mountKnowledge = async () => {
  const wrapper = mount(KnowledgeView, {
    global: {
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

  it('keeps memory useful and searchable without exposing internal provenance', async () => {
    const wrapper = await mountKnowledge()
    await openTab(wrapper, 'known')
    const panel = wrapper.get('[data-knowledge-panel="known"]')
    expect(panel.findAll('[data-test="memory-item"]')).toHaveLength(2)
    expect(panel.text()).toContain('持续推进小乐产品化。')
    expect(panel.text()).toContain('项目')
    expect(panel.text()).toContain('来自乐知资料')
    expect(panel.text()).not.toMatch(/private\/memory|0\.98|confidence/i)
    await panel.get('[data-test="memory-search-input"]').setValue('小乐')
    await panel.get('form').trigger('submit')
    await flushPromises()
    expect(api.searchMemories).toHaveBeenCalledWith('小乐')
    expect(panel.findAll('[data-test="memory-item"]')).toHaveLength(1)
  })

  it('shows independent memory empty and failure states with a management escape hatch', async () => {
    api.getRecentMemories.mockResolvedValueOnce({ memory: [] })
    const empty = await mountKnowledge()
    await openTab(empty, 'known')
    expect(empty.get('[data-test="memory-empty"]').text()).toContain('还没有保存')
    expect(empty.get('[data-test="manage-memory"]').attributes('href')).toBe('/memory')

    api.getRecentMemories.mockRejectedValueOnce(new Error('offline'))
    const failed = await mountKnowledge()
    await openTab(failed, 'known')
    expect(failed.get('[data-test="memory-error"]').text()).toContain('暂时无法读取')
    expect(failed.find('[data-knowledge-panel="about"]').exists()).toBe(false)
  })

  it('shows recent documents with real detail summaries and links to existing detail routes', async () => {
    const wrapper = await mountKnowledge()
    await openTab(wrapper, 'documents')
    const panel = wrapper.get('[data-knowledge-panel="documents"]')
    expect(panel.findAll('[data-test="document-item"]')).toHaveLength(2)
    expect(panel.text()).toContain('教育规划.pdf')
    expect(panel.text()).toContain('这份资料梳理了教育数字化的长期方向。')
    expect(panel.text()).toContain('关注教师成长')
    expect(panel.get('[data-test="document-detail"]').attributes('href')).toBe('/documents/8')
    expect(panel.get('[data-test="all-documents"]').attributes('href')).toBe('/documents')
  })

  it('shows independent document empty and failure states', async () => {
    api.getDocuments.mockResolvedValueOnce({ success: true, documents: [] })
    const empty = await mountKnowledge()
    await openTab(empty, 'documents')
    expect(empty.get('[data-test="documents-empty"]').text()).toContain('还没有资料')

    api.getDocuments.mockRejectedValueOnce(new Error('offline'))
    const failed = await mountKnowledge()
    await openTab(failed, 'documents')
    expect(failed.get('[data-test="documents-error"]').text()).toContain('暂时无法读取')
    expect(failed.get('[data-test="upload-document"]').attributes('href')).toBe('/documents')
  })

  it('keeps memory and documents usable when Profile is unavailable', async () => {
    api.getKnowledgeProfile.mockRejectedValueOnce(new Error('profile unavailable'))
    const wrapper = await mountKnowledge()
    expect(wrapper.get('[data-test="profile-error"]').text()).toContain('暂时无法读取')
    await openTab(wrapper, 'known')
    expect(wrapper.findAll('[data-test="memory-item"]')).toHaveLength(2)
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

  it('does not invent a source when provenance is absent or unknown', async () => {
    const wrapper = await mountKnowledge()
    await openTab(wrapper, 'known')
    const items = wrapper.findAll('[data-test="memory-item"]')
    expect(items[0].text()).not.toContain('来源')
    expect(items[1].text()).toContain('来自乐知资料')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import HomeView from '../../views/HomeView.vue'

const push = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }))
vi.mock('../../services/api', () => ({ default: { getHome: vi.fn(), getProfileConfirmations: vi.fn(), getIntelligenceInbox: vi.fn() } }))
import api from '../../services/api'

const recommendation = (index = 1) => ({ stars: 5, title: `推荐事项 ${index}`, source: '中国科协', published_at: '2026-08-01', deadline: '2026-10-20', reason: '与你关注的科技教育方向有关', eligibility: { self: 'unknown', students: 'eligible', school: 'possible' }, action: { label: '查看详情' }, open_url: index === 1 ? 'https://example.com/item' : null })

const model = {
  cache: { status: 'fresh' },
  today: { status: 'available', date: '2026-08-22', summary: '今天有 2 件值得你关注的事。', sources: { healthy: 5, unhealthy: 0 }, new_discovered: 2, relevant: 2, notified: 0, last_scan_at: '2026-08-22T08:00:00+08:00', next_scan_at: '2026-08-22T12:00:00+08:00' },
  recommendations: { status: 'available', empty_message: '目前没有需要优先处理的事项。', items: Array.from({ length: 5 }, (_, index) => recommendation(index + 1)) },
  no_notification_summary: { status: 'available', period_days: 7, summary: '最近没有达到主动通知门槛。', true_new: 1, categories: [{ code: 'low_relevance', label: '低相关未通知', count: 1 }, { code: 'expired', label: '已过期', count: 2 }] },
  systems: { brain: { status: 'healthy', label: '小乐 Brain', message: '正常' }, memory: { status: 'healthy', label: '乐知 Memory', message: '正常' }, action: { status: 'healthy', label: '小可 Action', message: '正常' } },
  profile_status: { status: 'available', needs_confirmation_count: 2, message: '还有 2 项资料需要确认', fields: [{ key: 'role', label: '当前身份', value: '待确认' }] },
  recent_conversations: Array.from({ length: 6 }, (_, index) => ({ session_id: `s${index + 1}`, title: `最近对话 ${index + 1}`, updated_at: `2026-08-2${2 - Math.min(index, 2)}T08:00:00+08:00` })),
  quick_questions: ['最近有什么值得我关注？', '最近有什么值得写？', '为什么最近没通知我？'],
  degradations: []
}

const cloneModel = () => structuredClone(model)
const notificationItems = Array.from({ length: 11 }, (_, index) => ({
  event_id: `event-${index + 1}`,
  title: index === 10 ? '甘肃教育数字化课题通知' : `最近通知 ${index + 1}`,
  source_name: '官方来源',
  sent_at: `2026-08-2${3 - Math.min(index, 3)}T09:00:00+08:00`,
  assessment_label: index === 10 ? '临时评估 4星' : '正式评估 5星',
  status_label: index === 10 ? '重要通知 · 附件尚未完整获取，需要确认' : '正式情报已确认',
  delivery_label: '已发送',
  is_read: false,
  requires_user_attention: index === 10,
}))
const confirmationItems = Array.from({ length: 4 }, (_, index) => ({ key: `field-${index}`, label: `资料 ${index}`, state: 'needs_confirmation', candidate_value: null, input_type: 'text', options: [], version: 'a'.repeat(64) }))
const mountHome = async (overrides = {}, confirmations = confirmationItems) => {
  setActivePinia(createPinia())
  api.getHome.mockResolvedValue(Object.assign(cloneModel(), overrides))
  api.getProfileConfirmations.mockResolvedValue({ schema_version: 1, items: confirmations })
  api.getIntelligenceInbox.mockResolvedValue({ degraded: false, items: notificationItems })
  const wrapper = mount(HomeView)
  await flushPromises()
  return wrapper
}

describe('Home 2.0 productization', () => {
  beforeEach(() => { vi.clearAllMocks(); localStorage.clear(); setActivePinia(createPinia()) })

  it('renders the seven product sections in the approved order', async () => {
    const wrapper = await mountHome()
    expect(wrapper.findAll('[data-home-section]').map((section) => section.attributes('data-home-section'))).toEqual(['today', 'recommendations', 'intelligence', 'ask', 'profile', 'recent', 'no-notification', 'systems'])
    expect(wrapper.get('[data-home-section="today"] h1').text()).toBe('今天')
    expect(wrapper.get('[data-home-section="today"]').text()).toContain('今天有 2 件值得你关注的事。')
  })

  it('selects the eleventh actionable unread notification without changing recommendations', async () => {
    const wrapper = await mountHome()
    const notifications = wrapper.get('[data-home-section="intelligence"]')
    expect(notifications.findAll('[data-test="home-notification"]')).toHaveLength(3)
    expect(notifications.text()).toContain('甘肃教育数字化课题通知')
    expect(notifications.text()).toContain('未读')
    expect(notifications.text()).toContain('临时评估 4星')
    expect(notifications.text()).toContain('已发送')
    expect(notifications.text()).toContain('附件尚未完整获取，需要确认')
    expect(wrapper.get('[data-home-section="recommendations"]')).not.toBe(notifications)
    await notifications.get('[data-test="all-notifications"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/intelligence')
  })

  it('keeps Home recommendations profile and action status when Inbox fails', async () => {
    api.getIntelligenceInbox.mockRejectedValueOnce(new Error('raw history error'))
    const wrapper = await mountHome()
    expect(wrapper.get('[data-home-section="intelligence"]').text()).toContain('通知历史暂时无法完整加载')
    expect(wrapper.get('[data-home-section="recommendations"]').text()).toContain('推荐事项 1')
    expect(wrapper.get('[data-home-section="profile"]').exists()).toBe(true)
    expect(wrapper.get('[data-home-section="systems"]').text()).toContain('行动服务')
    expect(wrapper.text()).not.toContain('raw history error')
  })

  it('shows at most three recommendations while preserving order and useful details', async () => {
    const wrapper = await mountHome()
    const cards = wrapper.findAll('[data-test="recommendation-card"]')
    expect(cards).toHaveLength(3)
    expect(cards.map((card) => card.get('h3').text())).toEqual(['推荐事项 1', '推荐事项 2', '推荐事项 3'])
    expect(cards[0].text()).toContain('与你关注的科技教育方向有关')
    expect(cards[0].text()).toContain('截止 2026-10-20')
    expect(cards[0].get('a').attributes('rel')).toContain('noopener')
  })

  it('renders a calm recommendation empty state', async () => {
    const wrapper = await mountHome({ recommendations: { ...model.recommendations, items: [] } })
    expect(wrapper.get('[data-test="recommendations-empty"]').text()).toBe('目前没有需要优先处理的事项。')
  })

  it('quick questions only prefill Chat and do not create a transport preference', async () => {
    localStorage.setItem('xiaole_settings', '{"theme":"dark"}')
    const wrapper = await mountHome()
    await wrapper.get('[data-test="quick-question"]').trigger('click')
    expect(push).toHaveBeenCalledWith({ path: '/chat', state: { xiaoleDraft: '最近有什么值得我关注？', source: 'home_quick_question' } })
    expect(localStorage.getItem('xiaole_settings')).toBe('{"theme":"dark"}')
  })

  it('keeps profile confirmation collapsed and uses confirmations even when cached Home profile is unavailable', async () => {
    const wrapper = await mountHome()
    const profile = wrapper.get('[data-home-section="profile"]')
    expect(profile.text()).toContain('为了让推荐更准确，还有 4 项资料需要确认')
    expect(profile.get('details').attributes('open')).toBeUndefined()
    const unavailable = await mountHome({ profile_status: { status: 'unavailable', needs_confirmation_count: 0, fields: [] } })
    expect(unavailable.find('[data-home-section="profile"]').exists()).toBe(true)
  })

  it('uses the canonical confirmation count and navigates View to the confirmation section', async () => {
    const wrapper = await mountHome({ profile_status: { status: 'available', needs_confirmation_count: 99, fields: [] } })
    const profile = wrapper.get('[data-home-section="profile"]')
    expect(profile.text()).toContain('还有 4 项资料需要确认')
    expect(profile.text()).not.toContain('99')
    await profile.get('[data-test="view-profile-confirmations"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/knowledge?tab=profile&section=confirmations')
  })

  it('hides the pending prompt when the canonical confirmation list is empty', async () => {
    const wrapper = await mountHome({}, [])
    expect(wrapper.find('[data-home-section="profile"]').exists()).toBe(false)
  })

  it('limits recent conversations to four and links to the complete list', async () => {
    const wrapper = await mountHome()
    expect(wrapper.findAll('[data-test="recent-conversation"]')).toHaveLength(4)
    expect(wrapper.get('[data-test="all-conversations"]').attributes('href')).toBe('/conversations')
    await wrapper.get('[data-test="recent-conversation"]').trigger('click')
    expect(push).toHaveBeenCalledWith('/chat/s1')
  })

  it('shows a light recent-conversation empty state when data is empty or unavailable', async () => {
    const wrapper = await mountHome({ recent_conversations: [], degradations: [{ source: 'recent_conversations', status: 'unavailable' }] })
    expect(wrapper.get('[data-test="recent-empty"]').text()).toContain('暂时没有最近对话')
  })

  it('keeps no-notification reasons collapsed by default', async () => {
    const wrapper = await mountHome()
    const details = wrapper.get('[data-home-section="no-notification"] details')
    expect(details.attributes('open')).toBeUndefined()
    expect(wrapper.get('[data-home-section="no-notification"]').text()).toContain('最近没有达到主动通知门槛。')
  })

  it.each([['Lezhi degraded', 'degraded', 'healthy'], ['Lezhi unavailable', 'unavailable', 'healthy'], ['XiaoKe unavailable', 'healthy', 'unavailable']])('surfaces a user-facing alert for %s and keeps detailed health last', async (_label, memoryStatus, actionStatus) => {
    const systems = cloneModel().systems
    systems.memory.status = memoryStatus
    systems.memory.message = memoryStatus === 'healthy' ? '正常' : '部分信息暂时不可用'
    systems.action.status = actionStatus
    systems.action.message = actionStatus === 'healthy' ? '正常' : '行动服务暂时不可用'
    const wrapper = await mountHome({ systems })
    expect(wrapper.get('[data-test="system-alert"]').text()).toContain('部分能力暂时不可用')
    expect(wrapper.findAll('[data-home-section]').at(-1).attributes('data-home-section')).toBe('systems')
  })

  it('keeps healthy system status compact and at the end', async () => {
    const wrapper = await mountHome()
    expect(wrapper.find('[data-test="system-alert"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-home-section]').at(-1).attributes('data-home-section')).toBe('systems')
    expect(wrapper.get('[data-home-section="systems"]').text()).toContain('各项服务正常')
  })

  it('shows stale cache and degradation language without technical details', async () => {
    const wrapper = await mountHome({ cache: { status: 'stale' }, degradations: [{ source: 'memory', status: 'degraded' }] })
    expect(wrapper.get('[data-test="stale-notice"]').text()).toContain('当前显示最近一次整理结果')
    expect(wrapper.text()).not.toMatch(/HTTP|https?:\/\//)
  })

  it('shows a retry action after Home API 500 and retries on click', async () => {
    api.getHome.mockRejectedValueOnce({ response: { status: 500 } }).mockResolvedValueOnce(cloneModel())
    const wrapper = mount(HomeView)
    await flushPromises()
    expect(wrapper.get('[data-test="home-error"]').text()).toContain('首页暂时无法加载')
    await wrapper.get('[data-test="home-retry"]').trigger('click')
    await flushPromises()
    expect(api.getHome).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-test="home-error"]').exists()).toBe(false)
  })
})

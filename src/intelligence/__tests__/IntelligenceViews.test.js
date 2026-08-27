import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntelligenceView from '../../views/IntelligenceView.vue'
import IntelligenceDetailView from '../../views/IntelligenceDetailView.vue'

const push = vi.fn()
let eventId = 'gansu'
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), useRoute: () => ({ params: { eventId } }) }))
vi.mock('../../services/api', () => ({ default: { getIntelligenceInbox: vi.fn(), getIntelligenceInboxDetail: vi.fn(), markIntelligenceRead: vi.fn() } }))
import api from '../../services/api'

const trace = { event_id: 'gansu', title: '甘肃教育数字化课题通知', source_name: '甘肃省教育厅', sent_at: '2026-08-23T09:43:00+08:00', stars: 4, assessment_kind: 'provisional', intelligence_status: 'partial', notification_type: 'manual_attachment', assessment_label: '临时评估 4星', status_label: '重要通知 · 附件尚未完整获取，需要确认', delivery_label: '已发送', completeness_notice: '正文已确认，但附件尚未完整获取。', official_url: 'https://example.com/gansu', why_relevant: '与你相关', is_read: false }

describe('Intelligence views', () => {
  beforeEach(() => { vi.clearAllMocks(); api.getIntelligenceInbox.mockResolvedValue({ degraded: false, items: [trace] }); api.getIntelligenceInboxDetail.mockResolvedValue(trace); api.markIntelligenceRead.mockResolvedValue({ is_read: true }) })

  it('renders four filters and the trace item', async () => {
    const wrapper = mount(IntelligenceView, { global: { stubs: { IntelligenceCard: { props: ['item'], template: '<div data-test="card">{{ item.title }} {{ item.assessment_label }}</div>' } } } })
    await flushPromises()
    expect(wrapper.findAll('[data-test="inbox-filter"]')).toHaveLength(4)
    expect(wrapper.text()).toContain('甘肃教育数字化课题通知')
    expect(wrapper.text()).toContain('临时评估 4星')
  })

  it('shows explicit degraded and unavailable states', async () => {
    api.getIntelligenceInbox.mockResolvedValueOnce({ degraded: true, message: '通知历史暂时无法完整加载', items: [trace] })
    const degraded = mount(IntelligenceView, { global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    await flushPromises()
    expect(degraded.text()).toContain('通知历史暂时无法完整加载')
    api.getIntelligenceInbox.mockRejectedValueOnce(new Error('internal upstream error'))
    const failed = mount(IntelligenceView)
    await flushPromises()
    expect(failed.text()).toContain('通知历史暂时无法完整加载')
    expect(failed.text()).not.toContain('internal upstream error')
  })

  it('does not optimistically mark read when PUT fails', async () => {
    api.markIntelligenceRead.mockRejectedValueOnce(new Error('failed'))
    const wrapper = mount(IntelligenceDetailView)
    await flushPromises()
    expect(wrapper.text()).toContain('未读')
    expect(wrapper.text()).toContain('临时评估 4星')
    expect(wrapper.text()).toContain('partial')
    expect(wrapper.text()).toContain('provisional')
    expect(wrapper.get('[data-test="official-url"]').attributes('rel')).toContain('noopener')
  })

  it('uses backend is_read after refresh and marks read only after success', async () => {
    const first = mount(IntelligenceDetailView)
    await flushPromises()
    expect(first.text()).toContain('已读')
    api.getIntelligenceInboxDetail.mockResolvedValueOnce({ ...trace, is_read: true })
    const refreshed = mount(IntelligenceDetailView)
    await flushPromises()
    expect(refreshed.text()).toContain('已读')
  })
})

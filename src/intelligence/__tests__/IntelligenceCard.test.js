import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import IntelligenceCard from '../components/IntelligenceCard.vue'

const trace = { event_id: 'gansu', title: '甘肃教育数字化课题通知', source_name: '甘肃省教育厅', sent_at: '2026-08-23T09:43:00+08:00', assessment_label: '临时评估 4星', status_label: '重要通知 · 附件尚未完整获取，需要确认', delivery_label: '已发送', notification_label: '人工补充附件通知', deadline: '2026-09-30', requires_user_attention: true, relevance_level: 'WORTH_ATTENTION', why_relevant: '与你关注的教育数字化研究方向相关。', is_read: false }

describe('IntelligenceCard', () => {
  it('renders only user-level scan fields on the main card', () => {
    const wrapper = mount(IntelligenceCard, { props: { item: trace }, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    expect(wrapper.text()).toContain('值得关注')
    expect(wrapper.text()).toContain('与你关注的教育数字化研究方向相关。')
    expect(wrapper.text()).toContain('截止 2026-09-30')
    expect(wrapper.text()).toContain('未读')
    expect(wrapper.text()).not.toContain('临时评估 4星')
    expect(wrapper.text()).not.toContain('附件尚未完整获取，需要确认')
    expect(wrapper.text()).not.toContain('已发送')
    expect(wrapper.get('[data-test="read-state"]').classes()).toContain('quiet')
    expect(wrapper.get('.card-link').attributes('to')).toBe('/intelligence/gansu')
  })

  it('does not fabricate relevance or a reason when governed fields are absent', () => {
    const wrapper = mount(IntelligenceCard, { props: { item: { ...trace, relevance_level: undefined, why_relevant: undefined, requires_user_attention: false } }, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    expect(wrapper.text()).not.toContain('值得关注')
    expect(wrapper.text()).not.toContain('与你关注')
    expect(wrapper.text()).toContain('甘肃教育数字化课题通知')
  })
})

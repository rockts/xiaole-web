import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import IntelligenceCard from '../components/IntelligenceCard.vue'

const trace = { event_id: 'gansu', title: '甘肃教育数字化课题通知', source_name: '甘肃省教育厅', sent_at: '2026-08-23T09:43:00+08:00', assessment_label: '临时评估 4星', status_label: '重要通知 · 附件尚未完整获取，需要确认', delivery_label: '已发送', notification_label: '人工补充附件通知', deadline: '2026-09-30', requires_user_attention: true, is_read: false }

describe('IntelligenceCard', () => {
  it('renders safe trace semantics and explicit unread state', () => {
    const wrapper = mount(IntelligenceCard, { props: { item: trace }, global: { stubs: { RouterLink: { template: '<a><slot /></a>' } } } })
    expect(wrapper.text()).toContain('临时评估 4星')
    expect(wrapper.text()).toContain('附件尚未完整获取，需要确认')
    expect(wrapper.text()).toContain('已发送')
    expect(wrapper.text()).toContain('未读')
    expect(wrapper.text()).not.toContain('正式评估')
  })
})

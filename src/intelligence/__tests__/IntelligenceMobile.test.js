import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntelligenceView from '../../views/IntelligenceView.vue'
import IntelligenceDetailView from '../../views/IntelligenceDetailView.vue'

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }), useRoute: () => ({ params: { eventId: 'gansu' } }) }))
vi.mock('../../services/api', () => ({ default: { getIntelligenceInbox: vi.fn().mockResolvedValue({ degraded: false, items: [] }), getIntelligenceInboxDetail: vi.fn().mockResolvedValue({ event_id: 'gansu', title: '甘肃通知', assessment_label: '临时评估 4星', status_label: '重要通知', delivery_label: '已发送', intelligence_status: 'partial', assessment_kind: 'provisional', official_url: 'https://example.com', is_read: true }), markIntelligenceRead: vi.fn() } }))

describe.each([360, 390, 430, 768])('Intelligence mobile contract at %ipx', (width) => {
  beforeEach(() => Object.defineProperty(window, 'innerWidth', { configurable: true, value: width }))

  it('keeps filters touch-sized and exposes selected state', async () => {
    const wrapper = mount(IntelligenceView)
    await flushPromises()
    const filters = wrapper.findAll('[data-test="inbox-filter"]')
    expect(filters).toHaveLength(4)
    expect(filters[0].attributes('aria-pressed')).toBe('true')
    expect(getComputedStyle(filters[0].element).minHeight).toBe('44px')
    expect(getComputedStyle(wrapper.element).overflowX).toBe('hidden')
  })

  it('keeps official link touch-sized and detail in the app scroll flow', async () => {
    const wrapper = mount(IntelligenceDetailView)
    await flushPromises()
    expect(getComputedStyle(wrapper.get('[data-test="official-url"]').element).minHeight).toBe('44px')
    expect(wrapper.element.classList.contains('detail-view')).toBe(true)
    expect(getComputedStyle(wrapper.element).overflowX).toBe('hidden')
  })
})

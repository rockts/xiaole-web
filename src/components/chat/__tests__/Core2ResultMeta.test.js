import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import Core2ResultMeta from '../Core2ResultMeta.vue'

describe('Core2 safe result metadata', () => {
  it('renders clickable memory sources without local paths', () => {
    const wrapper = mount(Core2ResultMeta, { props: {
      intent: 'memory',
      sources: [{ title: '通知', summary: '摘要', issue_date: '2026-08-11', url: 'https://example.com/n' }, { title: '/Users/private.pdf' }]
    } })
    expect(wrapper.get('a').attributes('href')).toBe('https://example.com/n')
    expect(wrapper.text()).toContain('通知')
    expect(wrapper.text()).not.toContain('/Users')
  })

  it.each([
    ['success', '执行结果：成功'],
    ['failed', '执行失败'],
    ['dead', '执行失败']
  ])('maps action %s to %s', (status, label) => {
    const wrapper = mount(Core2ResultMeta, { props: { intent: 'action', action: { status, summary: 'safe' } } })
    expect(wrapper.text()).toContain(label)
  })

  it('offers manual switch on Core2 API failure', async () => {
    const wrapper = mount(Core2ResultMeta, { props: { core2Error: true } })
    await wrapper.get('button').trigger('click')
    expect(wrapper.emitted('switch-legacy')).toHaveLength(1)
  })
})

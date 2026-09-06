import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ChatErrorRecovery from '@/components/chat/ChatErrorRecovery.vue'

const recovery = {
  kind: 'request_failed',
  message: '刚才没有发送成功。',
  actionLabel: '重试',
  retryable: true,
  retrying: false
}

describe('Chat error recovery UI', () => {
  it('renders a semantic product-language recovery action', async () => {
    const wrapper = mount(ChatErrorRecovery, { props: { recovery } })

    expect(wrapper.get('[role="status"]').text()).toContain('刚才没有发送成功。')
    expect(wrapper.text()).not.toMatch(/HTTP|transport|Core2|Legacy|stack/i)
    const retry = wrapper.get('button')
    expect(retry.text()).toBe('重试')
    await retry.trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('disables the retry action while the same turn is retrying', () => {
    const wrapper = mount(ChatErrorRecovery, {
      props: { recovery: { ...recovery, retrying: true } }
    })

    expect(wrapper.get('button').attributes()).toHaveProperty('disabled')
    expect(wrapper.get('button').text()).toBe('正在重试…')
  })

  it('keeps the mobile action touch-sized without horizontal overflow styles', async () => {
    const source = await import('@/components/chat/ChatErrorRecovery.vue?raw')

    expect(source.default).toContain('min-height: 44px')
    expect(source.default).toContain('min-width: 0')
    expect(source.default).toContain('overflow-wrap: anywhere')
  })
})

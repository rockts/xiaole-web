import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import ProfileConfirmationCard from '../components/ProfileConfirmationCard.vue'

const item = (overrides = {}) => ({
  key: 'current_role',
  label: '当前岗位',
  state: 'needs_confirmation',
  candidate_value: '信息科技教师',
  input_type: 'text',
  options: [],
  version: 'a'.repeat(64),
  ...overrides
})

describe('ProfileConfirmationCard', () => {
  it('offers confirm and modify for a candidate without exposing internal names', async () => {
    const wrapper = mount(ProfileConfirmationCard, { props: { item: item() } })
    expect(wrapper.text()).toContain('当前岗位')
    expect(wrapper.text()).toContain('信息科技教师')
    expect(wrapper.text()).not.toMatch(/current_role|preferred_name|current_student_groups|storage_key/)
    await wrapper.get('[data-test="confirm-candidate"]').trigger('click')
    expect(wrapper.emitted('confirm')).toEqual([[item()]])
    await wrapper.get('[data-test="modify-candidate"]').trigger('click')
    expect(wrapper.get('[data-test="single-text-input"]').element.value).toBe('信息科技教师')
  })

  it('shows only the replace editor when no candidate exists', async () => {
    const value = item({ key: 'preferred_name', label: '希望小乐怎么称呼你', candidate_value: null })
    const wrapper = mount(ProfileConfirmationCard, { props: { item: value } })
    expect(wrapper.find('[data-test="confirm-candidate"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="modify-candidate"]').exists()).toBe(false)
    const save = wrapper.get('[data-test="save-replacement"]')
    expect(save.text()).toBe('保存')
    expect(save.classes()).toContain('primary-action')
    expect(save.attributes('disabled')).toBeDefined()
    await wrapper.get('[data-test="single-text-input"]').setValue('高老师')
    expect(save.attributes('disabled')).toBeUndefined()
    expect(wrapper.emitted('replace')).toBeUndefined()
    await wrapper.get('[data-test="single-text-input"]').trigger('blur')
    expect(wrapper.emitted('replace')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('replace')).toEqual([[value, '高老师']])
  })

  it('supports adding and removing multi_text values', async () => {
    const value = item({ key: 'current_service_targets', label: '当前服务对象', candidate_value: null, input_type: 'multi_text' })
    const wrapper = mount(ProfileConfirmationCard, { props: { item: value } })
    const save = wrapper.get('[data-test="save-replacement"]')
    expect(save.text()).toBe('保存')
    expect(save.classes()).toContain('primary-action')
    expect(save.attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('[data-test="multi-text-input"]')).toHaveLength(1)
    await wrapper.get('[data-test="multi-text-input"]').setValue('一年级学生')
    await wrapper.get('[data-test="add-multi-value"]').trigger('click')
    const inputs = wrapper.findAll('[data-test="multi-text-input"]')
    expect(inputs).toHaveLength(2)
    await inputs[1].setValue('教师')
    expect(save.attributes('disabled')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('replace')).toEqual([[value, ['一年级学生', '教师']]])
    await wrapper.findAll('[data-test="remove-multi-value"]')[1].trigger('click')
    expect(wrapper.findAll('[data-test="multi-text-input"]')).toHaveLength(1)
  })

  it('labels candidate editing actions explicitly and preserves edited input after an error', async () => {
    const wrapper = mount(ProfileConfirmationCard, { props: { item: item() } })
    await wrapper.get('[data-test="modify-candidate"]').trigger('click')

    const save = wrapper.get('[data-test="save-replacement"]')
    expect(save.text()).toBe('保存修改')
    expect(wrapper.get('[data-test="cancel-replacement"]').text()).toBe('取消')
    await wrapper.get('[data-test="single-text-input"]').setValue('新岗位')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('replace')).toEqual([[item(), '新岗位']])

    await wrapper.setProps({ error: '保存失败，请稍后再试。' })
    expect(wrapper.get('[data-test="single-text-input"]').element.value).toBe('新岗位')
  })

  it('shows an unmistakable loading action and blocks repeated replacement submits', async () => {
    const value = item({ candidate_value: null })
    const wrapper = mount(ProfileConfirmationCard, { props: { item: value } })
    await wrapper.get('[data-test="single-text-input"]').setValue('教师')
    await wrapper.setProps({ submitting: true })

    const save = wrapper.get('[data-test="save-replacement"]')
    expect(save.text()).toBe('保存中…')
    expect(save.attributes('disabled')).toBeDefined()
    await save.trigger('click')
    await wrapper.get('form').trigger('submit')
    expect(wrapper.emitted('replace')).toBeUndefined()
  })

  it('disables all actions while submitting and displays safe field feedback', () => {
    const wrapper = mount(ProfileConfirmationCard, {
      props: { item: item(), submitting: true, error: '这项资料刚刚发生了变化，请刷新后再确认。' }
    })
    expect(wrapper.findAll('button').every((button) => button.attributes('disabled') !== undefined)).toBe(true)
    expect(wrapper.get('[data-test="confirmation-error"]').text()).toContain('刚刚发生了变化')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ActionView from '../../views/ActionView.vue'

vi.mock('../../services/api', () => ({ default: { getTasks: vi.fn(), getCurrentTasks: vi.fn(), getTask: vi.fn() } }))
import api from '../../services/api'

const now = '2026-08-22T08:00:00Z'
const task = (id, status, overrides = {}) => ({
  id,
  user_id: 'admin',
  session_id: `session-${id}`,
  title: `事项 ${id}`,
  description: `事项 ${id} 的说明`,
  status,
  result: null,
  error_message: null,
  created_at: now,
  updated_at: now,
  started_at: status === 'in_progress' ? now : null,
  completed_at: status === 'completed' ? now : null,
  retry_count: 0,
  max_retries: 3,
  metadata: { debug: 'do-not-render' },
  ...overrides
})

const running = task(101, 'in_progress', { title: '整理课程资料' })
const userWaiting = task(102, 'waiting', { title: '确认发布范围' })
const systemWaiting = task(103, 'waiting', { title: '等待资料处理' })
const planned = task(104, 'pending', { title: '准备下次资料整理' })
const failed = task(105, 'failed', { title: '发送课程通知', error_message: 'execution_attempt=991 ECONNRESET /private/token' })
const completed = Array.from({ length: 11 }, (_, index) => task(200 + index, 'completed', {
  title: `已完成事项 ${index + 1}`,
  completed_at: `2026-08-${String(22 - Math.min(index, 9)).padStart(2, '0')}T08:00:00Z`,
  result: JSON.stringify({ summary: `完成结果 ${index + 1}`, internal_id: `execution-${index + 1}` })
}))

const taskDetails = {
  101: {
    success: true,
    task: running,
    steps: [
      { id: 9001, step_num: 1, description: '已读取课程目录', action_type: 'info', status: 'completed', result: '{"debug":"hidden"}' },
      { id: 9002, step_num: 2, description: '正在提炼课程重点', action_type: 'tool_call', status: 'in_progress', action_params: { path: '/private/course' } },
      { id: 9003, step_num: 3, description: '生成整理结果', action_type: 'info', status: 'pending' }
    ]
  },
  102: {
    success: true,
    task: userWaiting,
    steps: [{ id: 9101, step_num: 1, description: '请选择允许发布的班级', action_type: 'user_confirm', status: 'waiting', result: '{"confirmed":false}' }]
  },
  103: {
    success: true,
    task: systemWaiting,
    steps: [{ id: 9201, step_num: 1, description: '等待资料分析完成', action_type: 'wait', status: 'waiting', action_params: { duration: 60 } }]
  }
}

const fullTasks = [running, userWaiting, systemWaiting, planned, failed, ...completed, task(999, 'cancelled'), task(1000, 'internal_debug')]

const defaults = () => {
  api.getCurrentTasks.mockResolvedValue({ success: true, tasks: fullTasks })
  api.getTask.mockImplementation(async (id) => taskDetails[id] || { success: false })
}

const mountAction = async () => {
  const wrapper = mount(ActionView, {
    global: { stubs: { RouterLink: { props: ['to'], template: '<a :href="to"><slot /></a>' } } }
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

describe('XiaoLe Phase D Action', () => {
  beforeEach(() => { vi.clearAllMocks(); defaults() })

  it('uses only the server current projection instead of the historical task query', async () => {
    api.getCurrentTasks.mockResolvedValueOnce({ success: true, tasks: [userWaiting, planned] })
    const wrapper = await mountAction()
    expect(api.getCurrentTasks).toHaveBeenCalledWith(50)
    expect(api.getTasks).not.toHaveBeenCalled()
    expect(wrapper.text()).toContain('确认发布范围')
    expect(wrapper.text()).toContain('准备下次资料整理')
  })

  it('organizes tasks by user responsibility and explains current and next steps', async () => {
    const wrapper = await mountAction()
    expect(wrapper.get('[data-test="action-summary"]').text()).toContain('2 件正在处理，1 件需要你确认')
    expect(wrapper.findAll('[data-action-section]').map((section) => section.attributes('data-action-section'))).toEqual(['user', 'ongoing', 'planned', 'attention', 'completed'])
    expect(wrapper.findAll('[data-test="user-task"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="user-task"]').text()).toContain('请选择允许发布的班级')
    expect(wrapper.findAll('[data-test="ongoing-task"]')).toHaveLength(2)
    expect(wrapper.get('[data-test="ongoing-task"]').text()).toContain('正在提炼课程重点')
    expect(wrapper.get('[data-test="ongoing-task"]').text()).toContain('生成整理结果')
    expect(wrapper.findAll('[data-test="planned-task"]')).toHaveLength(1)
  })

  it('does not misclassify an ordinary pending or system wait as needing the user', async () => {
    api.getCurrentTasks.mockResolvedValueOnce({ success: true, tasks: [planned, systemWaiting] })
    const wrapper = await mountAction()
    expect(wrapper.find('[data-action-section="user"]').exists()).toBe(false)
    expect(wrapper.findAll('[data-test="planned-task"]')).toHaveLength(1)
    expect(wrapper.findAll('[data-test="ongoing-task"]')).toHaveLength(1)
  })

  it('maps failures to user language, hides normal attention, and never exposes internals', async () => {
    const wrapper = await mountAction()
    const attention = wrapper.get('[data-action-section="attention"]')
    expect(attention.text()).toContain('发送通知未完成')
    expect(wrapper.text()).not.toMatch(/in_progress|execution_attempt|ECONNRESET|private\/token|session-101|execution-1|do-not-render|internal_debug/)

    api.getCurrentTasks.mockResolvedValueOnce({ success: true, tasks: [running] })
    const healthy = await mountAction()
    expect(healthy.find('[data-action-section="attention"]').exists()).toBe(false)
  })

  it('limits completed items to eight and shows safe results and existing task links', async () => {
    const wrapper = await mountAction()
    expect(wrapper.findAll('[data-test="completed-task"]')).toHaveLength(8)
    expect(wrapper.get('[data-test="completed-task"]').text()).toContain('完成结果 1')
    expect(wrapper.get('[data-test="task-detail-link"]').attributes('href')).toBe('/task/102')
    expect(wrapper.get('[data-test="all-tasks"]').attributes('href')).toBe('/tasks')
  })

  it('shows calm empty states without reserving a user-action block', async () => {
    api.getCurrentTasks.mockResolvedValueOnce({ success: true, tasks: [] })
    const wrapper = await mountAction()
    expect(wrapper.get('[data-test="action-empty"]').text()).toContain('目前没有需要跟进的事项')
    expect(wrapper.get('[data-test="ongoing-empty"]').text()).toContain('目前没有正在执行的事项')
    expect(wrapper.find('[data-action-section="user"]').exists()).toBe(false)
    expect(wrapper.find('[data-action-section="attention"]').exists()).toBe(false)
  })

  it('shows a retryable page failure when the Tasks API fails', async () => {
    api.getCurrentTasks.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ success: true, tasks: [] })
    const wrapper = await mountAction()
    expect(wrapper.get('[data-test="action-error"]').text()).toContain('行动暂时无法读取')
    await wrapper.get('[data-test="action-retry"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[data-test="action-error"]').exists()).toBe(false)
  })

  it('keeps partial tasks visible when task detail is unavailable', async () => {
    api.getCurrentTasks.mockResolvedValueOnce({ success: true, tasks: [running] })
    api.getTask.mockRejectedValueOnce(new Error('detail unavailable'))
    const wrapper = await mountAction()
    expect(wrapper.findAll('[data-test="ongoing-task"]')).toHaveLength(1)
    expect(wrapper.get('[data-test="ongoing-task"]').text()).toContain('正在处理')
    expect(wrapper.get('[data-test="task-detail-link"]').attributes('href')).toBe('/task/101')
  })
})

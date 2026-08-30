<template>
  <main class="action-view">
    <div v-if="loading" class="page-state" aria-live="polite">正在看看小可处理到哪里了…</div>
    <div v-else-if="error" class="page-state" data-test="action-error">
      <span class="state-mark">↻</span><h1>行动暂时无法读取</h1><p>小可还没有返回任务状态，请稍后再试。</p><button type="button" data-test="action-retry" @click="load">重新加载</button>
    </div>

    <template v-else>
      <header class="action-header">
        <p class="eyebrow">小可正在帮我做什么</p><h1>行动</h1>
        <p data-test="action-summary">小可目前有 {{ ongoingTasks.length }} 件正在处理，{{ userTasks.length }} 件需要你确认。</p>
      </header>

      <p v-if="!visibleTaskCount" class="overall-empty" data-test="action-empty">目前没有需要跟进的事项。新的行动会在这里出现。</p>

      <section v-if="userTasks.length" class="action-section user-section" data-action-section="user">
        <header class="section-heading"><div><p class="section-kicker">现在卡在你这里</p><h2>待我处理</h2></div><span>{{ userTasks.length }} 件</span></header>
        <div class="task-list priority-list">
          <article v-for="task in userTasks" :key="task.id" class="task-card user-card" data-test="user-task">
            <div class="task-copy"><p class="task-status">等待你的确认</p><h3>{{ taskTitle(task) }}</h3><p class="task-description">{{ currentStep(task)?.description || task.description || '小可需要你确认下一步。' }}</p><p class="step-line"><span>下一步</span>完成确认后，小可会继续处理。</p></div>
            <router-link :to="`/task/${task.id}`" data-test="task-detail-link">去处理</router-link>
          </article>
        </div>
      </section>

      <section class="action-section" data-action-section="ongoing">
        <header class="section-heading"><div><p class="section-kicker">小可正在推进</p><h2>进行中</h2></div><span v-if="ongoingTasks.length">{{ ongoingTasks.length }} 件</span></header>
        <div v-if="ongoingTasks.length" class="task-list">
          <article v-for="task in ongoingTasks" :key="task.id" class="task-card" data-test="ongoing-task">
            <div class="task-copy"><p class="task-status">{{ task.status === 'waiting' ? '暂时等待' : '正在处理' }}</p><h3>{{ taskTitle(task) }}</h3><p v-if="latestStep(task)" class="step-line"><span>最近一步</span>{{ latestStep(task).description }}</p><p v-if="nextStep(task)" class="step-line"><span>下一步</span>{{ nextStep(task).description }}</p><p v-if="!latestStep(task) && !nextStep(task)" class="task-description">正在处理，详细进度暂时不可用。</p></div>
            <router-link :to="`/task/${task.id}`" data-test="task-detail-link">查看进度</router-link>
          </article>
        </div>
        <p v-else class="section-empty" data-test="ongoing-empty">目前没有正在执行的事项。</p>
      </section>

      <section class="action-section quiet-section" data-action-section="planned">
        <header class="section-heading"><div><p class="section-kicker">已经准备好</p><h2>已计划</h2></div><span v-if="plannedTasks.length">{{ plannedTasks.length }} 件</span></header>
        <div v-if="plannedTasks.length" class="compact-list">
          <router-link v-for="task in plannedTasks" :key="task.id" :to="`/task/${task.id}`" class="compact-task" data-test="planned-task"><span><small>等待开始</small><strong>{{ taskTitle(task) }}</strong></span><time>{{ formatDate(task.created_at) }}</time></router-link>
        </div>
        <p v-else class="section-empty compact">目前没有已计划的事项。</p>
      </section>

      <section v-if="attentionTasks.length" class="action-section attention-section" data-action-section="attention">
        <header class="section-heading"><div><p class="section-kicker">需要检查</p><h2>需要关注</h2></div><span>{{ attentionTasks.length }} 件</span></header>
        <div class="task-list">
          <article v-for="task in attentionTasks" :key="task.id" class="task-card attention-card" data-test="attention-task"><div class="task-copy"><p class="task-status">{{ failureCopy(task) }}</p><h3>{{ taskTitle(task) }}</h3><p class="task-description">这项行动没有完成，可以打开详情了解当前情况。</p></div><router-link :to="`/task/${task.id}`" data-test="task-detail-link">查看详情</router-link></article>
        </div>
      </section>

      <section class="action-section completed-section" data-action-section="completed">
        <header class="section-heading"><div><p class="section-kicker">最近的结果</p><h2>已完成</h2></div><router-link to="/tasks" data-test="all-tasks">查看全部任务</router-link></header>
        <div v-if="completedTasks.length" class="completed-list">
          <router-link v-for="task in completedTasks" :key="task.id" :to="`/task/${task.id}`" data-test="completed-task"><span><strong>{{ taskTitle(task) }}</strong><small v-if="safeResult(task.result)">{{ safeResult(task.result) }}</small></span><time>{{ formatDate(task.completed_at || task.updated_at) }}</time></router-link>
        </div>
        <p v-else class="section-empty compact">最近还没有完成的事项。</p>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import api from '@/services/api'

const tasks = ref([])
const loading = ref(true)
const error = ref(false)
const detailStatuses = new Set(['in_progress', 'waiting'])
const visibleStatuses = new Set(['pending', 'in_progress', 'waiting', 'completed', 'failed'])

const userNeedsAction = (task) => task.status === 'waiting' && task.steps?.some((step) => step.status === 'waiting' && step.action_type === 'user_confirm')
const userTasks = computed(() => tasks.value.filter(userNeedsAction))
const ongoingTasks = computed(() => tasks.value.filter((task) => (task.status === 'in_progress' || task.status === 'waiting') && !userNeedsAction(task)))
const plannedTasks = computed(() => tasks.value.filter((task) => task.status === 'pending'))
const attentionTasks = computed(() => tasks.value.filter((task) => task.status === 'failed'))
const completedTasks = computed(() => tasks.value.filter((task) => task.status === 'completed').sort((a, b) => new Date(b.completed_at || b.updated_at || 0) - new Date(a.completed_at || a.updated_at || 0)).slice(0, 8))
const visibleTaskCount = computed(() => userTasks.value.length + ongoingTasks.value.length + plannedTasks.value.length + attentionTasks.value.length + completedTasks.value.length)

const taskTitle = (task) => String(task.title || '').trim() || '未命名事项'
const orderedSteps = (task) => [...(task.steps || [])].sort((a, b) => Number(a.step_num || 0) - Number(b.step_num || 0))
const currentStep = (task) => orderedSteps(task).find((step) => step.status === 'waiting' || step.status === 'in_progress')
const latestStep = (task) => [...orderedSteps(task)].reverse().find((step) => ['completed', 'in_progress', 'waiting', 'failed'].includes(step.status))
const nextStep = (task) => orderedSteps(task).find((step) => step.status === 'pending')
const failureCopy = (task) => /通知|提醒|bark/i.test(`${task.title || ''} ${task.description || ''}`) ? '发送通知未完成' : '执行未完成，需要检查'
const safeResult = (value) => {
  if (typeof value !== 'string' || !value.trim()) return ''
  try {
    const parsed = JSON.parse(value)
    for (const key of ['summary', 'message', 'data']) if (typeof parsed?.[key] === 'string' && parsed[key].trim()) return parsed[key].trim().slice(0, 160)
  } catch (_) { return '' }
  return ''
}
const formatDate = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) }

const load = async () => {
  loading.value = true
  error.value = false
  try {
    const response = await api.getCurrentTasks(50)
    if (response?.success === false || !Array.isArray(response?.tasks)) throw new Error('tasks unavailable')
    const visible = response.tasks.filter((task) => task && visibleStatuses.has(task.status))
    tasks.value = await Promise.all(visible.map(async (task) => {
      if (!detailStatuses.has(task.status)) return task
      try {
        const detail = await api.getTask(task.id)
        return detail?.success ? { ...task, steps: Array.isArray(detail.steps) ? detail.steps : [] } : task
      } catch (_) { return task }
    }))
  } catch (_) {
    tasks.value = []
    error.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.action-view{width:min(100% - 48px,1040px);margin:0 auto;padding:44px 0 104px;color:var(--text-primary)}.page-state{display:flex;min-height:60vh;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;color:var(--text-secondary)}.page-state h1{margin:0;color:var(--text-primary);font-size:28px}.page-state p{margin:0}.page-state button{min-height:44px;margin-top:8px;padding:0 18px;border:0;border-radius:12px;background:var(--primary-color);color:white;cursor:pointer}.state-mark{font-size:30px}.action-header{max-width:760px;margin-bottom:44px}.eyebrow,.section-kicker{margin:0 0 8px;color:var(--text-secondary);font-size:13px;font-weight:650;letter-spacing:.04em}.action-header h1{margin:0;font-size:clamp(38px,5vw,54px);letter-spacing:-.04em}.action-header>p:last-child{margin:12px 0 0;color:var(--text-secondary);font-size:19px}.overall-empty{margin:-20px 0 28px;padding:18px 20px;border-radius:16px;background:var(--bg-secondary);color:var(--text-secondary)}.action-section{margin-bottom:46px}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:18px}.section-heading h2{margin:0;font-size:27px;letter-spacing:-.025em}.section-heading>span,.section-heading>a{color:var(--text-secondary);font-size:13px;text-decoration:none}.section-heading>a:hover{color:var(--primary-color)}.task-list{display:flex;flex-direction:column;gap:10px}.task-card{display:flex;align-items:flex-start;justify-content:space-between;gap:26px;min-width:0;padding:22px;border:1px solid var(--border-light);border-radius:18px}.task-copy{min-width:0}.task-card h3{margin:6px 0 10px;font-size:18px}.task-status{margin:0;color:#5b816a;font-size:12px;font-weight:650}.task-description,.step-line{margin:5px 0 0;color:var(--text-secondary);font-size:13px;line-height:1.6}.step-line span{display:inline-block;min-width:62px;color:var(--text-primary);font-weight:600}.task-card>a{flex:0 0 auto;min-height:44px;padding:12px 4px;color:var(--primary-color);font-size:13px;text-decoration:none}.user-section{padding:26px;border-radius:24px;background:color-mix(in srgb,#d5a43b 8%,var(--bg-primary));border:1px solid color-mix(in srgb,#d5a43b 30%,var(--border-light))}.user-card{border:0;background:var(--bg-primary)}.user-card .task-status{color:#a27724}.quiet-section,.completed-section{border-top:1px solid var(--border-light);padding-top:30px}.compact-list,.completed-list{display:flex;flex-direction:column}.compact-task,.completed-list>a{display:flex;min-height:58px;align-items:center;justify-content:space-between;gap:20px;padding:9px 4px;border-bottom:1px solid var(--border-light);color:inherit;text-decoration:none}.compact-task>span,.completed-list>a>span{display:flex;min-width:0;flex-direction:column;gap:4px}.compact-task small,.completed-list small,.compact-task time,.completed-list time{color:var(--text-secondary);font-size:12px}.compact-task strong,.completed-list strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:14px}.attention-card{border-color:color-mix(in srgb,#c77162 35%,var(--border-light));background:color-mix(in srgb,#c77162 5%,var(--bg-primary))}.attention-card .task-status{color:#b05f51}.section-empty{min-height:96px;margin:0;padding:28px;border-radius:17px;background:var(--bg-secondary);color:var(--text-secondary);box-sizing:border-box}.section-empty.compact{min-height:0;padding:18px}
@media(max-width:768px){.action-view{width:min(100% - 24px,1040px);padding:25px 0 calc(98px + env(safe-area-inset-bottom))}.action-header{margin-bottom:32px}.action-header h1{font-size:38px}.action-header>p:last-child{font-size:16px}.action-section{margin-bottom:38px}.section-heading{align-items:flex-start}.section-heading h2{font-size:24px}.user-section{padding:18px 14px;border-radius:20px}.task-card{flex-direction:column;gap:7px;padding:18px}.task-card>a{padding:10px 0}.compact-task,.completed-list>a{align-items:flex-start;min-height:64px}.compact-task time,.completed-list time{flex:0 0 auto;padding-top:4px}.step-line span{display:block;min-width:0;margin-bottom:1px}}
</style>

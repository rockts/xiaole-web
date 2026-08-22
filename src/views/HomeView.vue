<template>
  <main class="home-view">
    <div v-if="loading" class="home-state" aria-live="polite">正在整理今天的信息…</div>
    <div v-else-if="error" class="home-state home-error" data-test="home-error">
      <span class="state-mark">↻</span>
      <h1>首页暂时无法加载</h1>
      <p>小乐还没有拿到今天的整理结果，请稍后再试。</p>
      <button data-test="home-retry" @click="load">重新加载</button>
    </div>

    <template v-else-if="home">
      <p v-if="isStale" class="status-notice stale" data-test="stale-notice">数据更新稍有延迟，当前显示最近一次整理结果。</p>

      <section class="today-section" data-home-section="today">
        <div class="today-copy">
          <p class="eyebrow">{{ home.today.date }}</p>
          <h1>今天</h1>
          <p class="today-summary">{{ home.today.summary }}</p>
          <p v-if="scanSummary" class="scan-summary">{{ scanSummary }}</p>
        </div>
        <details class="today-details">
          <summary>查看整理详情</summary>
          <div class="fact-list">
            <span>发现 {{ home.today.new_discovered }}</span>
            <span>与你相关 {{ home.today.relevant }}</span>
            <span>已通知 {{ home.today.notified }}</span>
            <span>来源正常 {{ home.today.sources.healthy }}</span>
            <span v-if="home.today.sources.unhealthy">来源异常 {{ home.today.sources.unhealthy }}</span>
          </div>
        </details>
      </section>

      <aside v-if="hasSystemIssue" class="status-notice system-alert" data-test="system-alert">
        <span class="notice-dot"></span>
        <div><strong>部分能力暂时不可用</strong><p>小乐仍会展示可用信息，详细状态见页面底部。</p></div>
      </aside>

      <section class="home-section recommendations-section" data-home-section="recommendations">
        <header class="section-header"><div><p class="section-kicker">为你整理</p><h2>值得关注</h2></div><span v-if="visibleRecommendations.length" class="section-note">优先显示 {{ visibleRecommendations.length }} 项</span></header>
        <div v-if="visibleRecommendations.length" class="recommendation-list">
          <RecommendationCard v-for="item in visibleRecommendations" :key="`${item.title}-${item.published_at}`" :item="item" />
        </div>
        <div v-else class="gentle-empty" data-test="recommendations-empty">{{ home.recommendations.empty_message || '目前没有需要优先处理的事项。' }}</div>
      </section>

      <section class="home-section ask-section" data-home-section="ask">
        <div class="ask-heading"><p class="section-kicker">随时可以开始</p><h2>问小乐</h2><p>把你正在想的事告诉我，或者从下面选一个问题。</p></div>
        <form class="ask-box" @submit.prevent="ask(customQuestion)">
          <input v-model="customQuestion" aria-label="问小乐" placeholder="现在想了解什么？" />
          <button type="submit" :disabled="!customQuestion.trim()" aria-label="带着问题去对话">→</button>
        </form>
        <div class="quick-list" aria-label="快捷问题">
          <button v-for="question in home.quick_questions" :key="question" type="button" data-test="quick-question" @click="ask(question)">{{ question }}</button>
        </div>
      </section>

      <section v-if="showProfile" class="quiet-section profile-section" data-home-section="profile">
        <details>
          <summary><span><strong>让小乐更懂你</strong><small>为了让推荐更准确，还有 {{ confirmationStore.pendingCount }} 项资料需要确认。</small></span><button type="button" class="summary-action" data-test="view-profile-confirmations" @click.stop="viewProfileConfirmations">查看</button></summary>
          <div class="profile-fields"><p>这些资料需要由你确认后，才会作为小乐了解你的正式信息。</p></div>
        </details>
      </section>

      <section class="home-section recent-section" data-home-section="recent">
        <header class="section-header"><div><p class="section-kicker">继续之前的思路</p><h2>最近对话</h2></div><a href="/conversations" data-test="all-conversations" @click.prevent="router.push('/conversations')">查看全部</a></header>
        <div v-if="recentConversations.length" class="recent-list">
          <button v-for="conversation in recentConversations" :key="conversation.session_id" type="button" data-test="recent-conversation" @click="openConversation(conversation)"><span>{{ conversation.title || '未命名对话' }}</span><time>{{ formatConversationTime(conversation.updated_at || conversation.created_at) }}</time></button>
        </div>
        <p v-else class="gentle-empty compact" data-test="recent-empty">暂时没有最近对话，新的讨论会出现在这里。</p>
      </section>

      <section class="quiet-section notification-section" data-home-section="no-notification">
        <details>
          <summary><span><strong>最近为什么没通知我？</strong><small>{{ home.no_notification_summary.summary }}</small></span><span class="summary-action">了解原因</span></summary>
          <div class="notification-details"><p>真正新发布：{{ home.no_notification_summary.true_new }}</p><ul><li v-for="category in home.no_notification_summary.categories" :key="category.code"><span>{{ category.label }}</span><strong>{{ category.count }}</strong></li></ul></div>
        </details>
      </section>

      <section class="systems-section" data-home-section="systems">
        <div class="systems-heading"><span class="overall-dot" :class="{ issue: hasSystemIssue }"></span><div><h2>服务状态</h2><p>{{ hasSystemIssue ? '部分服务状态需要留意' : '各项服务正常' }}</p></div></div>
        <div class="system-list"><article v-for="system in systemList" :key="system.key" :class="system.status"><span>{{ system.userLabel }}</span><small>{{ system.message }}</small></article></div>
      </section>
    </template>
  </main>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/services/api'
import { useProfileConfirmationsStore } from '@/stores/profileConfirmations'
import RecommendationCard from '@/home/components/RecommendationCard.vue'

const router = useRouter()
const confirmationStore = useProfileConfirmationsStore()
const home = ref(null)
const loading = ref(true)
const error = ref(null)
const customQuestion = ref('')

const visibleRecommendations = computed(() => home.value?.recommendations?.items?.slice(0, 3) || [])
const recentConversations = computed(() => home.value?.recent_conversations?.slice(0, 4) || [])
const showProfile = computed(() => confirmationStore.pendingCount > 0)
const isStale = computed(() => home.value?.cache?.status === 'stale')
const systemList = computed(() => Object.entries(home.value?.systems || {}).map(([key, system]) => ({ ...system, key, userLabel: { brain: '小乐', memory: '知识服务', action: '行动服务' }[key] || system.label })))
const hasSystemIssue = computed(() => systemList.value.some((system) => system.status === 'degraded' || system.status === 'unavailable'))
const scanSummary = computed(() => {
  const last = home.value?.today?.last_scan_at
  if (!last) return ''
  const lastText = formatTime(last)
  const next = home.value?.today?.next_scan_at
  return next ? `小乐已在 ${lastText} 为你看过，下一次整理约在 ${formatTime(next)}。` : `小乐已在 ${lastText} 为你看过。`
})

const formatTime = (value) => { const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }) }
const formatConversationTime = (value) => { if (!value) return ''; const date = new Date(value); if (Number.isNaN(date.getTime())) return ''; const today = new Date(); return date.toDateString() === today.toDateString() ? formatTime(value) : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' }) }
const load = async () => { loading.value = true; error.value = null; try { home.value = await api.getHome() } catch (cause) { error.value = cause } finally { loading.value = false } }
const ask = (question) => { const draft = question?.trim(); if (!draft) return; router.push({ path: '/chat', state: { xiaoleDraft: draft, source: 'home_quick_question' } }) }
const openConversation = (conversation) => router.push(`/chat/${conversation.session_id}`)
const viewProfileConfirmations = () => router.push('/knowledge?tab=profile&section=confirmations')
onMounted(() => { load(); confirmationStore.load() })
</script>

<style scoped>
.home-view{width:min(100% - 48px,1040px);margin:0 auto;padding:42px 0 96px;color:var(--text-primary)}.home-state{display:flex;min-height:60vh;flex-direction:column;align-items:center;justify-content:center;gap:12px;text-align:center;color:var(--text-secondary)}.home-error h1{margin:0;color:var(--text-primary);font-size:28px}.home-error p{margin:0}.home-error button{min-height:44px;margin-top:8px;padding:0 18px;border:0;border-radius:12px;background:var(--primary-color);color:white;cursor:pointer}.state-mark{font-size:32px}.status-notice{display:flex;align-items:flex-start;gap:12px;margin:0 0 22px;padding:13px 16px;border-radius:14px;background:var(--bg-secondary);color:var(--text-secondary);font-size:14px}.status-notice.stale{border-left:3px solid #d5a43b}.system-alert{border:1px solid color-mix(in srgb,#d5a43b 38%,var(--border-light))}.system-alert strong{color:var(--text-primary)}.system-alert p{margin:3px 0 0}.notice-dot,.overall-dot{width:8px;height:8px;flex:0 0 auto;margin-top:6px;border-radius:50%;background:#d5a43b}.today-section{margin-bottom:54px;padding:42px 44px 24px;border-radius:28px;background:var(--bg-secondary)}.eyebrow,.section-kicker{margin:0 0 8px;color:var(--text-secondary);font-size:13px;font-weight:650;letter-spacing:.04em}.today-section h1{margin:0 0 16px;font-size:clamp(36px,5vw,56px);line-height:1}.today-summary{max-width:780px;margin:0;font-size:clamp(20px,2.5vw,29px);line-height:1.5;letter-spacing:-.02em}.scan-summary{margin:16px 0 0;color:var(--text-secondary);font-size:13px}.today-details{margin-top:24px;border-top:1px solid var(--border-light);padding-top:14px}.today-details summary{width:max-content;cursor:pointer;color:var(--text-secondary);font-size:13px}.fact-list{display:flex;flex-wrap:wrap;gap:16px;margin-top:14px;color:var(--text-secondary);font-size:13px}.home-section{margin-bottom:54px}.section-header{display:flex;align-items:end;justify-content:space-between;gap:20px;margin-bottom:20px}.section-header h2,.ask-heading h2{margin:0;font-size:28px;letter-spacing:-.02em}.section-note,.section-header a{color:var(--text-secondary);font-size:13px;text-decoration:none}.section-header a:hover{color:var(--primary-color)}.recommendation-list{display:flex;flex-direction:column;gap:12px}.gentle-empty{padding:28px;border-radius:18px;background:var(--bg-secondary);color:var(--text-secondary)}.gentle-empty.compact{padding:18px}.ask-section{padding:30px;border-radius:24px;background:var(--bg-secondary)}.ask-heading p:last-child{margin:8px 0 22px;color:var(--text-secondary)}.ask-box{display:grid;grid-template-columns:minmax(0,1fr) 48px;gap:8px;padding:6px;border:1px solid var(--border-light);border-radius:16px;background:var(--bg-primary)}.ask-box input{min-width:0;min-height:46px;padding:0 12px;border:0;outline:0;background:transparent;color:var(--text-primary);font-size:16px}.ask-box button{width:46px;height:46px;border:0;border-radius:12px;background:var(--primary-color);color:white;font-size:20px;cursor:pointer}.ask-box button:disabled{opacity:.4;cursor:default}.quick-list{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.quick-list button{min-height:44px;padding:0 14px;border:1px solid var(--border-light);border-radius:999px;background:var(--bg-primary);color:var(--text-secondary);cursor:pointer}.quick-list button:hover{border-color:var(--primary-color);color:var(--text-primary)}.quiet-section{margin-bottom:42px;border-top:1px solid var(--border-light);border-bottom:1px solid var(--border-light)}.quiet-section details{padding:4px 0}.quiet-section summary{display:flex;min-height:70px;align-items:center;justify-content:space-between;gap:20px;cursor:pointer;list-style:none}.quiet-section summary::-webkit-details-marker{display:none}.quiet-section summary>span:first-child{display:flex;flex-direction:column;gap:5px}.quiet-section summary small{color:var(--text-secondary);font-size:13px;font-weight:400}.summary-action{color:var(--primary-color);font-size:13px}.profile-fields,.notification-details{padding:0 0 18px}.profile-fields p,.notification-details li{display:flex;justify-content:space-between;gap:20px;margin:0;padding:8px 0;color:var(--text-secondary)}.profile-fields strong,.notification-details strong{color:var(--text-primary)}.notification-details>p{color:var(--text-secondary)}.notification-details ul{margin:0;padding:0;list-style:none}.recent-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.recent-list button{display:flex;min-width:0;min-height:52px;align-items:center;justify-content:space-between;gap:12px;padding:0 16px;border:0;border-radius:13px;background:var(--bg-secondary);color:var(--text-primary);text-align:left;cursor:pointer}.recent-list button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.recent-list time{flex:0 0 auto;color:var(--text-secondary);font-size:12px}.systems-section{display:flex;align-items:center;justify-content:space-between;gap:28px;padding-top:8px;color:var(--text-secondary)}.systems-heading{display:flex;align-items:flex-start;gap:10px}.systems-heading h2{margin:0;color:var(--text-primary);font-size:14px}.systems-heading p{margin:3px 0 0;font-size:12px}.overall-dot{margin-top:4px;background:#5da575}.overall-dot.issue{background:#d5a43b}.system-list{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px 18px}.system-list article{display:flex;gap:6px;font-size:12px}.system-list article span{color:var(--text-primary)}.system-list article small{color:var(--text-secondary)}.system-list .degraded small,.system-list .unavailable small{color:#c28b33}
@media(max-width:768px){.home-view{width:min(100% - 24px,1040px);padding:24px 0 calc(94px + env(safe-area-inset-bottom))}.today-section{margin-bottom:38px;padding:28px 22px 18px;border-radius:22px}.today-section h1{font-size:38px}.today-summary{font-size:21px}.fact-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.home-section{margin-bottom:40px}.section-header{align-items:start}.section-header h2,.ask-heading h2{font-size:24px}.section-note{display:none}.ask-section{padding:22px 16px;border-radius:20px}.quick-list{flex-direction:column}.quick-list button{width:100%;border-radius:13px;text-align:left}.quiet-section{margin-bottom:34px}.quiet-section summary{min-height:78px}.recent-list{grid-template-columns:1fr}.recent-list button{min-height:48px}.systems-section{align-items:flex-start;flex-direction:column;gap:16px}.system-list{justify-content:flex-start;gap:8px 14px;width:100%}}
.summary-action{min-width:44px;min-height:44px;border:0;background:transparent;cursor:pointer}
</style>

<template>
  <main class="knowledge-view">
    <header class="knowledge-header">
      <p class="eyebrow">小乐的长期记忆</p><h1>知识</h1><p>乐知知道什么，以及它知道的我。</p>
    </header>
    <nav class="knowledge-tabs" role="tablist" aria-label="知识内容">
      <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" :tabindex="activeTab === tab.id ? 0 : -1" :data-knowledge-tab="tab.id" @click="activeTab = tab.id">{{ tab.label }}</button>
    </nav>

    <section v-if="activeTab === 'about'" class="knowledge-panel" role="tabpanel" data-knowledge-panel="about">
      <div class="panel-heading"><div><p class="section-kicker">关于我</p><h2>小乐现在了解的你</h2></div><p>只显示当前可用且适合呈现的资料。</p></div>
      <div v-if="profileLoading" class="quiet-state" aria-live="polite">正在整理关于你的信息…</div>
      <div v-else-if="profileError" class="quiet-state" data-test="profile-error"><strong>关于你的资料暂时无法读取</strong><span>已知信息和资料仍然可以正常查看。</span></div>
      <template v-else>
        <div v-if="currentProfile.length" class="profile-grid" data-test="profile-current">
          <article v-for="field in currentProfile" :key="field.key"><span>{{ profileLabel(field) }}</span><strong>{{ displayValue(field.value) }}</strong><small>当前资料</small></article>
        </div>
        <div v-else class="quiet-state"><strong>还没有已确认的当前资料</strong><span>小乐只会在有真实资料时显示。</span></div>
        <aside v-if="pendingProfile.length" class="confirmation-note" data-test="profile-pending">
          <div><strong>有 {{ pendingProfile.length }} 项资料需要确认</strong><p>这些内容不会作为已确认的当前资料。</p></div>
          <ul><li v-for="field in pendingProfile" :key="field.key"><span>{{ profileLabel(field) }}</span><b>{{ displayValue(field.value) || '待确认' }}</b></li></ul>
        </aside>
        <details v-if="historicalProfile.length" class="historical-profile" data-test="profile-historical">
          <summary>查看历史资料 <span>{{ historicalProfile.length }} 项</span></summary>
          <div><p v-for="field in historicalProfile" :key="field.key"><span>{{ profileLabel(field) }}</span><strong>{{ displayValue(field.value) }}</strong></p></div>
        </details>
      </template>
      <section ref="confirmationSection" class="profile-confirmations" data-test="profile-confirmations" tabindex="-1" aria-labelledby="profile-confirmations-title">
        <div class="confirmation-heading"><div><p class="section-kicker">需要你确认</p><h2 id="profile-confirmations-title">待确认资料</h2></div><span v-if="confirmationStore.pendingCount">{{ confirmationStore.pendingCount }} 项</span></div>
        <div v-if="confirmationStore.loading" class="confirmation-state" aria-live="polite">正在读取待确认资料…</div>
        <div v-else-if="confirmationStore.loadError" class="confirmation-state error" role="alert">{{ confirmationStore.loadError }}</div>
        <div v-else-if="!confirmationStore.pendingCount" class="confirmation-state complete" data-test="profile-confirmations-complete">目前没有需要确认的个人资料。<span>这些资料已经确认好了，小乐会按最新信息理解你。</span></div>
        <div v-else class="confirmation-list">
          <ProfileConfirmationCard v-for="item in confirmationStore.items" :key="item.key" :item="item" :submitting="confirmationStore.isSubmitting(item.key)" :error="confirmationStore.errorFor(item.key)" @confirm="confirmItem" @replace="replaceItem" />
        </div>
      </section>
    </section>

    <section v-else-if="activeTab === 'known'" class="knowledge-panel" role="tabpanel" data-knowledge-panel="known">
      <div class="panel-heading"><div><p class="section-kicker">已知信息</p><h2>已确认、以后可能对你有用的信息</h2></div><p>只显示已确认的当前资料，历史信息单独收起。</p></div>
      <div v-if="factsLoading" class="quiet-state" aria-live="polite">正在读取已知信息…</div>
      <div v-else-if="factsError" class="quiet-state" data-test="facts-error"><strong>已知信息暂时无法读取</strong><span>不会回退显示未经治理的旧记忆。</span></div>
      <div v-else-if="!factsCurrent.length && !factsHistorical.length" class="quiet-state" data-test="facts-empty"><strong>还没有已确认的已知信息</strong><span>没有可信资料时，小乐会保持空白。</span></div>
      <template v-else>
        <div v-if="factsCurrent.length" class="fact-list">
          <article v-for="fact in factsCurrent" :key="fact.key" data-test="fact-item"><div class="item-meta"><span class="topic">{{ fact.label }}</span><time v-if="formatDate(fact.updated_at)">{{ formatDate(fact.updated_at) }}</time></div><p>{{ displayValue(fact.value) }}</p></article>
        </div>
        <details v-if="factsHistorical.length" class="historical-profile" data-test="facts-historical">
          <summary>查看历史信息 <span>{{ factsHistorical.length }} 项</span></summary>
          <div><p v-for="fact in factsHistorical" :key="fact.key"><span>{{ fact.label }}</span><strong>{{ displayValue(fact.value) }}</strong></p></div>
        </details>
      </template>
    </section>

    <section v-else class="knowledge-panel" role="tabpanel" data-knowledge-panel="documents">
      <div class="panel-heading"><div><p class="section-kicker">资料</p><h2>你交给小乐的资料</h2></div><div class="panel-actions"><router-link to="/documents" data-test="upload-document">上传资料</router-link><router-link to="/documents" data-test="all-documents">查看全部资料</router-link></div></div>
      <div v-if="documentsLoading" class="quiet-state" aria-live="polite">正在读取最近资料…</div>
      <div v-else-if="documentsError" class="quiet-state" data-test="documents-error"><strong>资料暂时无法读取</strong><span>关于我和已知信息仍然可用。</span></div>
      <div v-else-if="!documents.length" class="quiet-state" data-test="documents-empty"><strong>还没有资料</strong><span>上传后的资料、摘要和关键点会出现在这里。</span></div>
      <div v-else class="document-list">
        <article v-for="document in documents" :key="document.id" data-test="document-item">
          <div class="document-copy"><div class="item-meta"><span class="topic">{{ documentType(document.file_type) }}</span><span class="source-mark">{{ document.source_label }}</span><time v-if="formatDate(document.created_at)">{{ formatDate(document.created_at) }}</time><span>{{ documentStatus(document.processing_status) }}</span></div><h3>{{ document.title || '未命名资料' }}</h3><p class="document-summary muted">{{ document.summary_available ? '摘要已生成，可在详情中查看。' : '这份资料暂时没有可展示的摘要。' }}</p></div>
          <router-link v-if="document.open_available" :to="`/documents/${document.id}`" data-test="document-detail">查看详情</router-link>
        </article>
      </div>
    </section>
  </main>
</template>

<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import api from '@/services/api'
import ProfileConfirmationCard from '@/knowledge/components/ProfileConfirmationCard.vue'
import { useProfileConfirmationsStore } from '@/stores/profileConfirmations'

const tabs = [{ id: 'about', label: '关于我' }, { id: 'known', label: '已知信息' }, { id: 'documents', label: '资料' }]
const route = useRoute()
const confirmationStore = useProfileConfirmationsStore()
const allowedProfileKeys = new Set(['current_school', 'preferred_name', 'current_role', 'current_teaching_subjects', 'current_service_targets', 'current_service_audiences', 'current_grade_levels', 'historical_school', 'historical_schools'])
const profileLabels = { current_school: '当前学校', preferred_name: '我是谁', current_role: '当前工作 / 职业', current_teaching_subjects: '教育方向', current_service_targets: '当前服务对象', current_service_audiences: '专业角色', current_grade_levels: '当前服务年级', historical_school: '历史学校', historical_schools: '历史学校' }
const currentStates = new Set(['confirmed', 'current', 'confirmed_current'])
const activeTab = ref(route.query.tab === 'profile' ? 'about' : (['about', 'known', 'documents'].includes(route.query.tab) ? route.query.tab : 'about'))
const confirmationSection = ref(null)
const profileFields = ref([]), profileLoading = ref(true), profileError = ref(false)
const factsCurrent = ref([]), factsHistorical = ref([]), factsLoading = ref(true), factsError = ref(false)
const documents = ref([]), documentsLoading = ref(true), documentsError = ref(false)
const displayValue = (value) => Array.isArray(value) ? value.filter(Boolean).join('、') : String(value ?? '').trim()
const safeProfile = computed(() => profileFields.value.filter((field) => field && allowedProfileKeys.has(field.key) && displayValue(field.value)))
const currentProfile = computed(() => safeProfile.value.filter((field) => currentStates.has(field.state)))
const pendingProfile = computed(() => safeProfile.value.filter((field) => field.state === 'needs_confirmation'))
const historicalProfile = computed(() => safeProfile.value.filter((field) => field.state === 'historical'))
const profileLabel = (field) => profileLabels[field.key] || field.label
const formatDate = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('zh-CN', { year: 'numeric', month: 'numeric', day: 'numeric' }) }
const documentType = (type) => ({ pdf: 'PDF', doc: 'Word', docx: 'Word', txt: '文本', md: 'Markdown' }[String(type || '').toLowerCase()] || '资料')
const documentStatus = (status) => ({ pending: '等待处理', processing: '处理中', completed: '已完成', failed: '处理失败' }[String(status || '').toLowerCase()] || '状态未知')

const loadProfile = async () => { profileLoading.value = true; profileError.value = false; try { const profile = await api.getKnowledgeProfile(); profileFields.value = Array.isArray(profile?.fields) ? profile.fields : [] } catch (_) { profileFields.value = []; profileError.value = true } finally { profileLoading.value = false } }
const loadFacts = async () => { factsLoading.value = true; factsError.value = false; try { const response = await api.getKnowledgeFacts(); factsCurrent.value = Array.isArray(response?.current) ? response.current : []; factsHistorical.value = Array.isArray(response?.historical) ? response.historical : [] } catch (_) { factsCurrent.value = []; factsHistorical.value = []; factsError.value = true } finally { factsLoading.value = false } }
const loadDocuments = async () => { documentsLoading.value = true; documentsError.value = false; try { const response = await api.getKnowledgeDocuments(8); documents.value = Array.isArray(response?.documents) ? response.documents : [] } catch (_) { documents.value = []; documentsError.value = true } finally { documentsLoading.value = false } }
const confirmItem = async (item) => { if (await confirmationStore.submit(item, 'confirm')) await loadProfile() }
const replaceItem = async (item, value) => { if (await confirmationStore.submit(item, 'replace', value)) await loadProfile() }
onMounted(async () => {
  await Promise.all([loadProfile(), loadFacts(), loadDocuments(), confirmationStore.load()])
  if (route.query.section === 'confirmations') {
    activeTab.value = 'about'
    await nextTick()
    confirmationSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    confirmationSection.value?.focus({ preventScroll: true })
  }
})
</script>

<style scoped>
.knowledge-view{width:min(100% - 48px,1040px);margin:0 auto;padding:44px 0 104px;color:var(--text-primary)}.knowledge-header{max-width:680px;margin-bottom:30px}.eyebrow,.section-kicker{margin:0 0 8px;color:var(--text-secondary);font-size:13px;font-weight:650;letter-spacing:.04em}.knowledge-header h1{margin:0;font-size:clamp(38px,5vw,54px);letter-spacing:-.04em}.knowledge-header>p:last-child{margin:10px 0 0;color:var(--text-secondary);font-size:18px}.knowledge-tabs{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;max-width:520px;margin-bottom:42px;padding:5px;border-radius:15px;background:var(--bg-secondary)}.knowledge-tabs button{min-width:0;min-height:44px;border:0;border-radius:11px;background:transparent;color:var(--text-secondary);font:inherit;font-weight:600;cursor:pointer}.knowledge-tabs button[aria-selected=true]{background:var(--bg-primary);color:var(--text-primary);box-shadow:0 1px 4px rgba(0,0,0,.08)}.knowledge-panel{min-width:0}.panel-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:28px;margin-bottom:24px}.panel-heading h2{margin:0;font-size:28px;letter-spacing:-.025em}.panel-heading>p{max-width:340px;margin:0;color:var(--text-secondary);font-size:13px;text-align:right}.panel-heading a,.panel-actions a{color:var(--primary-color);font-size:13px;text-decoration:none}.panel-actions{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:10px 18px}.profile-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.profile-grid article{display:flex;min-width:0;min-height:112px;flex-direction:column;padding:20px;border-radius:18px;background:var(--bg-secondary)}.profile-grid span{color:var(--text-secondary);font-size:13px}.profile-grid strong{margin:9px 0 12px;font-size:18px;line-height:1.45}.profile-grid small{margin-top:auto;color:var(--text-secondary);font-size:12px}.confirmation-note{display:grid;grid-template-columns:minmax(0,1fr) minmax(260px,1fr);gap:24px;margin-top:18px;padding:20px;border:1px solid color-mix(in srgb,#d5a43b 35%,var(--border-light));border-radius:18px;background:color-mix(in srgb,#d5a43b 6%,var(--bg-primary))}.confirmation-note p{margin:5px 0 0;color:var(--text-secondary);font-size:13px}.confirmation-note ul{margin:0;padding:0;list-style:none}.confirmation-note li{display:flex;justify-content:space-between;gap:16px;padding:5px 0;color:var(--text-secondary);font-size:13px}.confirmation-note b{color:var(--text-primary);font-weight:600;text-align:right}.historical-profile{margin-top:20px;border-top:1px solid var(--border-light);color:var(--text-secondary)}.historical-profile summary{min-height:52px;padding-top:16px;cursor:pointer;font-size:13px}.historical-profile summary span{margin-left:6px}.historical-profile p{display:flex;justify-content:space-between;gap:20px;margin:0;padding:8px 0;font-size:13px}.historical-profile strong{color:var(--text-primary)}.quiet-state{display:flex;min-height:160px;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:28px;border-radius:20px;background:var(--bg-secondary);color:var(--text-secondary);text-align:center}.quiet-state strong{color:var(--text-primary);font-size:17px}.memory-search{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-bottom:18px;padding:5px;border:1px solid var(--border-light);border-radius:15px}.memory-search input{min-width:0;min-height:44px;padding:0 12px;border:0;outline:0;background:transparent;color:var(--text-primary);font-size:16px}.memory-search button{min-height:44px;padding:0 18px;border:0;border-radius:11px;background:var(--primary-color);color:white;cursor:pointer}.memory-search button:disabled{opacity:.45}.memory-list,.document-list{display:flex;flex-direction:column;gap:10px}.memory-list article,.document-list article{min-width:0;padding:20px;border:1px solid var(--border-light);border-radius:17px}.memory-list article p{margin:12px 0 0;line-height:1.7}.item-meta{display:flex;align-items:center;flex-wrap:wrap;gap:7px 12px;color:var(--text-secondary);font-size:12px}.topic,.source-mark{padding:3px 8px;border-radius:999px;background:var(--bg-secondary)}.source-mark{color:#5b816a}.document-list article{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}.document-copy{min-width:0}.document-list h3{margin:10px 0 7px;font-size:18px}.document-summary{max-width:760px;margin:0;color:var(--text-secondary);line-height:1.65}.document-summary.muted{font-size:13px}.key-points{display:flex;flex-wrap:wrap;gap:6px 18px;margin:12px 0 0;padding:0;list-style:none;color:var(--text-secondary);font-size:13px}.key-points li::before{content:'·';margin-right:6px;color:var(--primary-color)}.document-list article>a{flex:0 0 auto;min-height:44px;padding:12px 4px;color:var(--primary-color);font-size:13px;text-decoration:none}
@media(max-width:768px){.knowledge-view{width:min(100% - 24px,1040px);padding:25px 0 calc(98px + env(safe-area-inset-bottom))}.knowledge-header{margin-bottom:22px}.knowledge-header h1{font-size:38px}.knowledge-header>p:last-child{font-size:16px}.knowledge-tabs{width:100%;max-width:none;margin-bottom:30px}.panel-heading{align-items:flex-start;flex-direction:column;gap:10px}.panel-heading h2{font-size:24px}.panel-heading>p{text-align:left}.panel-actions{justify-content:flex-start}.profile-grid{grid-template-columns:1fr}.profile-grid article{min-height:100px}.confirmation-note{grid-template-columns:1fr;gap:12px}.document-list article{flex-direction:column;gap:8px}.document-list article>a{padding:10px 0}.memory-list article,.document-list article{padding:17px}.historical-profile p{align-items:flex-start;flex-direction:column;gap:3px}}
.profile-confirmations{margin-top:34px;padding-top:30px;border-top:1px solid var(--border-light);outline:none;scroll-margin-top:24px}.confirmation-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:20px;margin-bottom:16px}.confirmation-heading h2{margin:0;font-size:24px}.confirmation-heading>span{color:var(--text-secondary);font-size:13px}.confirmation-list{display:flex;min-width:0;flex-direction:column;gap:12px}.confirmation-state{padding:22px;border-radius:16px;background:var(--bg-secondary);color:var(--text-secondary)}.confirmation-state.complete{display:flex;flex-direction:column;gap:5px}.confirmation-state.complete span{font-size:13px}.confirmation-state.error{color:#b94d4d}
@media(max-width:768px){.profile-confirmations{margin-top:28px;padding-bottom:calc(16px + env(safe-area-inset-bottom))}.confirmation-heading{align-items:flex-start}.confirmation-heading h2{font-size:22px}}
.fact-list{display:flex;flex-direction:column;gap:10px}.fact-list article{min-width:0;padding:20px;border:1px solid var(--border-light);border-radius:17px}.fact-list article p{margin:12px 0 0;line-height:1.7}
@media(max-width:768px){.fact-list article{padding:17px}}
</style>

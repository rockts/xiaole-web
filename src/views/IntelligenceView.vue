<template>
  <main class="intelligence-view" style="overflow-x: hidden">
    <header class="page-heading"><p>首页 / 情报</p><h1>通知与情报</h1><span>查看小乐曾经通知过你的事项。</span></header>
    <nav class="filters" aria-label="通知筛选">
      <button v-for="option in filters" :key="option.value" type="button" data-test="inbox-filter" style="min-height: 44px" :aria-pressed="filter === option.value" :class="{ active: filter === option.value }" @click="selectFilter(option.value)">{{ option.label }}</button>
    </nav>
    <p v-if="degraded" class="degraded" data-test="inbox-degraded">通知历史暂时无法完整加载</p>
    <div v-if="loading" class="state">正在整理通知历史…</div>
    <div v-else-if="failed" class="state error" data-test="inbox-error">通知历史暂时无法完整加载</div>
    <div v-else-if="!items.length" class="state" data-test="inbox-empty">还没有可显示的通知</div>
    <section v-else class="inbox-list"><IntelligenceCard v-for="item in items" :key="item.event_id" :item="item" /></section>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import api from '@/services/api'
import IntelligenceCard from '@/intelligence/components/IntelligenceCard.vue'
const filters = [{ label: '全部', value: 'all' }, { label: '待处理', value: 'requires_attention' }, { label: '已发送', value: 'sent' }, { label: '失败', value: 'failed' }]
const filter = ref('all'); const items = ref([]); const loading = ref(true); const failed = ref(false); const degraded = ref(false)
const load = async () => { loading.value = true; failed.value = false; degraded.value = false; try { const result = await api.getIntelligenceInbox(filter.value); items.value = result.items || []; degraded.value = Boolean(result.degraded) } catch { items.value = []; failed.value = true } finally { loading.value = false } }
const selectFilter = async (value) => { filter.value = value; await load() }
onMounted(load)
</script>

<style scoped>
.intelligence-view{box-sizing:border-box;width:min(100% - 48px,900px);margin:0 auto;padding:38px 0 110px;overflow-x:hidden}.page-heading p{margin:0 0 9px;color:var(--text-secondary);font-size:13px}.page-heading h1{margin:0 0 9px;font-size:34px}.page-heading span{color:var(--text-secondary)}.filters{display:flex;gap:8px;margin:28px 0 22px;overflow-x:auto}.filters button{min-width:68px;min-height:44px;padding:0 16px;border:1px solid var(--border-light);border-radius:999px;background:var(--bg-primary);color:var(--text-secondary);cursor:pointer}.filters button.active{border-color:var(--primary-color);background:var(--bg-secondary);color:var(--text-primary)}.inbox-list{display:grid;grid-template-columns:minmax(0,1fr);gap:12px}.state,.degraded{padding:26px;border-radius:16px;background:var(--bg-secondary);color:var(--text-secondary)}.degraded{margin-bottom:14px;border-left:3px solid #d5a43b}
@media(max-width:768px){.intelligence-view{width:min(100% - 24px,900px);padding:24px 0 calc(96px + env(safe-area-inset-bottom))}.page-heading h1{font-size:28px}.filters{margin-top:22px}.filters button{flex:1 0 auto}}
</style>

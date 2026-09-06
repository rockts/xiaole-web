<template>
  <article class="intelligence-card" :class="{ unread: !item.is_read }" data-test="intelligence-card">
    <router-link :to="`/intelligence/${encodeURIComponent(item.event_id)}`" class="card-link">
      <header><span class="read-state quiet" data-test="read-state"><i></i>{{ item.is_read ? '已读' : '未读' }}</span><time>{{ formatTime(item.sent_at || item.created_at) }}</time></header>
      <h2>{{ item.title }}</h2>
      <p v-if="item.why_relevant" class="reason">{{ item.why_relevant }}</p>
      <footer>
        <span v-if="relevanceLabel" class="relevance" :class="relevanceClass">{{ relevanceLabel }}</span>
        <span v-else-if="item.requires_user_attention" class="attention">需要留意</span>
        <span v-if="item.deadline" class="deadline">截止 {{ item.deadline }}</span>
        <span v-if="item.source_name" class="source">{{ item.source_name }}</span>
      </footer>
    </router-link>
  </article>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({ item: { type: Object, required: true } })
const relevance = computed(() => props.item.relevance_level || props.item.personal_relevance?.level || '')
const normalizedRelevance = computed(() => typeof relevance.value === 'string' ? relevance.value.toUpperCase() : '')
const relevanceLabel = computed(() => ({ WORTH_ATTENTION: '值得关注', RELATED: '与你相关', BACKGROUND_ONLY: '背景信息', IRRELEVANT: '无需关注' }[normalizedRelevance.value] || ''))
const relevanceClass = computed(() => normalizedRelevance.value.toLowerCase().replace('_', '-'))
const formatTime = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }
</script>

<style scoped>
.intelligence-card{min-width:0;border:1px solid var(--border-light);border-radius:18px;background:var(--bg-secondary)}.card-link{display:block;min-width:0;padding:18px 20px;color:inherit;text-decoration:none}.intelligence-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--text-secondary);font-size:12px}.read-state{display:flex;align-items:center;gap:7px}.read-state i{width:6px;height:6px;border-radius:50%;background:var(--text-secondary);opacity:.65}.unread h2{font-weight:680}.unread .read-state{color:var(--text-secondary)}h2{overflow-wrap:anywhere;margin:10px 0 5px;font-size:18px;line-height:1.4}.reason{display:-webkit-box;overflow:hidden;margin:0;color:var(--text-secondary);font-size:13px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}footer{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;margin-top:12px;color:var(--text-secondary);font-size:12px}.relevance,.attention{padding:4px 8px;border-radius:999px;background:var(--bg-primary);color:var(--text-primary)}.relevance.worth-attention,.attention{color:#a36e1f}.source{margin-left:auto}.deadline{color:#a36e1f}
@media(max-width:768px){.card-link{padding:14px 15px}h2{margin-top:8px;font-size:17px}.reason{-webkit-line-clamp:1}footer{margin-top:9px}.source{max-width:45%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
</style>

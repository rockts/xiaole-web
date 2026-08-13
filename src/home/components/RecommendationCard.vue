<template>
  <article class="recommendation-card">
    <div class="stars" :aria-label="`${item.stars} 星推荐`">{{ '★'.repeat(item.stars) }}</div>
    <h3>{{ item.title }}</h3><p class="meta">{{ item.source }}<span v-if="item.published_at"> · {{ item.published_at }}</span></p>
    <p v-if="item.deadline" class="deadline">截止 {{ item.deadline }}</p><p class="reason">{{ item.reason }}</p>
    <div class="eligibility"><span>我：{{ label(item.eligibility.self) }}</span><span>学生：{{ label(item.eligibility.students) }}</span><span>学校：{{ label(item.eligibility.school) }}</span></div>
    <a v-if="item.open_url" :href="item.open_url" target="_blank" rel="noopener noreferrer" class="card-action">{{ item.action.label }}</a><span v-else class="action-label">建议：{{ item.action.label }}</span>
  </article>
</template>
<script setup>
defineProps({item:{type:Object,required:true}})
const label=(value)=>({eligible:'适合',possible:'可能适合',ineligible:'不适合',unknown:'待确认'}[value]||'待确认')
</script>
<style scoped>
.recommendation-card{padding:20px;border:1px solid var(--border-color);border-radius:16px;background:var(--bg-secondary)} h3{margin:6px 0;font-size:18px}.stars{color:#e6a23c;letter-spacing:2px}.meta,.deadline{color:var(--text-secondary);font-size:13px}.reason{line-height:1.65}.eligibility{display:flex;gap:8px;flex-wrap:wrap}.eligibility span{padding:5px 9px;border-radius:999px;background:var(--bg-tertiary);font-size:12px}.card-action,.action-label{display:inline-flex;min-height:44px;align-items:center;margin-top:12px;color:var(--primary-color)}
</style>

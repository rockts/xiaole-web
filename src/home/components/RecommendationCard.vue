<template>
  <article class="recommendation-card" data-test="recommendation-card">
    <div class="recommendation-main">
      <div class="recommendation-meta">
        <span v-if="item.source">{{ item.source }}</span>
        <span v-if="item.deadline" class="deadline">截止 {{ item.deadline }}</span>
      </div>
      <h3>{{ item.title }}</h3>
      <p class="reason">{{ item.reason }}</p>
      <div class="eligibility" aria-label="适合程度">
        <span v-if="item.eligibility?.self">我：{{ label(item.eligibility.self) }}</span>
        <span v-if="item.eligibility?.students">学生：{{ label(item.eligibility.students) }}</span>
        <span v-if="item.eligibility?.school">学校：{{ label(item.eligibility.school) }}</span>
      </div>
    </div>
    <a v-if="item.open_url" :href="item.open_url" target="_blank" rel="noopener noreferrer" class="card-action">{{ item.action?.label || '查看详情' }} <span>↗</span></a>
    <span v-else class="action-label">建议：{{ item.action?.label || '了解详情' }}</span>
  </article>
</template>

<script setup>
defineProps({ item: { type: Object, required: true } })
const label = (value) => ({ eligible: '适合', possible: '可能适合', ineligible: '不适合', unknown: '待确认' }[value] || '待确认')
</script>

<style scoped>
.recommendation-card{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:24px;align-items:center;padding:22px 24px;border-radius:18px;background:var(--bg-secondary)}.recommendation-main{min-width:0}.recommendation-meta{display:flex;flex-wrap:wrap;gap:8px 14px;color:var(--text-secondary);font-size:12px}.deadline{color:#b88935}.recommendation-card h3{margin:8px 0 7px;font-size:19px;line-height:1.35}.reason{max-width:720px;margin:0;color:var(--text-secondary);line-height:1.65}.eligibility{display:flex;flex-wrap:wrap;gap:7px;margin-top:13px}.eligibility span{padding:4px 8px;border-radius:999px;background:var(--bg-tertiary);color:var(--text-secondary);font-size:11px}.card-action,.action-label{display:inline-flex;min-height:44px;align-items:center;gap:6px;white-space:nowrap;color:var(--primary-color);font-size:13px;text-decoration:none}.card-action:hover{text-decoration:underline}.action-label{color:var(--text-secondary)}
@media(max-width:768px){.recommendation-card{grid-template-columns:1fr;gap:10px;padding:19px 18px}.recommendation-card h3{font-size:18px}.card-action,.action-label{justify-self:start}}
</style>

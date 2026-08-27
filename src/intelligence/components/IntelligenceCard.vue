<template>
  <article class="intelligence-card" :class="{ unread: !item.is_read }" data-test="intelligence-card">
    <router-link :to="`/intelligence/${encodeURIComponent(item.event_id)}`" class="card-link">
      <header><span class="read-state"><i></i>{{ item.is_read ? '已读' : '未读' }}</span><time>{{ formatTime(item.sent_at || item.created_at) }}</time></header>
      <h2>{{ item.title }}</h2>
      <p class="source">{{ item.source_name || '官方来源' }}</p>
      <div class="labels"><span>{{ item.assessment_label }}</span><span>{{ item.delivery_label }}</span><span v-if="item.requires_user_attention">待确认</span></div>
      <p class="status">{{ item.status_label }}</p>
      <p v-if="item.deadline" class="deadline">截止 {{ item.deadline }}</p>
    </router-link>
  </article>
</template>

<script setup>
defineProps({ item: { type: Object, required: true } })
const formatTime = (value) => { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) }
</script>

<style scoped>
.intelligence-card{min-width:0;border:1px solid var(--border-light);border-radius:18px;background:var(--bg-secondary)}.card-link{display:block;min-width:0;padding:20px;color:inherit;text-decoration:none}.intelligence-card header{display:flex;align-items:center;justify-content:space-between;gap:12px;color:var(--text-secondary);font-size:12px}.read-state{display:flex;align-items:center;gap:7px}.read-state i{width:7px;height:7px;border-radius:50%;background:var(--text-secondary)}.unread .read-state{color:var(--primary-color)}.unread .read-state i{background:var(--primary-color)}h2{overflow-wrap:anywhere;margin:12px 0 6px;font-size:19px;line-height:1.45}.source,.status,.deadline{overflow-wrap:anywhere;margin:6px 0;color:var(--text-secondary);font-size:13px}.labels{display:flex;flex-wrap:wrap;gap:7px;margin:14px 0}.labels span{padding:5px 9px;border-radius:999px;background:var(--bg-primary);font-size:12px}.status{color:var(--text-primary)}
@media(max-width:768px){.card-link{padding:17px 15px}h2{font-size:17px}}
</style>

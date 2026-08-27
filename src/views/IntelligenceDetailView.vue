<template>
  <main class="detail-view" style="overflow-x: hidden">
    <button class="back" type="button" @click="router.push('/intelligence')">← 返回通知与情报</button>
    <div v-if="loading" class="state">正在加载通知详情…</div>
    <div v-else-if="failed" class="state">通知详情暂时无法完整加载</div>
    <article v-else-if="item">
      <header><span class="read-state">{{ item.is_read ? '已读' : '未读' }}</span><span>{{ item.delivery_label }}</span></header>
      <h1>{{ item.title }}</h1>
      <p class="source">{{ item.source_name }}</p>
      <div class="facts"><span>{{ item.assessment_label }}</span><span>{{ item.status_label }}</span><span>intelligence status: {{ item.intelligence_status }}</span><span>assessment kind: {{ item.assessment_kind }}</span><span v-if="item.deadline">截止 {{ item.deadline }}</span></div>
      <aside v-if="item.completeness_notice" class="partial">{{ item.completeness_notice }}<br />附件尚未完整获取，需要确认</aside>
      <section v-if="item.why_relevant"><h2>为什么与你相关</h2><p>{{ item.why_relevant }}</p></section>
      <a v-if="item.official_url" data-test="official-url" class="official" style="min-height: 44px" :href="item.official_url" target="_blank" rel="noopener noreferrer">打开原始官方页面</a>
      <p v-if="readFailed" class="read-error">已读状态暂时未能保存，请稍后再试。</p>
    </article>
  </main>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import api from '@/services/api'
const route = useRoute(); const router = useRouter(); const item = ref(null); const loading = ref(true); const failed = ref(false); const readFailed = ref(false)
const load = async () => { try { item.value = await api.getIntelligenceInboxDetail(route.params.eventId); if (!item.value.is_read) { try { await api.markIntelligenceRead(route.params.eventId); item.value = { ...item.value, is_read: true } } catch { readFailed.value = true } } } catch { failed.value = true } finally { loading.value = false } }
onMounted(load)
</script>

<style scoped>
.detail-view{box-sizing:border-box;width:min(100% - 48px,820px);margin:0 auto;padding:34px 0 120px;overflow-x:hidden}.back{min-height:44px;padding:0;border:0;background:transparent;color:var(--primary-color);cursor:pointer}article{min-width:0;margin-top:20px}article header{display:flex;justify-content:space-between;gap:12px;color:var(--text-secondary);font-size:13px}h1{overflow-wrap:anywhere;margin:18px 0 10px;font-size:34px;line-height:1.35}.source{color:var(--text-secondary)}.facts{display:flex;flex-wrap:wrap;gap:8px;margin:22px 0}.facts span{overflow-wrap:anywhere;padding:7px 10px;border-radius:999px;background:var(--bg-secondary);font-size:13px}.partial{margin:22px 0;padding:17px;border-left:4px solid #d5a43b;border-radius:12px;background:var(--bg-secondary);line-height:1.7}.official{display:flex;min-height:44px;width:max-content;max-width:100%;align-items:center;margin-top:28px;color:var(--primary-color);overflow-wrap:anywhere}.state{padding:28px;color:var(--text-secondary)}.read-error{color:#b36b2c}
@media(max-width:768px){.detail-view{width:min(100% - 24px,820px);padding:20px 0 calc(100px + env(safe-area-inset-bottom))}h1{font-size:27px}.facts{align-items:flex-start;flex-direction:column}.official{width:100%}}
</style>

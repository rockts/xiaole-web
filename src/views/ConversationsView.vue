<template>
  <main class="conversations-view">
    <header><div><p class="eyebrow">对话</p><h1>全部对话</h1><p>继续之前的讨论，或开始一段新对话。</p></div><button @click="newChat">+ 新对话</button></header>
    <div v-if="loading && !sortedSessions.length" class="state">正在加载对话…</div>
    <div v-else-if="!sortedSessions.length" class="state">还没有历史对话。</div>
    <section v-else class="conversation-list">
      <router-link v-for="session in sortedSessions" :key="session.id || session.session_id" :to="`/chat/${session.id || session.session_id}`" class="conversation-row">
        <span class="conversation-mark">{{ session.pinned ? '◆' : '◇' }}</span><span class="conversation-title">{{ session.title || '未命名对话' }}</span><time>{{ formatDate(session.updated_at || session.created_at) }}</time>
      </router-link>
    </section>
  </main>
</template>

<script setup>
import { computed, onMounted } from 'vue'; import { storeToRefs } from 'pinia'; import { useRouter } from 'vue-router'; import { useChatStore } from '@/stores/chat'
const router=useRouter(),chatStore=useChatStore(); const {sessions,loading}=storeToRefs(chatStore)
const sortedSessions=computed(()=>[...sessions.value].sort((a,b)=>Number(Boolean(b.pinned))-Number(Boolean(a.pinned))||new Date(b.updated_at||b.created_at||0)-new Date(a.updated_at||a.created_at||0)))
const newChat=()=>{chatStore.clearCurrentSession();router.push('/chat')}; const formatDate=(value)=>value?new Date(value).toLocaleDateString('zh-CN'):''
onMounted(()=>chatStore.loadSessions())
</script>

<style scoped>
.conversations-view{width:min(100% - 40px,900px);margin:0 auto;padding:48px 0 96px;color:var(--text-primary)}header{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:28px}.eyebrow{margin:0 0 6px;color:var(--primary-color);font-weight:650}h1{margin:0 0 8px;font-size:34px}header p:last-child{margin:0;color:var(--text-secondary)}header button{min-height:44px;padding:0 18px;border:0;border-radius:12px;background:var(--primary-color);color:white;font-weight:650;cursor:pointer}.conversation-list{border:1px solid var(--border-light);border-radius:18px;overflow:hidden;background:var(--bg-secondary)}.conversation-row{display:grid;grid-template-columns:24px minmax(0,1fr) auto;gap:12px;align-items:center;min-height:56px;padding:0 18px;border-bottom:1px solid var(--border-light);color:inherit;text-decoration:none}.conversation-row:last-child{border-bottom:0}.conversation-row:hover{background:var(--bg-tertiary)}.conversation-mark{color:var(--primary-color)}.conversation-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.conversation-row time{color:var(--text-secondary);font-size:13px}.state{padding:48px;text-align:center;color:var(--text-secondary)}@media(max-width:768px){.conversations-view{width:min(100% - 24px,900px);padding:24px 0 calc(92px + env(safe-area-inset-bottom))}header{align-items:start;flex-direction:column}header button{width:100%}.conversation-row{grid-template-columns:20px minmax(0,1fr);padding:8px 14px}.conversation-row time{grid-column:2}}
</style>

<template>
  <aside class="product-sidebar" :class="{ collapsed, open: isMobile && !collapsed }" aria-label="小乐导航">
    <div class="sidebar-brand">
      <button class="brand-button" type="button" @click="collapsed ? toggle() : goHome()" aria-label="小乐首页">
        <img :src="logoImage" alt="" /><span class="brand-copy"><strong>XiaoLe</strong><small>我的 AI 管家</small></span>
      </button>
      <button class="collapse-button" type="button" @click="toggle" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'">
        <svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M9 3v18"/></svg>
      </button>
    </div>

    <div class="sidebar-body">
      <button class="new-chat-button" data-testid="new-chat" type="button" @click="newChat">
        <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg><span>新对话</span>
      </button>

      <nav v-if="!isMobile" class="primary-navigation" aria-label="主要导航">
        <router-link v-for="item in primaryItems" :key="item.path" :to="item.path" class="primary-nav-item" data-testid="primary-nav-item">
          <span class="nav-icon" v-html="item.icon"></span><span>{{ item.label }}</span>
        </router-link>
      </nav>

      <section class="recent-section" aria-labelledby="recent-title">
        <div class="section-heading"><span id="recent-title">最近对话</span><span class="section-count">{{ recentSessions.length }}</span></div>
        <div v-if="loading && !recentSessions.length" class="sidebar-state">正在加载…</div>
        <div v-else-if="!recentSessions.length" class="sidebar-state">还没有对话</div>
        <div v-else class="recent-list">
          <div v-for="session in recentSessions" :key="session.id || session.session_id" class="recent-row" :class="{ active: isCurrent(session) }" data-testid="recent-conversation">
            <button class="recent-main" type="button" @click="loadSession(session)"><span class="pin" v-if="session.pinned">◆</span><span>{{ session.title || '未命名对话' }}</span></button>
            <button class="more-button" type="button" @click.stop="toggleMenu(session)" aria-label="会话操作">•••</button>
            <div v-if="activeMenuId === sessionId(session)" class="conversation-menu">
              <button type="button" @click="renameSession(session)">重命名</button>
              <button type="button" @click="shareSession(session)">分享</button>
              <button type="button" @click="pinSession(session)">{{ session.pinned ? '取消置顶' : '置顶' }}</button>
              <button type="button" class="danger" @click="requestDelete(session)">删除</button>
            </div>
          </div>
        </div>
        <router-link to="/conversations" class="view-all" data-testid="view-all-conversations" @click="closeMobile">查看全部 <span>→</span></router-link>
      </section>

      <nav v-if="isMobile" class="drawer-secondary" aria-label="更多导航">
        <router-link to="/settings" data-testid="settings-link" @click="closeMobile"><span>设置</span><span>→</span></router-link>
        <router-link to="/behavior" data-testid="advanced-link" @click="closeMobile"><span>高级与诊断</span><small>行为分析、工具等</small></router-link>
      </nav>
    </div>

    <footer v-if="!isMobile" class="sidebar-footer">
      <router-link to="/settings" data-testid="settings-link" class="account-link">
        <span class="avatar">{{ avatarLetter }}</span><span class="account-copy"><strong>{{ username }}</strong><small>账户与设置</small></span><span>•••</span>
      </router-link>
    </footer>
  </aside>
  <button v-if="isMobile && !collapsed" class="sidebar-overlay" type="button" aria-label="关闭菜单" @click="closeMobile"></button>

  <ConfirmDialog :visible="deleteDialog" title="删除对话" message="删除后，该对话将不可恢复。确认删除吗？" confirm-text="删除" cancel-text="取消" type="danger" @confirm="deleteSession" @cancel="cancelDelete" />
  <ShareDialog v-if="shareDialog" :title="shareTitle" :share-url="shareUrl" @close="shareDialog=false" />
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useChatStore } from '@/stores/chat'
import api from '@/services/api'
import logoImage from '@/assets/logo-xiaole.png'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import ShareDialog from '@/components/common/ShareDialog.vue'

const router = useRouter()
const route = useRoute()
const chatStore = useChatStore()
const { sessions, loading } = storeToRefs(chatStore)
const isMobile = ref(window.innerWidth <= 768)
const collapsed = ref(isMobile.value ? true : localStorage.getItem('sidebar-collapsed') === 'true')
const activeMenuId = ref(null)
const deleteDialog = ref(false)
const deletingSession = ref(null)
const shareDialog = ref(false)
const shareTitle = ref('分享对话')
const shareUrl = ref('')

const primaryItems = [
  { path: '/home', label: '首页', icon: '<svg viewBox="0 0 24 24"><path d="M3 11 12 3l9 8v9H5v-9Z"/></svg>' },
  { path: '/chat', label: '对话', icon: '<svg viewBox="0 0 24 24"><path d="M20 15a3 3 0 0 1-3 3H8l-5 3V6a3 3 0 0 1 3-3h11a3 3 0 0 1 3 3Z"/></svg>' },
  { path: '/knowledge', label: '知识', icon: '<svg viewBox="0 0 24 24"><path d="M4 5a3 3 0 0 1 3-3h5v18H7a3 3 0 0 0-3 2Zm16 0a3 3 0 0 0-3-3h-5v18h5a3 3 0 0 1 3 2Z"/></svg>' },
  { path: '/action', label: '行动', icon: '<svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/><path d="M21 12a9 9 0 1 1-5.3-8.2"/></svg>' }
]

const sessionId = (session) => String(session.id || session.session_id)
const sortedSessions = computed(() => [...sessions.value].sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)))
const recentSessions = computed(() => sortedSessions.value.slice(0, isMobile.value ? 5 : 6))
const username = computed(() => {
  try { return JSON.parse(localStorage.getItem('xiaole_settings') || '{}').nickname || JSON.parse(localStorage.getItem('user') || '{}').username || '我的 XiaoLe' } catch { return '我的 XiaoLe' }
})
const avatarLetter = computed(() => username.value.slice(0, 1).toUpperCase())
const isCurrent = (session) => String(route.params.sessionId || '') === sessionId(session)

const newChat = () => { chatStore.clearCurrentSession(); router.push('/chat'); closeMobile() }
const loadSession = (session) => { router.push(`/chat/${sessionId(session)}`); closeMobile() }
const goHome = () => router.push('/home')
const closeMobile = () => { if (isMobile.value) collapsed.value = true; activeMenuId.value = null }
const toggle = () => { collapsed.value = !collapsed.value; if (!isMobile.value) localStorage.setItem('sidebar-collapsed', String(collapsed.value)) }
const toggleMenu = (session) => { const id = sessionId(session); activeMenuId.value = activeMenuId.value === id ? null : id }
const renameSession = async (session) => { activeMenuId.value = null; const title = window.prompt('重命名对话', session.title || '')?.trim(); if (!title || title === session.title) return; await api.updateSession(sessionId(session), { title }); session.title = title }
const shareSession = (session) => { activeMenuId.value = null; shareTitle.value = session.title || '分享对话'; shareUrl.value = `${window.location.origin}/share/${sessionId(session)}`; shareDialog.value = true }
const pinSession = async (session) => { activeMenuId.value = null; await api.updateSession(sessionId(session), { pinned: !session.pinned }); session.pinned = !session.pinned }
const requestDelete = (session) => { activeMenuId.value = null; deletingSession.value = session; deleteDialog.value = true }
const cancelDelete = () => { deletingSession.value = null; deleteDialog.value = false }
const deleteSession = async () => { const session = deletingSession.value; cancelDelete(); if (!session) return; await api.deleteSession(sessionId(session)); const index = sessions.value.findIndex((item) => sessionId(item) === sessionId(session)); if (index >= 0) sessions.value.splice(index, 1); if (isCurrent(session)) router.push('/chat') }

const onResize = () => { const mobile = window.innerWidth <= 768; if (mobile !== isMobile.value) { isMobile.value = mobile; collapsed.value = mobile ? true : localStorage.getItem('sidebar-collapsed') === 'true' } }
const onDocumentClick = (event) => { if (!event.target.closest('.recent-row')) activeMenuId.value = null }
onMounted(() => { chatStore.loadSessions(); window.addEventListener('resize', onResize); document.addEventListener('click', onDocumentClick) })
onBeforeUnmount(() => { window.removeEventListener('resize', onResize); document.removeEventListener('click', onDocumentClick) })
defineExpose({ toggle })
</script>

<style scoped>
.product-sidebar{position:relative;z-index:900;display:flex;flex:0 0 248px;width:248px;min-width:248px;height:100dvh;min-height:0;flex-direction:column;border-right:1px solid var(--border-light);background:var(--bg-primary);color:var(--text-primary);overflow:visible;transition:width .18s ease,min-width .18s ease,transform .18s ease}.product-sidebar.collapsed:not(.open){width:72px;min-width:72px;flex-basis:72px}.sidebar-brand{display:flex;align-items:center;gap:8px;min-height:64px;padding:8px 12px}.brand-button{display:flex;min-width:0;flex:1;align-items:center;gap:10px;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.brand-button img{width:34px;height:34px;border-radius:10px}.brand-copy,.account-copy{display:flex;min-width:0;flex-direction:column}.brand-copy strong{font-size:15px}.brand-copy small,.account-copy small{color:var(--text-secondary);font-size:11px}.collapse-button{display:grid;width:36px;height:36px;place-items:center;border:0;border-radius:10px;background:transparent;color:var(--text-secondary);cursor:pointer}.collapse-button:hover{background:var(--bg-secondary)}.collapse-button svg,.new-chat-button svg{width:19px;height:19px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.sidebar-body{display:flex;min-height:0;flex:1;flex-direction:column;padding:0 10px 12px;overflow:hidden}.new-chat-button{display:flex;min-height:46px;align-items:center;justify-content:center;gap:9px;border:0;border-radius:13px;background:var(--primary-color);color:white;font-weight:650;cursor:pointer}.primary-navigation{display:flex;flex-direction:column;gap:3px;margin-top:14px;padding-bottom:14px;border-bottom:1px solid var(--border-light)}.primary-nav-item{display:flex;min-height:44px;align-items:center;gap:11px;padding:0 12px;border-radius:12px;color:var(--text-secondary);text-decoration:none}.primary-nav-item:hover,.primary-nav-item.router-link-active{background:var(--bg-secondary);color:var(--text-primary)}.nav-icon{width:20px;height:20px}.nav-icon :deep(svg){width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}.recent-section{display:flex;min-height:0;flex:1;flex-direction:column;padding-top:16px}.section-heading{display:flex;align-items:center;justify-content:space-between;padding:0 10px 8px;color:var(--text-secondary);font-size:12px;font-weight:650}.section-count{font-weight:500}.recent-list{display:flex;min-height:0;flex-direction:column;gap:2px}.recent-row{position:relative;display:flex;min-width:0;min-height:40px;align-items:center;border-radius:10px}.recent-row:hover,.recent-row.active{background:var(--bg-secondary)}.recent-main{display:flex;min-width:0;flex:1;align-items:center;gap:6px;overflow:hidden;border:0;background:transparent;color:inherit;text-align:left;cursor:pointer}.recent-main span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.pin{color:var(--primary-color);font-size:9px}.more-button{width:34px;min-height:36px;border:0;background:transparent;color:var(--text-secondary);cursor:pointer;opacity:0}.recent-row:hover .more-button,.recent-row.active .more-button{opacity:1}.conversation-menu{position:absolute;z-index:20;top:34px;right:4px;display:flex;width:128px;flex-direction:column;padding:5px;border:1px solid var(--border-light);border-radius:12px;background:var(--bg-primary);box-shadow:var(--shadow-lg)}.conversation-menu button{min-height:36px;border:0;border-radius:8px;background:transparent;color:var(--text-primary);text-align:left;cursor:pointer}.conversation-menu button:hover{background:var(--bg-secondary)}.conversation-menu .danger{color:#dc6060}.view-all{display:flex;min-height:42px;align-items:center;justify-content:space-between;margin-top:6px;padding:0 10px;border-radius:10px;color:var(--text-secondary);font-size:13px;text-decoration:none}.view-all:hover{background:var(--bg-secondary);color:var(--text-primary)}.sidebar-state{padding:18px 10px;color:var(--text-secondary);font-size:13px}.sidebar-footer{padding:10px;border-top:1px solid var(--border-light);padding-bottom:max(10px,env(safe-area-inset-bottom))}.account-link{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;min-height:48px;align-items:center;padding:4px 8px;border-radius:12px;color:inherit;text-decoration:none}.account-link:hover{background:var(--bg-secondary)}.avatar{display:grid;width:34px;height:34px;place-items:center;border-radius:50%;background:var(--bg-tertiary);color:var(--primary-color);font-weight:700}.account-copy strong{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:13px}.drawer-secondary{display:flex;flex-direction:column;gap:4px;padding-top:10px;border-top:1px solid var(--border-light)}.drawer-secondary a{display:flex;min-height:48px;align-items:center;justify-content:space-between;padding:0 10px;border-radius:10px;color:var(--text-primary);text-decoration:none}.drawer-secondary a:hover{background:var(--bg-secondary)}.drawer-secondary small{color:var(--text-secondary);font-size:11px}.sidebar-overlay{display:none}
.sidebar-footer{flex:0 0 auto;overflow:visible}
@media(max-width:768px){.product-sidebar{position:fixed;top:0;bottom:0;left:0;width:min(86vw,320px);min-width:0;max-width:320px;height:100dvh;padding-bottom:env(safe-area-inset-bottom);box-shadow:var(--shadow-lg);transform:translateX(0)}.product-sidebar.collapsed:not(.open){width:min(86vw,320px);min-width:0;transform:translateX(-110%);box-shadow:none}.sidebar-brand{min-height:60px}.collapse-button{min-width:44px;min-height:44px}.sidebar-body{padding:0 12px 12px}.new-chat-button{min-height:48px}.recent-section{padding-top:18px}.recent-row{min-height:44px}.more-button{min-width:44px;min-height:44px;opacity:1}.view-all{min-height:48px}.sidebar-overlay{position:fixed;z-index:880;inset:0;display:block;border:0;background:rgba(15,23,42,.32);backdrop-filter:blur(2px)}}
</style>

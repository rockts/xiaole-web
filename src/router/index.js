import { createRouter, createWebHistory } from 'vue-router'
// 为避免动态导入偶发失败，关键页面改为静态导入
import ChatView from '@/views/ChatView.vue'
import MemoryView from '@/views/MemoryView.vue'
import BehaviorView from '@/views/BehaviorView.vue'
import TasksView from '@/views/TasksView.vue'
import TaskDetailView from '@/views/TaskDetailView.vue'
import DocumentsView from '@/views/DocumentsView.vue'
import ToolsView from '@/views/ToolsView.vue'
import HomeView from '@/views/HomeView.vue'
import { useAuthStore } from '@/stores/auth'

const router = createRouter({
    history: createWebHistory(),
    routes: [
        {
            path: '/login',
            name: 'Login',
            component: () => import('@/views/LoginView.vue'),
            meta: { title: '登录' }
        },
        {
            path: '/',
            redirect: '/chat'
        },
        {
            path: '/home', name: 'Home', component: HomeView, meta: { title: '首页' }
        },
        {
            path: '/chat/:sessionId?',
            name: 'Chat',
            component: ChatView,
            meta: { title: '对话' }
        },
        {
            path: '/share/:id',
            name: 'Share',
            component: () => import('@/views/ShareView.vue'),
            meta: { title: '分享' }
        },
        {
            path: '/memory',
            name: 'Memory',
            component: MemoryView,
            meta: { title: '记忆' }
        },
        {
            path: '/behavior',
            name: 'Behavior',
            component: BehaviorView,
            meta: { title: '行为分析' }
        },
        {
            path: '/tasks',
            name: 'Tasks',
            component: TasksView,
            meta: { title: '任务' }
        },
        {
            path: '/task/:id',
            name: 'TaskDetail',
            component: TaskDetailView,
            meta: { title: '任务详情' }
        },
        {
            path: '/documents',
            name: 'Documents',
            component: DocumentsView,
            meta: { title: '文档' }
        },
        {
            path: '/documents/:id',
            name: 'DocumentDetail',
            component: () => import('@/views/DocumentDetailView.vue'),
            meta: { title: '文档详情' }
        },
        {
            path: '/tools',
            name: 'Tools',
            component: ToolsView,
            meta: { title: '工具' }
        },
        {
            path: '/settings',
            name: 'Settings',
            component: () => import('@/views/SettingsView.vue'),
            meta: { title: '设置' }
        }
    ]
})

router.beforeEach((to, from, next) => {
    document.title = to.meta.title ? `${to.meta.title} - 小乐 AI 管家` : '小乐 AI 管家'

    const authStore = useAuthStore()
    if (to.name !== 'Login' && !authStore.isAuthenticated) {
        next({ name: 'Login' })
    } else if (to.name === 'Login' && authStore.isAuthenticated) {
        next({ name: 'Chat' })
    } else {
        next()
    }
})

export default router

// 路由错误日志，定位动态导入或导航失败
router.onError((err, to) => {
    // 一些浏览器可能静默失败，这里强制输出
    console.error('🚨 Router Error:', err);
    if (to) {
        console.error('📍 Navigating to:', to.fullPath || to.path);
    }
});

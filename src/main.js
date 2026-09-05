import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/styles/main.css'
import 'highlight.js/styles/github-dark.css'
import { API_BASE_URL } from './config/apiBase'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { migrateLegacyChatMode } from './chat/chatSettingsMigration'
import { initializeTheme } from './theme/themeAuthority'
// import { healthCheck } from './utils/healthCheck' // 已禁用: WebSocket 已监控连接

// 🔧 尽早设置移动端视口高度，解决 100vh 在真机上的问题
(function setViewportHeight() {
  const vh = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-vh', `${vh}px`);
  // 监听视口变化
  const update = () => {
    const newVh = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty('--app-vh', `${newVh}px`);
  };
  window.addEventListener('resize', update);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', update);
  }
})();

// 控制台调试提示
console.log(
  '%c小乐 AI 管家 %cv0.9.1',
  'color: #667eea; font-size: 20px; font-weight: bold;',
  'color: #999; font-size: 14px;'
);
console.log(
  '%c💡 调试快捷键: Ctrl+Shift+D 清除认证信息',
  'color: #10b981; font-size: 12px;'
);

migrateLegacyChatMode()
initializeTheme()

const app = createApp(App)
const pinia = createPinia()

// 全局错误处理
app.config.errorHandler = (err, instance, info) => {
  // 过滤掉访问 undefined 属性的错误(已通过 ?. 修复)
  if (err.message && err.message.includes('Cannot read properties of undefined')) {
    console.debug('🔧 数据未就绪:', err.message);
    return; // 静默处理
  }

  console.error('❌ Vue Error:', err);
  console.error('📍 Error Info:', info);
  console.error('🔍 Component:', instance);

  // 如果是路由加载错误,尝试重新加载
  if (err.message && err.message.includes('Failed to fetch dynamically imported module')) {
    console.warn('⚠️ 动态导入失败,3秒后重新加载页面...');
    setTimeout(() => {
      window.location.reload();
    }, 3000);
  }
};

app.use(pinia)
app.use(router)
app.mount('#app')

// 已禁用后端健康检查 - WebSocket 已提供实时连接监控
// healthCheck.start()

// 应用卸载时停止检查
// window.addEventListener('beforeunload', () => {
//   healthCheck.stop()
// })

// 捕获未处理错误，避免静默卡住
window.addEventListener('error', (event) => {
  console.error('🌐 Window Error:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🌐 Unhandled Promise Rejection:', event.reason);
});

console.log('✅ App mounted and global error hooks installed')

if (import.meta.env.PROD) {
  registerServiceWorker().catch((error) => {
    console.error('❌ SW registration failed:', error)
  })
}

// 验证已有登录状态时始终使用统一 API base，避免请求落到前端域名。
const storedToken = localStorage.getItem('token')
if (storedToken) {
  fetch(`${API_BASE_URL}/sessions`, {
    headers: { Authorization: `Bearer ${storedToken}` }
  }).then((response) => {
    if (response.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }
  }).catch((error) => {
    console.warn('⚠️ Token validation failed:', error.message)
  })
}

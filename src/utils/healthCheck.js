/**
 * 后端健康检查和自动重连
 */
import { API_BASE_URL } from '@/config/apiBase'

let checkInterval = null
let isChecking = false
const CHECK_INTERVAL = 30000 // 30秒检查一次
const listeners = new Set()

export const healthCheck = {
  /**
   * 开始健康检查
   */
  start() {
    if (checkInterval) return

    console.log('🔍 启动后端健康检查...')

    // 立即检查一次
    this.check()

    // 定期检查
    checkInterval = setInterval(() => {
      this.check()
    }, CHECK_INTERVAL)
  },

  /**
   * 停止健康检查
   */
  stop() {
    if (checkInterval) {
      clearInterval(checkInterval)
      checkInterval = null
      console.log('⏹️ 停止后端健康检查')
    }
  },

  /**
   * 执行一次健康检查
   */
  async check() {
    if (isChecking) return
    isChecking = true

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 8000) // 增加超时时间到8秒

      // 使用简单的 API 端点进行健康检查
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      })

      clearTimeout(timeoutId)

      if (response.ok) {
        this.notifyListeners('online')
      } else {
        this.notifyListeners('offline')
      }
    } catch (error) {
      // 不要输出错误日志,避免控制台污染
      if (error.name !== 'AbortError') {
        console.debug('后端连接检查:', error.message)
      }
      this.notifyListeners('offline')
    } finally {
      isChecking = false
    }
  },

  /**
   * 添加状态监听器
   * @param {Function} callback - 回调函数，参数为状态 'online' | 'offline'
   */
  addListener(callback) {
    listeners.add(callback)
  },

  /**
   * 移除状态监听器
   */
  removeListener(callback) {
    listeners.delete(callback)
  },

  /**
   * 通知所有监听器
   */
  notifyListeners(status) {
    listeners.forEach(callback => {
      try {
        callback(status)
      } catch (error) {
        console.error('健康检查监听器错误:', error)
      }
    })
  }
}

// 页面可见时自动恢复检查
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && checkInterval) {
    healthCheck.check()
  }
})

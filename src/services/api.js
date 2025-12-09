import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

// API基础URL配置
// 优先使用环境变量，否则使用空字符串（通过vite代理访问）
const API_BASE_URL = import.meta.env.VITE_API_BASE || ''

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json'
    }
})

// 自动重试配置
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 毫秒

// 请求拦截器
api.interceptors.request.use(
    config => {
        // 注入 Token
        const authStore = useAuthStore()
        if (authStore.token) {
            config.headers.Authorization = `Bearer ${authStore.token}`
        }

        // 如果请求数据是 FormData，删除默认的 Content-Type
        // 让浏览器自动设置正确的 Content-Type（包含 boundary）
        if (config.data instanceof FormData) {
            delete config.headers['Content-Type']
        }

        // 初始化重试计数
        config.retryCount = config.retryCount || 0
        return config
    },
    error => {
        return Promise.reject(error)
    }
)

// 响应拦截器 - 添加自动重试逻辑
api.interceptors.response.use(
    response => response.data,
    async error => {
        const config = error.config

        // 处理 401 未授权
        if (error.response && error.response.status === 401) {
            const authStore = useAuthStore()
            authStore.logout()
            // 可以在这里触发重定向，或者由路由守卫处理
            if (window.location.pathname !== '/login') {
                window.location.href = '/login'
            }
            return Promise.reject(error)
        }

        // 处理 404 错误 - 改进错误信息格式
        if (error.response && error.response.status === 404) {
            const url = error.config?.url || ''
            // 格式化错误信息，避免直接显示 JSON
            let errorMessage = '资源未找到'
            if (error.response.data) {
                if (typeof error.response.data === 'string') {
                    errorMessage = error.response.data
                } else if (error.response.data.detail) {
                    errorMessage = error.response.data.detail
                } else if (typeof error.response.data === 'object') {
                    // 如果是对象，转换为友好的错误信息
                    errorMessage = error.response.data.message || error.response.data.error || '资源未找到'
                }
            }
            error.message = `404: ${errorMessage}`
            error.formattedMessage = errorMessage
            // 对于会话相关的 404，静默处理（可能是后端未启动）
            if (url.includes('/session') || url.includes('/sessions')) {
                console.warn('API 404 (会话相关，可能是后端未启动):', url)
            } else {
                console.warn('API 404:', url, errorMessage)
            }
        }

        // 如果没有配置或已达到最大重试次数，直接拒绝
        if (!config || config.retryCount >= MAX_RETRIES) {
            console.error('API Error (final):', error.message)
            return Promise.reject(error)
        }

        // 只对网络错误或 5xx 错误重试
        const shouldRetry =
            !error.response || // 网络错误（后端未响应）
            (error.response.status >= 500 && error.response.status < 600) // 服务器错误

        if (!shouldRetry) {
            console.error('API Error:', error.message)
            return Promise.reject(error)
        }

        // 增加重试计数
        config.retryCount += 1
        const delay = RETRY_DELAY * config.retryCount

        console.warn(`API 请求失败，${delay}ms 后进行第 ${config.retryCount} 次重试...`)

        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay))
        return api(config)
    }
)

export default {
    // 会话相关
    getSessions() {
        return api.get('/sessions', { params: { all_sessions: true, _t: Date.now() } })
    },

    getSession(sessionId, limit = 200) {
        return api.get(`/session/${sessionId}`, { params: { limit, _t: Date.now() } })
    },

    deleteSession(sessionId) {
        return api.delete(`/chat/sessions/${sessionId}`)
    },

    updateSession(sessionId, data) {
        return api.patch(`/chat/sessions/${sessionId}`, data)
    },

    deleteMessage(messageId) {
        return api.delete(`/messages/${messageId}`)
    },

    sendMessage(data) {
        // 基本参数使用查询参数
        const params = new URLSearchParams()
        params.append('prompt', data.prompt || '')
        if (data.session_id) params.append('session_id', data.session_id)
        if (data.user_id) params.append('user_id', data.user_id)
        if (data.response_style) params.append('response_style', data.response_style)

        // 图片路径通过body传输(避免URL长度限制)
        const body = data.image_path ? { image_path: data.image_path } : null

        // 增加超时时间到 120 秒，并禁用自动重试
        // 使用 /api/chat 避免与前端路由 /chat/xxx 冲突
        return api.post(`/api/chat?${params.toString()}`, body, {
            timeout: 120000,
            retryCount: MAX_RETRIES
        })
    },

    // 流式聊天（SSE 兼容，切片流）
    async streamChat(data, { onStart, onDelta, onEnd, signal } = {}) {
        // 使用 fetch 以支持 ReadableStream
        const params = new URLSearchParams()
        params.append('prompt', data.prompt || '')
        if (data.session_id) params.append('session_id', data.session_id)
        if (data.user_id) params.append('user_id', data.user_id)
        if (data.response_style) params.append('response_style', data.response_style)

        const authStore = useAuthStore()
        const headers = {
            'Accept': 'text/event-stream',
            'Content-Type': 'application/json'
        }
        if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`

        // 图片路径通过body传输
        const body = data.image_path ? JSON.stringify({ image_path: data.image_path }) : null

        const url = `${API_BASE_URL}/chat/stream?${params.toString()}`
        const res = await fetch(url, { method: 'POST', headers, body, signal })
        if (!res.ok || !res.body) {
            const text = await res.text().catch(() => '')
            throw new Error(text || `HTTP ${res.status}`)
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder('utf-8')
        let buffer = ''

        // 先通知开始
        if (typeof onStart === 'function') onStart()

        try {
            while (true) {
                const { value, done } = await reader.read()
                if (done) break
                buffer += decoder.decode(value, { stream: true })

                // SSE 按空行分隔事件
                let idx
                while ((idx = buffer.indexOf('\n\n')) !== -1) {
                    const raw = buffer.slice(0, idx).trim()
                    buffer = buffer.slice(idx + 2)
                    if (!raw) continue
                    // 仅处理以 data: 开头的行
                    const lines = raw.split('\n')
                    for (const line of lines) {
                        const prefix = 'data: '
                        if (line.startsWith(prefix)) {
                            try {
                                const payload = JSON.parse(line.slice(prefix.length))
                                if (payload.type === 'delta' && typeof onDelta === 'function') {
                                    onDelta(payload.data || '')
                                } else if (payload.type === 'start') {
                                    if (typeof onStart === 'function') onStart(payload)
                                } else if (payload.type === 'end') {
                                    if (typeof onEnd === 'function') onEnd(payload)
                                }
                            } catch (_) {
                                // 忽略解析错误
                            }
                        }
                    }
                }
            }
            // 处理残留缓冲
            const rest = buffer.trim()
            if (rest) {
                const lines = rest.split('\n')
                for (const line of lines) {
                    const prefix = 'data: '
                    if (line.startsWith(prefix)) {
                        try {
                            const payload = JSON.parse(line.slice(prefix.length))
                            if (payload.type === 'delta' && typeof onDelta === 'function') {
                                onDelta(payload.data || '')
                            } else if (payload.type === 'end') {
                                if (typeof onEnd === 'function') onEnd(payload)
                            }
                        } catch (_) { }
                    }
                }
            }
        } finally {
            try { reader.releaseLock() } catch (_) { }
        }
    },

    uploadImage(formData) {
        return api.post('/vision/upload', formData)
    },

    // 记忆相关
    getMemoryStats() {
        return api.get('/memory/stats')
    },

    getRecentMemories(hours = 24, limit = 20, tag = null) {
        const params = { hours, limit }
        if (tag) params.tag = tag
        return api.get('/memory/recent', { params })
    },

    searchMemories(keywords) {
        // ...existing code...
        return api.get('/memory/search', { params: { keywords } })
    },

    semanticSearch(query) {
        return api.get('/memory/semantic', { params: { query } })
    },

    deleteMemory(memoryId) {
        return api.delete(`/memory/${memoryId}`)
    },

    updateMemory(memoryId, data) {
        return api.put(`/memory/${memoryId}`, data)
    },

    // 任务相关
    getTasks(status = '', limit = 50) {
        const params = { limit };
        if (status) params.status = status;
        return api.get('/tasks', { params });
    },

    getTask(taskId) {
        return api.get(`/tasks/${taskId}`)
    },

    createTask(data) {
        return api.post('/tasks', data)
    },

    updateTask(taskId, data) {
        return api.put(`/tasks/${taskId}`, data)
    },

    deleteTask(taskId) {
        return api.delete(`/tasks/${taskId}`)
    },

    // 提醒相关
    getReminders(enabledOnly = false) {
        return api.get('/reminders', { params: { enabled_only: enabledOnly } })
    },

    createReminder(data) {
        return api.post('/reminders', data)
    },

    updateReminder(reminderId, data) {
        return api.put(`/reminders/${reminderId}`, data)
    },

    deleteReminder(reminderId) {
        return api.delete(`/reminders/${reminderId}`)
    },

    confirmReminder(reminderId) {
        return api.post(`/reminders/${reminderId}/confirm`)
    },

    snoozeReminder(reminderId, minutes = 5) {
        return api.post(`/reminders/${reminderId}/snooze`, null, { params: { minutes } })
    },

    // 行为分析相关
    getBehaviorAnalytics(days = 30) {
        return api.get('/analytics/behavior', { params: { days } })
    },

    // 文档相关
    getDocuments(limit = 50) {
        // 从auth store获取登录用户名,如果没有使用admin
        const authStore = useAuthStore();
        const username = authStore.user?.username || 'admin';
        return api.get(`/documents/users/${username}`, { params: { limit } })
    },

    getDocument(docId) {
        return api.get(`/documents/${docId}`)
    },

    uploadDocument(formData) {
        return api.post('/documents/upload', formData)
    },

    deleteDocument(docId) {
        return api.delete(`/documents/${docId}`)
    },

    // 工具相关
    getTools(enabledOnly = true) {
        return api.get('/tools/list', { params: { enabled_only: enabledOnly } })
    },

    getToolHistory(userId = 'default_user', limit = 20) {
        return api.get('/tools/history', { params: { user_id: userId, limit } })
    },

    // 反馈相关
    submitFeedback(data) {
        return api.post('/feedback', data)
    },

    getFeedbackStats() {
        return api.get('/feedback/stats')
    },

    // 语音合成
    synthesizeVoice(text, options = {}) {
        return api.post('/voice/synthesize', {
            text,
            person: options.person !== undefined ? options.person : 0,
            speed: options.speed !== undefined ? options.speed : 5,
            pitch: options.pitch !== undefined ? options.pitch : 5,
            volume: options.volume !== undefined ? options.volume : 5,
            audio_format: options.audio_format || 'mp3'
        })
    },

    // 语音识别（上传音频文件：wav/pcm/m4a/amr）
    recognizeVoice(fileOrBlob, filename = 'voice.wav') {
        const formData = new FormData()
        const file = fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], filename, { type: 'audio/wav' })
        formData.append('file', file)
        return api.post('/voice/recognize', formData, {
            timeout: 60000
        })
    }
}

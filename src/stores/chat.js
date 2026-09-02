import { defineStore } from 'pinia'
import { ref, nextTick } from 'vue'
import api from '@/services/api'
import { createChatTransport } from '@/chat/transports'
import { API_BASE_URL } from '@/config/apiBase'

export const useChatStore = defineStore('chat', () => {
    const sessions = ref([])
    const messages = ref([])
    const sessionInfo = ref(null)
    const currentSessionId = ref(null)
    const isTyping = ref(false)
    const loading = ref(false)

    // 加载会话列表（一次性加载全部，前端分页显示）
    const loadSessions = async () => {
        try {
            loading.value = true
            const data = await api.getSessions(true)
            // 将 session_id 映射为 id，保持字段一致性
            sessions.value = (data.sessions || []).map(s => ({
                ...s,
                id: s.session_id || s.id
            }))
            console.log('✅ Sessions loaded:', sessions.value.length)
        } catch (error) {
            console.error('Failed to load sessions:', error)
        } finally {
            loading.value = false
        }
    }

    const loadSession = async (sessionId) => {
        try {
            console.log('🔄 Loading session:', sessionId)
            // 请求更多历史记录，防止长对话被截断
            const data = await api.getSession(sessionId, 500)
            console.log('📦 Session data received:', data)
            console.log('💬 Messages:', data.messages || data.history || [])

            // 确保数据格式正确
            if (!data) {
                throw new Error('会话数据为空')
            }

            sessionInfo.value = {
                id: sessionId,
                title: data.title || '未命名对话'
            }
            const loadedMessages = data.messages || data.history || []
            messages.value = loadedMessages.map(msg => {
                // 确保图片路径正确格式化
                const processedMsg = {
                    ...msg,
                    status: 'done'
                }
                // 如果消息有图片路径，确保格式正确
                if (processedMsg.image_path) {
                    // 规范化图片路径（确保以 / 开头）
                    if (!processedMsg.image_path.startsWith('http') &&
                        !processedMsg.image_path.startsWith('data:') &&
                        !processedMsg.image_path.startsWith('blob:') &&
                        !processedMsg.image_path.startsWith('/')) {
                        processedMsg.image_path = '/' + processedMsg.image_path
                    }
                }
                return processedMsg
            })
            currentSessionId.value = sessionId
            console.log('✅ Session loaded, messages count:', messages.value.length)
        } catch (error) {
            console.error('❌ Failed to load session:', error)
            // 如果是 404，清空会话数据，避免显示错误
            if (error.response?.status === 404) {
                console.warn('会话不存在或已删除，清空当前会话')
                messages.value = []
                sessionInfo.value = null
                currentSessionId.value = null
            } else {
                // 对于其他错误，重新抛出以便外部处理
                throw error
            }
        }
    }

    const typingTimer = ref(null)
    const activeTypingMessageId = ref(null)
    const activeStreamAbort = ref(null)
    const sendMessage = async (content, imagePath = null, router = null, options = {}) => {
        try {
            const instant = !!options.instant // 语音模式：立即展示，不走打字动画
            const responseStyle = options.responseStyle || 'balanced'

            // ChatView.vue 已立即插入用户消息，这里不再重复插入
            isTyping.value = !instant

            // 🔧 复用已存在的 thinking 占位消息（由 ChatView 提前添加）
            let existingThinkingIndex = -1
            for (let i = messages.value.length - 1; i >= 0; i--) {
                if (messages.value[i].role === 'assistant' && messages.value[i].status === 'thinking') {
                    existingThinkingIndex = i
                    break
                }
            }

            let placeholderId
            if (existingThinkingIndex !== -1) {
                // 复用已存在的 thinking 消息
                placeholderId = messages.value[existingThinkingIndex].id
                console.log('💭 Reusing existing thinking message:', placeholderId)
                // 如果是语音模式，更新状态
                if (instant) {
                    messages.value[existingThinkingIndex].status = 'typing'
                    messages.value[existingThinkingIndex].content = '…'
                }
            } else {
                // 如果不存在，创建新的
                placeholderId = Date.now() + 1
                const initialStatus = instant ? 'typing' : 'thinking'
                console.log('💭 Created new thinking message:', placeholderId, 'status:', initialStatus)
                messages.value.push({
                    id: placeholderId,
                    role: 'assistant',
                    content: instant ? '…' : '',
                    status: initialStatus,
                    thinkingStartedAt: instant ? null : Date.now()
                })
            }
            activeTypingMessageId.value = placeholderId

            const response = await api.sendMessage({
                user_id: 'default_user',
                session_id: currentSessionId.value || '',
                prompt: content,
                image_path: imagePath,
                response_style: responseStyle
            })

            // 更新 session 信息
            if (response.session_id) {
                const isNewSession = !currentSessionId.value
                currentSessionId.value = response.session_id
                if (isNewSession) {
                    sessionInfo.value = {
                        id: response.session_id,
                        title: content.substring(0, 30) + (content.length > 30 ? '...' : '')
                    }
                    if (router) router.push(`/chat/${response.session_id}`)
                }
            }

            // 获取最终文本
            const full = response.reply || response.response || ''
            const msgIndex = messages.value.findIndex(m => m.id === placeholderId)

            // 同步最新的消息ID
            if (msgIndex !== -1) {
                // 1. 更新 AI 回复的消息 ID
                if (response.assistant_message_id) {
                    messages.value[msgIndex].id = response.assistant_message_id
                }

                // 2. 更新用户消息的 ID 和 image_path
                if (response.user_message_id) {
                    // 向前查找最近的一条临时ID的用户消息
                    for (let i = msgIndex - 1; i >= 0; i--) {
                        const msg = messages.value[i]
                        if (msg.role === 'user' && String(msg.id).startsWith('temp-')) {
                            console.log('✅ Syncing user message ID:', msg.id, '->', response.user_message_id)
                            messages.value[i].id = response.user_message_id
                            // 同步服务器图片路径,替换本地blob URL
                            if (imagePath) {
                                console.log('🖼️ Syncing user message image_path:', imagePath)
                                messages.value[i].image_path = imagePath
                            }
                            break
                        }
                    }
                }
            }

            if (msgIndex !== -1) {
                messages.value[msgIndex].fullContent = full
                if (instant) {
                    messages.value[msgIndex].content = full
                    messages.value[msgIndex].status = 'done'
                    delete messages.value[msgIndex].thinkingStartedAt
                    isTyping.value = false
                    // 语音模式：派发事件供 ChatView 触发TTS朗读
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('voiceAssistantReply', {
                            detail: { text: full }
                        }))
                    }
                } else {
                    // 让思考阶段自然呈现：动态计算最少展示时间，兼顾真实耗时
                    console.log('💭 收到响应，当前status:', messages.value[msgIndex]?.status)
                    const thinkingStartedAt = messages.value[msgIndex].thinkingStartedAt || Date.now()
                    const baseThinking = 350
                    const perCharMs = 4
                    const maxThinking = 2000
                    const adaptiveThinking = Math.min(
                        maxThinking,
                        baseThinking + Math.min(full.length, 400) * perCharMs
                    )

                    const startTyping = () => {
                        console.log('⌨️ 开始打字动画')
                        messages.value[msgIndex].status = 'typing'
                        messages.value[msgIndex].content = ''

                        let i = 0
                        const step = Math.max(1, Math.round(full.length / 60)) // 约1秒60步
                        typingTimer.value = setInterval(() => {
                            if (i >= full.length) {
                                clearInterval(typingTimer.value)
                                typingTimer.value = null
                                messages.value[msgIndex].content = full
                                messages.value[msgIndex].status = 'done'
                                delete messages.value[msgIndex].thinkingStartedAt
                                delete messages.value[msgIndex].thinkingStartedAt
                                isTyping.value = false
                                return
                            }
                            messages.value[msgIndex].content = full.slice(0, i)
                            i += step
                        }, 16) // ~60fps
                    }

                    const elapsed = Date.now() - thinkingStartedAt
                    const remainingTime = Math.max(0, adaptiveThinking - elapsed)

                    setTimeout(startTyping, remainingTime)
                }

                // 保存搜索结果
                if (response.search_results) {
                    messages.value[msgIndex].search_results = response.search_results
                }
            }

            await loadSessions(true) // 强制刷新会话列表
            console.log('✅ Sessions refreshed after message sent')
        } catch (error) {
            console.error('Failed to send message:', error)
            console.error('错误详情:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                config: error.config
            })
            // 错误时撤销占位或显示错误
            if (activeTypingMessageId.value) {
                const msgIndex = messages.value.findIndex(m => m.id === activeTypingMessageId.value)
                if (msgIndex !== -1) {
                    messages.value[msgIndex].status = 'done'
                    delete messages.value[msgIndex].thinkingStartedAt
                    // 格式化错误信息，避免直接显示 JSON 对象
                    let errorMsg = '出错了，请稍后重试。'
                    if (error.response?.status === 500) {
                        errorMsg = '服务器内部错误（500）。可能原因：\n1. 后端服务异常\n2. 图片路径格式不正确\n3. 请求参数有误\n\n请检查浏览器控制台的详细错误信息，或联系管理员。'
                    } else if (error.response?.data) {
                        if (typeof error.response.data === 'string') {
                            errorMsg = error.response.data
                        } else if (error.response.data.detail) {
                            errorMsg = error.response.data.detail
                        } else if (error.response.data.message) {
                            errorMsg = error.response.data.message
                        } else if (error.formattedMessage) {
                            errorMsg = error.formattedMessage
                        }
                    } else if (error.message) {
                        errorMsg = error.message
                    }
                    messages.value[msgIndex].content = `⚠️ ${errorMsg}`
                }
            }
        } finally {
            // 如果仍在打字由定时器结束时处理 isTyping
            if (!typingTimer.value) {
                isTyping.value = false
            }
        }
    }

    // 流式发送消息（SSE 切片流）
    const sendUnifiedMessage = async (content, imagePath = null, router = null, options = {}) => {
        const responseStyle = options.responseStyle || 'balanced'

        try {
            isTyping.value = true

            // 🔧 复用已存在的 thinking 占位消息（由 ChatView 提前添加）
            // 查找最后一条 status='thinking' 的 assistant 消息
            let existingThinkingIndex = -1
            for (let i = messages.value.length - 1; i >= 0; i--) {
                if (messages.value[i].role === 'assistant' && messages.value[i].status === 'thinking') {
                    existingThinkingIndex = i
                    break
                }
            }

            let placeholderId
            if (existingThinkingIndex !== -1) {
                // 复用已存在的 thinking 消息
                placeholderId = messages.value[existingThinkingIndex].id
                console.log('💭 Reusing existing thinking message:', placeholderId)
            } else {
                // 如果不存在（例如从其他地方调用），创建新的
                placeholderId = Date.now() + 1
                const thinkingMsg = {
                    id: placeholderId,
                    role: 'assistant',
                    content: '',
                    status: 'thinking'
                }
                messages.value.push(thinkingMsg)
                console.log('💭 Created new thinking message:', placeholderId)
            }
            activeTypingMessageId.value = placeholderId

            // 构建中止控制器
            const controller = new AbortController()
            activeStreamAbort.value = controller

            // 首次 start 时切换为 typing
            let msgIndex = -1
            let accumulated = ''

            const onStart = () => {
                if (msgIndex === -1) {
                    msgIndex = messages.value.findIndex(m => m.id === placeholderId)
                }
                // 保持 thinking 状态，直到收到第一个字符 (onDelta) 再切换为 typing
                // 这样可以确保在连接建立但未生成内容时显示"思考中..."
            }

            const onDelta = (chunk) => {
                if (msgIndex === -1) {
                    msgIndex = messages.value.findIndex(m => m.id === placeholderId)
                }

                accumulated += chunk || ''

                // 收到有效内容时才切换为 typing
                if (msgIndex !== -1 && messages.value[msgIndex].status === 'thinking' && accumulated.trim().length > 0) {
                    messages.value[msgIndex].status = 'typing'
                }

                if (msgIndex !== -1) {
                    messages.value[msgIndex].content = accumulated
                }
            }

            const onEnd = async (payload) => {
                if (msgIndex === -1) {
                    msgIndex = messages.value.findIndex(m => m.id === placeholderId)
                }
                if (msgIndex !== -1) {
                    // 同步 ID
                    if (payload?.assistant_message_id) {
                        messages.value[msgIndex].id = payload.assistant_message_id
                    }
                    // 同步前一条用户消息 ID 和 image_path
                    if (payload?.user_message_id) {
                        for (let i = msgIndex - 1; i >= 0; i--) {
                            const msg = messages.value[i]
                            if (msg.role === 'user' && String(msg.id).startsWith('temp-')) {
                                console.log('✅ Syncing user message ID:', msg.id, '->', payload.user_message_id)
                                messages.value[i].id = payload.user_message_id
                                // 同步服务器图片路径,替换本地blob URL
                                if (payload?.image_path) {
                                    console.log('🖼️ Syncing user message image_path:', payload.image_path)
                                    messages.value[i].image_path = payload.image_path
                                }
                                break
                            }
                        }
                    }
                    messages.value[msgIndex].status = 'done'
                }

                // 更新会话并路由
                if (payload?.session_id) {
                    const isNew = !currentSessionId.value
                    currentSessionId.value = payload.session_id
                    if (isNew) {
                        sessionInfo.value = {
                            id: payload.session_id,
                            title: content.substring(0, 30) + (content.length > 30 ? '...' : '')
                        }
                        if (router) router.push(`/chat/${payload.session_id}`)
                    }
                }

                isTyping.value = false
                activeStreamAbort.value = null
                await loadSessions(true) // 强制刷新会话列表
                console.log('✅ Sessions refreshed after streamed message')
            }

            const transport = createChatTransport({ streamChat: api.streamChat })
            await transport.send({
                message: content,
                conversationId: currentSessionId.value || null,
                imagePath,
                responseStyle,
                callbacks: { onStart, onDelta, onEnd }
            })
            console.log('📤 Sent message with session_id:', currentSessionId.value || null)
        } catch (error) {
            console.error('Failed to send message (stream):', error)
            console.error('流式发送错误详情:', {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message,
                config: error.config
            })
            if (activeTypingMessageId.value) {
                const msgIndex = messages.value.findIndex(m => m.id === activeTypingMessageId.value)
                if (msgIndex !== -1) {
                    messages.value[msgIndex].status = 'done'
                    let errText = '出错了，请稍后重试。'
                    if (error.response?.status === 500) {
                        errText = '服务器内部错误（500）。可能原因：\n1. 后端服务异常\n2. 图片路径格式不正确\n3. 请求参数有误\n\n请检查浏览器控制台的详细错误信息。'
                    } else if (error.response?.data) {
                        if (typeof error.response.data === 'string') {
                            errText = error.response.data
                        } else if (error.response.data.detail) {
                            errText = error.response.data.detail
                        } else if (error.response.data.message) {
                            errText = error.response.data.message
                        }
                    } else if (error?.message) {
                        errText = error.message
                    }
                    messages.value[msgIndex].content = `⚠️ ${errText}`
                }
            }
        } finally {
            isTyping.value = false
            activeStreamAbort.value = null
        }
    }

    const stopGeneration = () => {
        if (typingTimer.value && activeTypingMessageId.value) {
            clearInterval(typingTimer.value)
            typingTimer.value = null
            const msgIndex = messages.value.findIndex(m => m.id === activeTypingMessageId.value)
            if (msgIndex !== -1) {
                const full = messages.value[msgIndex].fullContent || ''
                messages.value[msgIndex].content = full
                messages.value[msgIndex].status = 'done'
                delete messages.value[msgIndex].thinkingStartedAt
            }
        }
        // 取消流式
        if (activeStreamAbort.value) {
            try { activeStreamAbort.value.abort() } catch (_) { }
            activeStreamAbort.value = null
        }
        isTyping.value = false
    }

    const uploadImage = async (file) => {
        try {
            console.log('📤 chatStore.uploadImage called with:', file)
            const formData = new FormData()
            formData.append('file', file)

            console.log('📤 Uploading to:', API_BASE_URL + '/vision/upload')
            const response = await api.uploadImage(formData)
            console.log('✅ chatStore.uploadImage success:', response)

            // 兼容不同的返回格式：file_path, path, url
            if (response.file_path) return response.file_path
            if (response.path) return response.path
            if (response.url) return response.url
            if (typeof response === 'string') return response

            console.warn('⚠️ Unknown response format from uploadImage:', response)
            return response.file_path || response.path || response.url || null
        } catch (error) {
            console.error('❌ Failed to upload image:', error)
            console.error('❌ Error name:', error.name)
            console.error('❌ Error message:', error.message)
            if (error.response) {
                console.error('❌ Error response data:', JSON.stringify(error.response.data, null, 2))
                console.error('❌ Error response status:', error.response.status)
                console.error('❌ Error response headers:', error.response.headers)
            } else if (error.request) {
                console.error('❌ No response received (network error)')
                console.error('❌ Request details:', error.request)
            }
            return null
        }
    }

    const uploadDocument = async (file) => {
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('user_id', 'default_user')
            if (currentSessionId.value) {
                formData.append('session_id', currentSessionId.value)
            }

            const response = await api.uploadDocument(formData)
            return response
        } catch (error) {
            console.error('Failed to upload document:', error)
            throw error
        }
    }

    const clearCurrentSession = () => {
        console.log('🆕 Clearing current session, was:', currentSessionId.value)
        messages.value = []
        sessionInfo.value = null
        currentSessionId.value = null
        console.log('✅ Session cleared, now:', currentSessionId.value)
    }

    const deleteMessage = (messageId) => {
        const index = messages.value.findIndex(m => m.id === messageId)
        if (index !== -1) {
            messages.value.splice(index, 1)
        }
    }

    const deleteMessageApi = async (messageId) => {
        try {
            await api.deleteMessage(messageId)
        } catch (error) {
            console.error('Failed to delete message from backend:', error)
        }
    }

    const submitFeedback = async (data) => {
        try {
            return await api.submitFeedback(data)
        } catch (error) {
            console.error('Failed to submit feedback:', error)
            return { success: false, error }
        }
    }

    return {
        sessions,
        messages,
        sessionInfo,
        currentSessionId,
        isTyping,
        loading,
        loadSessions,
        loadSession,
        sendUnifiedMessage,
        stopGeneration,
        uploadImage,
        uploadDocument,
        clearCurrentSession,
        deleteMessage,
        deleteMessageApi, // Export this
        submitFeedback
    }
})

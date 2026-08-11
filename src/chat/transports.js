export class LegacyChatTransport {
  constructor({ streamChat }) {
    this.streamChat = streamChat
    this.controller = null
  }

  send({ message, conversationId, imagePath, responseStyle, callbacks = {} }) {
    this.controller = new AbortController()
    return this.streamChat({
      prompt: message,
      session_id: conversationId || null,
      image_path: imagePath || null,
      response_style: responseStyle || 'balanced'
    }, { ...callbacks, signal: this.controller.signal })
  }

  cancel() { this.controller?.abort(); this.controller = null }
}

export class Core2ChatTransport {
  constructor({ chatCore2 }) {
    this.chatCore2 = chatCore2
    this.controller = null
  }

  send({ message, conversationId, attachments = [] }) {
    if (attachments.length) {
      const error = new Error('小乐 2.0 实验模式暂不支持附件，请移除附件或切回小乐 1.0。')
      error.code = 'CORE2_ATTACHMENTS_UNSUPPORTED'
      return Promise.reject(error)
    }
    this.controller = new AbortController()
    return this.chatCore2({
      message,
      conversation_id: conversationId || null,
      attachments: []
    }, { signal: this.controller.signal })
  }

  cancel() { this.controller?.abort(); this.controller = null }
}

export const createChatTransport = (mode, dependencies) => mode === 'core2'
  ? new Core2ChatTransport(dependencies)
  : new LegacyChatTransport(dependencies)

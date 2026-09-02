export class UnifiedChatTransport {
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

  cancel() {
    this.controller?.abort()
    this.controller = null
  }
}

export const createChatTransport = (dependencies) => new UnifiedChatTransport(dependencies)

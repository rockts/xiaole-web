import { describe, expect, it, vi } from 'vitest'
import { UnifiedChatTransport } from '../transports'
import { migrateLegacyChatMode } from '../chatSettingsMigration'

class StorageFixture {
  constructor(value) { this.value = value }
  getItem() { return this.value ?? null }
  setItem(_key, value) { this.value = value }
  removeItem() { this.value = null }
}

describe('Phase B canonical Chat contract', () => {
  it.each([
    ['legacy', '{"chatMode":"legacy"}'],
    ['core2', '{"chatMode":"core2"}'],
    ['missing', '{}'],
    ['malformed', '{broken']
  ])('emits the same normal text request for %s settings', async (_label, value) => {
    const storage = new StorageFixture(value)
    migrateLegacyChatMode(storage)
    const streamChat = vi.fn().mockResolvedValue(undefined)
    const transport = new UnifiedChatTransport({ streamChat })

    await transport.send({ message: '你好', conversationId: null })

    expect(streamChat).toHaveBeenCalledWith({
      prompt: '你好',
      session_id: null,
      image_path: null,
      response_style: 'balanced'
    }, expect.objectContaining({ signal: expect.any(AbortSignal) }))
  })
})

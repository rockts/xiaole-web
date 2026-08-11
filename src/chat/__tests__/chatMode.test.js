import { describe, expect, it } from 'vitest'
import { readChatMode, writeChatMode } from '../chatMode'

class Storage {
  constructor(value) { this.value = value }
  getItem() { return this.value ?? null }
  setItem(_key, value) { this.value = value }
}

describe('chat mode persistence', () => {
  it.each([undefined, '{broken', '{"chatMode":"future"}'])('defaults invalid settings to legacy', (value) => {
    expect(readChatMode(new Storage(value))).toBe('legacy')
  })

  it('preserves other settings while saving and reloads core2', () => {
    const storage = new Storage('{"theme":"dark"}')
    writeChatMode('core2', storage)
    expect(JSON.parse(storage.value)).toEqual({ theme: 'dark', chatMode: 'core2' })
    expect(readChatMode(storage)).toBe('core2')
  })
})

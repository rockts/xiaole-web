import { describe, expect, it } from 'vitest'
import { migrateLegacyChatMode, readSettingsSafely } from '../chatSettingsMigration'

class StorageFixture {
  constructor(value) {
    this.value = value
    this.writes = 0
    this.removals = 0
  }

  getItem() { return this.value ?? null }
  setItem(_key, value) { this.value = value; this.writes += 1 }
  removeItem() { this.value = null; this.removals += 1 }
}

describe('Phase B chat settings migration', () => {
  it.each(['legacy', 'core2', 'future'])('removes old %s mode while preserving unrelated settings', (chatMode) => {
    const storage = new StorageFixture(JSON.stringify({ chatMode, theme: 'dark', nickname: '小乐用户' }))

    const result = migrateLegacyChatMode(storage)

    expect(result).toEqual({ migrated: true, previousMode: chatMode, malformed: false })
    expect(JSON.parse(storage.value)).toEqual({ theme: 'dark', nickname: '小乐用户' })
    expect(storage.writes).toBe(1)
  })

  it('does not rewrite valid settings that have no mode', () => {
    const storage = new StorageFixture('{"theme":"light"}')

    expect(migrateLegacyChatMode(storage)).toEqual({ migrated: false, previousMode: null, malformed: false })
    expect(storage.value).toBe('{"theme":"light"}')
    expect(storage.writes).toBe(0)
  })

  it('does not create settings for a new user', () => {
    const storage = new StorageFixture(null)

    expect(migrateLegacyChatMode(storage)).toEqual({ migrated: false, previousMode: null, malformed: false })
    expect(storage.writes).toBe(0)
    expect(storage.removals).toBe(0)
  })

  it.each(['{broken', '[]', 'null'])('removes malformed or non-object settings: %s', (value) => {
    const storage = new StorageFixture(value)

    expect(migrateLegacyChatMode(storage)).toEqual({ migrated: true, previousMode: null, malformed: true })
    expect(storage.value).toBeNull()
    expect(storage.removals).toBe(1)
  })

  it('reads settings safely without throwing', () => {
    expect(readSettingsSafely(new StorageFixture('{broken'))).toEqual({})
    expect(readSettingsSafely(new StorageFixture('[]'))).toEqual({})
    expect(readSettingsSafely(new StorageFixture('{"theme":"dark"}'))).toEqual({ theme: 'dark' })
  })
})

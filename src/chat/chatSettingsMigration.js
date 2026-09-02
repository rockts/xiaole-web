export const SETTINGS_KEY = 'xiaole_settings'

export function readSettingsSafely(storage = localStorage) {
  try {
    const value = JSON.parse(storage.getItem(SETTINGS_KEY) || '{}')
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  } catch {
    return {}
  }
}

export function migrateLegacyChatMode(storage = localStorage) {
  const raw = storage.getItem(SETTINGS_KEY)
  if (raw == null) {
    return { migrated: false, previousMode: null, malformed: false }
  }

  let settings
  try {
    settings = JSON.parse(raw)
  } catch {
    storage.removeItem(SETTINGS_KEY)
    return { migrated: true, previousMode: null, malformed: true }
  }

  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    storage.removeItem(SETTINGS_KEY)
    return { migrated: true, previousMode: null, malformed: true }
  }

  if (!Object.prototype.hasOwnProperty.call(settings, 'chatMode')) {
    return { migrated: false, previousMode: null, malformed: false }
  }

  const previousMode = typeof settings.chatMode === 'string' ? settings.chatMode : null
  delete settings.chatMode
  storage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  return { migrated: true, previousMode, malformed: false }
}

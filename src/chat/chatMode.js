export const CHAT_MODES = Object.freeze({ LEGACY: 'legacy', CORE2: 'core2' })

const normalize = (value) => value === CHAT_MODES.CORE2 ? CHAT_MODES.CORE2 : CHAT_MODES.LEGACY

const readSettings = (storage) => {
  try {
    const parsed = JSON.parse(storage.getItem('xiaole_settings') || '{}')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export const readChatMode = (storage = localStorage) => normalize(readSettings(storage).chatMode)

export const writeChatMode = (mode, storage = localStorage) => {
  const settings = readSettings(storage)
  settings.chatMode = normalize(mode)
  storage.setItem('xiaole_settings', JSON.stringify(settings))
  return settings.chatMode
}

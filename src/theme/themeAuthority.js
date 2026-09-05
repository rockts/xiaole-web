import { ref } from 'vue'
import { readSettingsSafely, SETTINGS_KEY } from '@/chat/chatSettingsMigration'

const LEGACY_THEME_KEY = 'theme'
const SYSTEM_QUERY = '(prefers-color-scheme: dark)'
const VALID_PREFERENCES = new Set(['light', 'dark', 'auto'])

export const themePreference = ref('auto')
export const resolvedTheme = ref('light')

let systemMedia = null
let systemListener = null

function normalizePreference(value) {
  if (value === 'system') return 'auto'
  return VALID_PREFERENCES.has(value) ? value : null
}

function getSystemMedia() {
  return window.matchMedia(SYSTEM_QUERY)
}

function resolveTheme(preference, media = systemMedia || getSystemMedia()) {
  return preference === 'auto' ? (media.matches ? 'dark' : 'light') : preference
}

function applyResolvedTheme() {
  const resolved = resolveTheme(themePreference.value)
  resolvedTheme.value = resolved
  document.documentElement.setAttribute('data-theme', resolved)
  document.documentElement.style.colorScheme = resolved
}

function persistPreference(preference, storage = localStorage) {
  const settings = readSettingsSafely(storage)
  storage.setItem(SETTINGS_KEY, JSON.stringify({ ...settings, theme: preference }))
}

function stopSystemListener() {
  if (systemMedia && systemListener) systemMedia.removeEventListener('change', systemListener)
  systemMedia = null
  systemListener = null
}

export function initializeTheme(storage = localStorage) {
  stopSystemListener()
  const settings = readSettingsSafely(storage)
  const settingsPreference = normalizePreference(settings.theme)
  const legacyPreference = normalizePreference(storage.getItem(LEGACY_THEME_KEY))
  const preference = settingsPreference || legacyPreference || 'auto'

  if (!settingsPreference && legacyPreference) persistPreference(legacyPreference, storage)
  if (settings.theme === 'system') persistPreference('auto', storage)
  storage.removeItem(LEGACY_THEME_KEY)

  themePreference.value = preference
  systemMedia = getSystemMedia()
  systemListener = () => {
    if (themePreference.value === 'auto') applyResolvedTheme()
  }
  systemMedia.addEventListener('change', systemListener)
  applyResolvedTheme()
  return { preference: themePreference.value, resolved: resolvedTheme.value }
}

export function setThemePreference(preference, storage = localStorage) {
  const normalized = normalizePreference(preference) || 'auto'
  themePreference.value = normalized
  persistPreference(normalized, storage)
  applyResolvedTheme()
}

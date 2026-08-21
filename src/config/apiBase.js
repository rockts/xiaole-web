export const PRODUCTION_API_BASE = 'https://api.xiaole.app'

export function resolveApiBase(isProduction, configuredBase) {
  const normalized = (configuredBase || '').replace(/\/$/, '')
  if (isProduction && normalized !== PRODUCTION_API_BASE) {
    throw new Error(`Production VITE_API_BASE must be ${PRODUCTION_API_BASE}`)
  }
  return normalized
}

export const API_BASE_URL = resolveApiBase(import.meta.env.PROD, import.meta.env.VITE_API_BASE)

export function toWebSocketUrl(apiBase = API_BASE_URL, location = window.location) {
  if (!apiBase) {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${location.host}/ws`
  }
  return `${apiBase.replace(/^https:/, 'wss:').replace(/^http:/, 'ws:')}/ws`
}

const partMap = (date, timezone) => Object.fromEntries(
  new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hourCycle: 'h23', timeZoneName: 'longOffset'
  }).formatToParts(date).map(({ type, value }) => [type, value])
)

export const toZonedIso = (date, timezone) => {
  const parts = partMap(date, timezone)
  const zone = parts.timeZoneName === 'GMT'
    ? '+00:00'
    : parts.timeZoneName.replace('GMT', '')
  if (!/^[+-]\d{2}:\d{2}$/.test(zone)) throw new Error('Browser timezone unavailable')
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}${zone}`
}

export const createTurnContext = ({
  now = () => new Date(),
  randomUUID = () => crypto.randomUUID(),
  resolveTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone
} = {}) => {
  const timezone = resolveTimezone()
  return Object.freeze({
    turn_id: randomUUID(),
    requested_at: toZonedIso(now(), timezone),
    timezone
  })
}

const storageKey = fingerprint => `xiaole:pending-turn:${fingerprint}`

export const resumeOrCreateTurnContext = (fingerprint, options = {}) => {
  const storage = options.storage ?? (typeof sessionStorage === 'undefined' ? null : sessionStorage)
  if (storage) {
    try {
      const saved = JSON.parse(storage.getItem(storageKey(fingerprint)))
      if (saved?.turn_id && saved?.requested_at && saved?.timezone) return Object.freeze(saved)
    } catch (_) { /* fail closed to a fresh semantic send */ }
  }
  const context = createTurnContext(options)
  storage?.setItem(storageKey(fingerprint), JSON.stringify(context))
  return context
}

export const clearTurnContext = (fingerprint, storage = typeof sessionStorage === 'undefined' ? null : sessionStorage) => {
  storage?.removeItem(storageKey(fingerprint))
}

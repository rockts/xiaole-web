const INTENTS = new Set(['conversation', 'memory', 'action'])
const ACTION_STATUSES = new Set(['pending', 'running', 'success', 'failed', 'cancelled', 'dead', 'timeout'])

const safeText = (value) => typeof value === 'string' ? value : ''
const looksLikeLocalPath = (value) => /^(?:file:|\/|[A-Za-z]:\\|~\/)/.test(value)
const safeUrl = (value) => {
  if (typeof value !== 'string') return ''
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : ''
  } catch {
    return ''
  }
}

const mapSource = (source) => {
  if (!source || typeof source !== 'object') return null
  const rawTitle = safeText(source.title)
  const mapped = { title: !rawTitle || looksLikeLocalPath(rawTitle) ? '来源' : rawTitle }
  const summary = safeText(source.summary) || safeText(source.snippet)
  const issueDate = safeText(source.issue_date)
  const url = safeUrl(source.open_url) || safeUrl(source.preview_url)
  if (summary) mapped.summary = summary
  if (issueDate) mapped.issue_date = issueDate
  if (url) mapped.url = url
  return mapped
}

export const mapCore2Response = (raw) => {
  const value = raw && typeof raw === 'object' ? raw : {}
  const intent = INTENTS.has(value.intent) ? value.intent : 'conversation'
  const sources = Array.isArray(value.sources) ? value.sources.map(mapSource).filter(Boolean) : []
  let action = null
  if (value.action && typeof value.action === 'object') {
    action = {
      status: ACTION_STATUSES.has(value.action.status) ? value.action.status : 'failed',
      summary: safeText(value.action.summary)
    }
  }
  return { answer: safeText(value.answer), intent, sources, action }
}

export const createSafeCore2Error = (cause) => {
  const error = new Error('小乐 2.0 暂时不可用')
  error.name = 'Core2RequestError'
  error.status = Number(cause?.response?.status) || 0
  return error
}

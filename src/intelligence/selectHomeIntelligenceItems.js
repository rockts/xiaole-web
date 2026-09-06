const isWorthAttention = (item) => {
  const relevance = item?.relevance_level || item?.personal_relevance?.level
  return typeof relevance === 'string' && relevance.toUpperCase() === 'WORTH_ATTENTION'
}

export const selectHomeIntelligenceItems = (items, limit = 1) => {
  const maximum = Number.isFinite(limit) ? Math.min(1, Math.max(0, Math.floor(limit))) : 1
  const selected = []
  const eventIds = new Set()

  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.event_id || eventIds.has(item.event_id)) continue
    eventIds.add(item.event_id)
    if (isWorthAttention(item) || item.requires_user_attention === true) selected.push(item)
  }

  return selected.slice(0, maximum)
}

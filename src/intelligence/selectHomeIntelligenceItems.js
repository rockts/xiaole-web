const priorityFor = (item) => {
  if (!item.is_read && item.requires_user_attention) return 0
  if (!item.is_read) return 1
  return 2
}

export const selectHomeIntelligenceItems = (items, limit = 3) => {
  const maximum = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 3
  const buckets = [[], [], []]
  const eventIds = new Set()

  for (const item of Array.isArray(items) ? items : []) {
    if (!item?.event_id || eventIds.has(item.event_id)) continue
    eventIds.add(item.event_id)
    buckets[priorityFor(item)].push(item)
  }

  return buckets.flat().slice(0, maximum)
}

import { describe, expect, it } from 'vitest'
import { selectHomeIntelligenceItems } from '../selectHomeIntelligenceItems'

const item = (eventId, overrides = {}) => ({
  event_id: eventId,
  is_read: false,
  requires_user_attention: false,
  ...overrides,
})

describe('selectHomeIntelligenceItems', () => {
  it('returns only the first governed attention event for Home', () => {
    const items = Array.from({ length: 11 }, (_, index) => item(`event-${index + 1}`))
    items[10] = item('gansu-trace', { requires_user_attention: true })

    expect(selectHomeIntelligenceItems(items).map(({ event_id }) => event_id)).toEqual(['gansu-trace'])
  })

  it('uses explicit worth-attention relevance when available', () => {
    const items = [
      item('ordinary-unread'),
      item('worth-attention', { relevance_level: 'WORTH_ATTENTION', is_read: true }),
    ]

    expect(selectHomeIntelligenceItems(items).map(({ event_id }) => event_id)).toEqual(['worth-attention'])
  })

  it('does not promote unread, delivered, assessed, or starred items without governed attention', () => {
    const items = [
      item('ordinary-unread'),
      item('delivered', { delivery_status: 'sent' }),
      item('assessed', { assessment_kind: 'formal', stars: 5 }),
    ]

    expect(selectHomeIntelligenceItems(items)).toEqual([])
  })

  it('accepts lowercase governed relevance without recalculating it', () => {
    const items = [
      item('related', { relevance_level: 'related' }),
      item('worth', { relevance_level: 'worth_attention' }),
    ]

    expect(selectHomeIntelligenceItems(items).map(({ event_id }) => event_id)).toEqual(['worth'])
  })

  it('deduplicates event ids and keeps one lightweight Home highlight', () => {
    const items = [
      item('attention', { requires_user_attention: true }),
      item('attention', { requires_user_attention: true }),
      item('unread-one'),
      item('unread-two'),
      item('read-one', { is_read: true }),
    ]

    expect(selectHomeIntelligenceItems(items, 3).map(({ event_id }) => event_id)).toEqual(['attention'])
    expect(items.map(({ event_id }) => event_id)).toEqual([
      'attention',
      'attention',
      'unread-one',
      'unread-two',
      'read-one',
    ])
  })
})

import { describe, expect, it } from 'vitest'
import { selectHomeIntelligenceItems } from '../selectHomeIntelligenceItems'

const item = (eventId, overrides = {}) => ({
  event_id: eventId,
  is_read: false,
  requires_user_attention: false,
  ...overrides,
})

describe('selectHomeIntelligenceItems', () => {
  it('elevates the eleventh actionable unread event above earlier Inbox history', () => {
    const items = Array.from({ length: 11 }, (_, index) => item(`event-${index + 1}`))
    items[10] = item('gansu-trace', { requires_user_attention: true })

    expect(selectHomeIntelligenceItems(items).map(({ event_id }) => event_id)).toEqual([
      'gansu-trace',
      'event-1',
      'event-2',
    ])
  })

  it('keeps Inbox order among multiple actionable unread events', () => {
    const items = [
      item('ordinary-first'),
      item('attention-first', { requires_user_attention: true }),
      item('attention-second', { requires_user_attention: true }),
      item('ordinary-second'),
    ]

    expect(selectHomeIntelligenceItems(items).map(({ event_id }) => event_id)).toEqual([
      'attention-first',
      'attention-second',
      'ordinary-first',
    ])
  })

  it('prioritizes ordinary unread events when no attention event exists', () => {
    const items = [
      item('read-first', { is_read: true }),
      item('unread-first'),
      item('read-second', { is_read: true }),
      item('unread-second'),
    ]

    expect(selectHomeIntelligenceItems(items).map(({ event_id }) => event_id)).toEqual([
      'unread-first',
      'unread-second',
      'read-first',
    ])
  })

  it('fills remaining slots with read events in Inbox order', () => {
    const items = [
      item('read-first', { is_read: true }),
      item('unread-only'),
      item('read-second', { is_read: true }),
    ]

    expect(selectHomeIntelligenceItems(items).map(({ event_id }) => event_id)).toEqual([
      'unread-only',
      'read-first',
      'read-second',
    ])
  })

  it('deduplicates event ids and never returns more than the requested limit', () => {
    const items = [
      item('attention', { requires_user_attention: true }),
      item('attention', { requires_user_attention: true }),
      item('unread-one'),
      item('unread-two'),
      item('read-one', { is_read: true }),
    ]

    expect(selectHomeIntelligenceItems(items, 3).map(({ event_id }) => event_id)).toEqual([
      'attention',
      'unread-one',
      'unread-two',
    ])
    expect(items.map(({ event_id }) => event_id)).toEqual([
      'attention',
      'attention',
      'unread-one',
      'unread-two',
      'read-one',
    ])
  })
})

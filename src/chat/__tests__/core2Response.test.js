import { describe, expect, it } from 'vitest'
import { mapCore2Response } from '../core2Response'

describe('Core2 response allowlist', () => {
  it('keeps only safe UI fields and removes internal data', () => {
    const mapped = mapCore2Response({
      answer: 'grounded', intent: 'memory', request_id: 'r', diagnostics: { model: 'secret' },
      sources: [{ title: '通知', summary: '摘要', issue_date: '2026-08-11', open_url: 'https://example.com/n', original_path: '/Users/me/private.pdf', custom: 'x' }],
      action: { status: 'failed', summary: '未执行', task_id: 't', evidence: { stdout: 'secret' } }
    })
    expect(mapped).toEqual({
      answer: 'grounded', intent: 'memory',
      sources: [{ title: '通知', summary: '摘要', issue_date: '2026-08-11', url: 'https://example.com/n' }],
      action: { status: 'failed', summary: '未执行' }
    })
    expect(JSON.stringify(mapped)).not.toMatch(/diagnostics|evidence|request_id|original_path|task_id/)
  })

  it('does not expose local paths or unsafe links', () => {
    const mapped = mapCore2Response({ answer: 'a', intent: 'memory', sources: [
      { title: '/Volumes/private/a.pdf', open_url: 'file:///private/a.pdf' },
      { title: '本地', preview_url: '/files/a.pdf' }
    ] })
    expect(mapped.sources).toEqual([{ title: '来源' }, { title: '本地' }])
  })

  it('normalizes unknown intent and action statuses safely', () => {
    expect(mapCore2Response({ answer: 7, intent: 'internal', action: { status: 'magic', summary: 4 } })).toEqual({
      answer: '', intent: 'conversation', sources: [], action: { status: 'failed', summary: '' }
    })
  })
})

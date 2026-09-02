import { describe, expect, it } from 'vitest'
import { applyDraftToEditor, consumeHomeDraft } from '../homeDraft'

describe('Home draft', () => {
  it('consumes once without changing settings or sending', () => {
    const history = {
      state: { xiaoleDraft: '问题', source: 'home_quick_question' },
      replaceState(_a, _b, _c) { this.state = {} }
    }
    localStorage.setItem('xiaole_settings', '{"theme":"dark"}')

    expect(consumeHomeDraft(history, '/chat')).toBe('问题')
    expect(consumeHomeDraft(history, '/chat')).toBe('')
    expect(localStorage.getItem('xiaole_settings')).toBe('{"theme":"dark"}')
  })

  it('writes the draft into the existing contenteditable editor', () => {
    const editor = document.createElement('div')
    editor.contentEditable = 'true'
    applyDraftToEditor(editor, '最近有什么值得我关注？')
    expect(editor.innerText).toBe('最近有什么值得我关注？')
  })
})

import { describe, expect, it } from 'vitest'
import router from '../index'

describe('Phase A route compatibility', () => {
  it('uses Home as the default product entry', () => {
    const root = router.getRoutes().find((route) => route.path === '/')
    expect(root.redirect).toBe('/home')
  })

  it('adds product routes while preserving every legacy route', () => {
    const paths = router.getRoutes().map((route) => route.path)
    expect(paths).toEqual(expect.arrayContaining([
      '/home', '/chat/:sessionId?', '/knowledge', '/action', '/conversations',
      '/memory', '/behavior', '/tasks', '/task/:id', '/documents',
      '/documents/:id', '/tools', '/settings', '/intelligence', '/intelligence/:eventId'
    ]))
  })
})

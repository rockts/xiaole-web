import { describe, expect, test, vi } from 'vitest'

async function loadBuilder() {
  try {
    return await import('../../../scripts/generate-service-worker.mjs')
  } catch {
    return null
  }
}

describe('production service worker generation', () => {
  test('different bundle contents produce different cache ids', async () => {
    const builder = await loadBuilder()
    expect(builder, 'service worker build generator must exist').not.toBeNull()

    const first = builder.renderServiceWorker({
      buildId: builder.computeBuildId([{ path: '/assets/index-a.js', content: 'first' }]),
      precacheUrls: ['/', '/index.html', '/assets/index-a.js']
    })
    const second = builder.renderServiceWorker({
      buildId: builder.computeBuildId([{ path: '/assets/index-b.js', content: 'second' }]),
      precacheUrls: ['/', '/index.html', '/assets/index-b.js']
    })

    expect(first).not.toBe(second)
    expect(first).toContain('xiaole-shell-')
    expect(second).not.toContain('/assets/index-a.js')
  })

  test('activation removes legacy and previous-build caches', async () => {
    const builder = await loadBuilder()
    expect(builder, 'service worker build generator must exist').not.toBeNull()

    const source = builder.renderServiceWorker({
      buildId: 'new-build',
      precacheUrls: ['/', '/index.html', '/assets/index-new.js']
    })
    const activate = captureListener(source, 'activate')
    const deleted = []
    let waited
    const caches = {
      keys: vi.fn().mockResolvedValue([
        'xiaole-ai-v1.0.0',
        'xiaole-shell-old-build',
        'xiaole-assets-old-build',
        'xiaole-shell-new-build',
        'xiaole-assets-new-build',
        'unrelated-cache'
      ]),
      delete: vi.fn(async (name) => {
        deleted.push(name)
        return true
      })
    }

    activate.call({
      caches,
      clients: { claim: vi.fn().mockResolvedValue(undefined) }
    }, {
      waitUntil(promise) { waited = promise }
    })
    await waited

    expect(deleted).toEqual([
      'xiaole-ai-v1.0.0',
      'xiaole-shell-old-build',
      'xiaole-assets-old-build'
    ])
  })

  test('install precaches hashed bundles in the current asset cache for offline startup', async () => {
    const builder = await loadBuilder()
    const source = builder.renderServiceWorker({
      buildId: 'offline-build',
      precacheUrls: ['/', '/index.html', '/assets/index-offline.js']
    })
    const install = captureListener(source, 'install')
    const additions = new Map()
    let waited

    install.call({
      caches: {
        open: vi.fn(async (name) => ({
          addAll: vi.fn(async (urls) => additions.set(name, urls))
        }))
      },
      clients: {}
    }, {
      waitUntil(promise) { waited = promise }
    })
    await waited

    expect(additions.get('xiaole-shell-offline-build')).toEqual(['/', '/index.html'])
    expect(additions.get('xiaole-assets-offline-build')).toEqual(['/assets/index-offline.js'])
  })
})

function captureListener(source, eventName) {
  return function (event) {
    const listeners = {}
    const runtime = {
      console,
      URL,
      Request,
      Response,
      fetch: vi.fn(),
      caches: this.caches,
      self: {
        location: { origin: 'https://xiaole.app' },
        clients: this.clients,
        addEventListener(name, handler) { listeners[name] = handler },
        skipWaiting: vi.fn().mockResolvedValue(undefined),
        registration: { showNotification: vi.fn() }
      }
    }
    Function(...Object.keys(runtime), source)(...Object.values(runtime))
    return listeners[eventName](event)
  }
}

import { describe, expect, test, vi } from 'vitest'

describe('service worker client update flow', () => {
  test('checks immediately and after returning to foreground, then reloads once on takeover', async () => {
    const module = await import('../registerServiceWorker.js').catch(() => null)
    expect(module, 'service worker registration module must exist').not.toBeNull()

    const listeners = new Map()
    const update = vi.fn().mockResolvedValue(undefined)
    const register = vi.fn().mockResolvedValue({ update })
    const reload = vi.fn()
    const browser = {
      navigator: {
        serviceWorker: {
          register,
          addEventListener(name, handler) { listeners.set(name, handler) }
        }
      },
      document: {
        visibilityState: 'visible',
        addEventListener(name, handler) { listeners.set(name, handler) }
      },
      location: { reload },
      sessionStorage: createSessionStorage()
    }

    await module.registerServiceWorker(browser)
    expect(register).toHaveBeenCalledWith('/sw.js', { updateViaCache: 'none' })
    expect(update).toHaveBeenCalledTimes(1)

    await listeners.get('visibilitychange')()
    expect(update).toHaveBeenCalledTimes(2)

    listeners.get('controllerchange')()
    listeners.get('controllerchange')()
    expect(reload).toHaveBeenCalledTimes(1)
  })

  test('keeps the installed PWA usable when an update check fails on a weak network', async () => {
    const module = await import('../registerServiceWorker.js')
    const listeners = new Map()
    const registration = { update: vi.fn().mockRejectedValue(new Error('offline')) }
    const browser = {
      navigator: {
        serviceWorker: {
          register: vi.fn().mockResolvedValue(registration),
          addEventListener(name, handler) { listeners.set(name, handler) }
        }
      },
      document: {
        visibilityState: 'visible',
        addEventListener(name, handler) { listeners.set(name, handler) }
      },
      location: { reload: vi.fn() },
      console: { warn: vi.fn() }
    }

    await expect(module.registerServiceWorker(browser)).resolves.toBe(registration)
    await expect(listeners.get('visibilitychange')()).resolves.toBeUndefined()
    expect(browser.console.warn).toHaveBeenCalledTimes(2)
  })
})

function createSessionStorage() {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value))
  }
}

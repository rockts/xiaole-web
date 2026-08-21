export async function registerServiceWorker(browser = window) {
  const serviceWorker = browser.navigator?.serviceWorker
  if (!serviceWorker) return null

  const registration = await serviceWorker.register('/sw.js', { updateViaCache: 'none' })
  const checkForUpdate = async () => {
    try {
      await registration.update()
    } catch (error) {
      browser.console?.warn?.('[PWA] Service Worker update check failed:', error.message)
    }
  }
  await checkForUpdate()

  let reloading = false
  serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return
    reloading = true
    browser.location.reload()
  })

  browser.document.addEventListener('visibilitychange', async () => {
    if (browser.document.visibilityState === 'visible') await checkForUpdate()
  })

  return registration
}

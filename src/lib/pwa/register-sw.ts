'use client'

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
      console.log('[SW] Registered', reg.scope)

      // Listen for offline queue flush messages
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'FLUSH_OFFLINE_QUEUE') {
          window.dispatchEvent(new CustomEvent('syllabusiq:flush-queue'))
        }
      })
    } catch (err) {
      console.warn('[SW] Registration failed:', err)
    }
  })
}

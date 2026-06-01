// SyllabusIQ Service Worker
// Handles offline caching, background sync, and push notifications.

const CACHE_VERSION = 'syllabusiq-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE = `${CACHE_VERSION}-api`

const PRECACHE_URLS = [
  '/',
  '/syllabus',
  '/dashboard',
  '/schedule',
  '/log',
  '/offline',
]

// ── Install: precache app shell ──────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  )
  self.skipWaiting()
})

// ── Activate: purge old caches ───────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('syllabusiq-') && k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch: network-first for API, cache-first for static ─────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Don't intercept cross-origin, chrome-extension, or non-GET
  if (request.method !== 'GET' || !url.origin.includes(self.location.origin)) return

  // API routes: network-first
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone()
          caches.open(API_CACHE).then((c) => c.put(request, clone))
          return res
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Static & pages: stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request).then((res) => {
        caches.open(STATIC_CACHE).then((c) => c.put(request, res.clone()))
        return res
      })
      return cached || network
    })
  )
})

// ── Background Sync: flush offline session queue ─────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-sessions') {
    event.waitUntil(flushOfflineQueue())
  }
})

async function flushOfflineQueue() {
  // Implemented client-side via Dexie pending_ops table.
  // The page handles the actual flush; this just wakes up the page.
  const clients = await self.clients.matchAll({ type: 'window' })
  clients.forEach((client) => client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' }))
}

// ── Push Notifications ───────────────────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {}
  const { title = 'SyllabusIQ', body = 'Time to study!', url = '/syllabus', icon = '/icons/icon-192.png' } = data

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge: '/icons/icon-192.png',
      data: { url },
      vibrate: [100, 50, 100],
      actions: [
        { action: 'open', title: 'Open App' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const targetUrl = event.notification.data?.url ?? '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(targetUrl))
      if (existing) return existing.focus()
      return self.clients.openWindow(targetUrl)
    })
  )
})

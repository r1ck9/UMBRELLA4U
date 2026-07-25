// Haven service worker — handles background web-push + notification taps.
// Registered by components/EnableWebPush.jsx once a member turns notifications on.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (event) => {
  let d = {}
  try { d = event.data ? event.data.json() : {} }
  catch { d = { title: 'Haven ☂', body: event.data && event.data.text ? event.data.text() : '' } }
  const title = d.title || 'Haven ☂'
  const options = {
    body: d.body || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: d.tag || 'haven',
    renotify: true,
    data: { url: d.url || '/inbox' }
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = (event.notification.data && event.notification.data.url) || '/inbox'
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const c of all) {
      if ('focus' in c) { try { await c.navigate(url) } catch {} ; return c.focus() }
    }
    if (self.clients.openWindow) return self.clients.openWindow(url)
  })())
})

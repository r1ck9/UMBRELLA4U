// SERVER-ONLY. Sends Web Push notifications (browser push, works when the tab
// is closed) via VAPID. No-ops safely if the VAPID env vars aren't set.
//
// Env:
//   VAPID_PUBLIC_KEY   (also exposed to the client as NEXT_PUBLIC_VAPID_PUBLIC_KEY)
//   VAPID_PRIVATE_KEY
//   VAPID_SUBJECT      e.g. "mailto:hello@umbrella4u.ca" (optional)
import webpush from 'web-push'

let ready = false
function init() {
  if (ready) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:hello@umbrella4u.ca', pub, priv)
  ready = true
  return true
}

// subs: [{ endpoint, sub }] where `sub` is the stored PushSubscription JSON.
// Returns { sent, failed, stale } — `stale` endpoints (410/404) should be pruned.
export async function sendWebPush(subs, payload) {
  if (!init() || !subs?.length) return { skipped: true, sent: 0, failed: 0, stale: [] }
  const data = JSON.stringify(payload)
  let sent = 0, failed = 0
  const stale = []
  await Promise.all(subs.map(async (s) => {
    try { await webpush.sendNotification(s.sub, data); sent++ }
    catch (e) {
      failed++
      if (e && (e.statusCode === 404 || e.statusCode === 410)) stale.push(s.endpoint)
    }
  }))
  return { sent, failed, stale }
}

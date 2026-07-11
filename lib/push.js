// SERVER-ONLY. Sends push notifications via Firebase Cloud Messaging (FCM)
// HTTP v1, which delivers to both Android (FCM) and iOS (APNs, configured in
// the Firebase console). No-ops safely if credentials aren't set yet.
//
// Env: FCM_SERVICE_ACCOUNT = the full service-account JSON (one line), from
// Firebase console → Project settings → Service accounts → Generate new key.
import { GoogleAuth } from 'google-auth-library'

let _auth = null
let _projectId = null

function getAuth() {
  if (_auth) return _auth
  const raw = process.env.FCM_SERVICE_ACCOUNT
  if (!raw) return null
  let creds
  try { creds = JSON.parse(raw) } catch { return null }
  _projectId = creds.project_id
  _auth = new GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/firebase.messaging']
  })
  return _auth
}

// Send one notification to a set of device tokens. Returns { sent, failed,
// stale } where `stale` are tokens FCM reports as unregistered (delete them).
export async function sendPush(tokens, { title, body, url }) {
  const auth = getAuth()
  if (!auth || !tokens?.length) return { skipped: true, sent: 0, failed: 0, stale: [] }

  const client = await auth.getClient()
  const { token: accessToken } = await client.getAccessToken()
  const endpoint = `https://fcm.googleapis.com/v1/projects/${_projectId}/messages:send`

  let sent = 0, failed = 0
  const stale = []
  // FCM v1 sends one message per token; keep it simple and sequential.
  for (const t of tokens) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: {
          token: t,
          notification: { title, body },
          data: url ? { url } : {},
          apns: { payload: { aps: { sound: 'default' } } }
        }
      })
    })
    if (res.ok) { sent++; continue }
    failed++
    // 404/UNREGISTERED → token is dead; caller should prune it.
    if (res.status === 404) stale.push(t)
  }
  return { sent, failed, stale }
}

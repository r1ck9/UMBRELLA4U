'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

function b64ToU8(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const s = (b64 + pad).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(s)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

// Turns on real browser push (works when the tab/app is closed). Registers the
// service worker, subscribes with the VAPID key, and stores the subscription
// on the member's account so the server can push to it.
export default function EnableWebPush() {
  const [state, setState] = useState('idle') // idle | working | on | denied | unsupported

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID) { setState('unsupported'); return }
    navigator.serviceWorker.getRegistration().then(async (r) => {
      if (!r) return
      const s = await r.pushManager.getSubscription()
      if (s) setState('on')
    }).catch(() => {})
  }, [])

  async function enable() {
    setState('working')
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready
      let perm = Notification.permission
      if (perm === 'default') perm = await Notification.requestPermission()
      if (perm !== 'granted') { setState(perm === 'denied' ? 'denied' : 'idle'); return }
      let sub = await reg.pushManager.getSubscription()
      if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToU8(VAPID) })
      if (supabase) await supabase.rpc('save_web_push_sub', { sub: sub.toJSON() })
      try { new Notification('Haven ☂', { body: 'Notifications are on. We’ll let you know when someone stands with you.' }) } catch {}
      setState('on')
    } catch { setState('idle') }
  }

  if (state === 'unsupported') return null
  if (state === 'on') return <p className="notice" style={{ marginBottom: 14 }}>🔔 Notifications are on for this device.</p>

  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h3>🔔 Turn on notifications</h3>
      <p className="sub" style={{ color: 'var(--ink-2)', margin: '6px 0 12px' }}>
        Get a gentle nudge when someone opens an umbrella on your story, leaves you a word, or your skies clear to sunny.
      </p>
      <button className="btn prim sm" onClick={enable} disabled={state === 'working'}>
        {state === 'working' ? 'Enabling…' : 'Enable notifications'}
      </button>
      {state === 'denied' && (
        <p className="hint" style={{ marginTop: 10 }}>
          Notifications are blocked in your browser settings. Allow them for this site, then try again.
          On iPhone, first add Haven to your Home Screen (Share → Add to Home Screen), then open it and enable.
        </p>
      )}
    </div>
  )
}

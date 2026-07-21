import { supabase } from './supabase'

// A random, anonymous per-browser id, NOT tied to any account or personal
// info. Used only to count distinct people through the funnel.
function visitorId() {
  try {
    let v = localStorage.getItem('umb_vid')
    if (!v) {
      v = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : String(Date.now()) + Math.random().toString(16).slice(2)
      localStorage.setItem('umb_vid', v)
    }
    return v
  } catch { return null }
}

// Record one funnel step. Fires each step at most once per browser (both here
// and in the DB), so it's cheap and safe to call liberally.
export function track(event) {
  if (!supabase) return
  try {
    const k = 'umb_ev_' + event
    if (localStorage.getItem(k)) return
    localStorage.setItem(k, '1')
  } catch { /* private mode, still try to send */ }
  const v = visitorId()
  if (!v) return
  const p = supabase.rpc('track_event', { vid: v, ev: event })
  if (p && p.then) p.then(() => {}, () => {})
}

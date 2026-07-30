'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

function ago(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'
  const d = Math.floor(h / 24); return d + (d === 1 ? ' day ago' : 'd ago')
}

export default function ReplyQueue() {
  const [state, setState] = useState({ loading: true, isMod: false, items: [] })
  const [draft, setDraft] = useState({})
  const [busy, setBusy] = useState(null)

  async function load() {
    if (!supabase) { setState({ loading: false, isMod: false, items: [] }); return }
    const me = await getMe()
    if (!me.isModerator) { setState({ loading: false, isMod: false, items: [] }); return }
    const { data } = await supabase.rpc('pending_reply_posts')
    setState({ loading: false, isMod: true, items: data || [] })
  }
  useEffect(() => { load() }, [])

  async function sendReply(sid) {
    const body = (draft[sid] || '').trim()
    if (!body) return
    setBusy(sid)
    const { error } = await supabase.rpc('reply_as_bot', { sid, body })
    setBusy(null)
    if (error) {
      const m = error.message || ''
      if (m.includes('no_names_in_reply')) alert('Keep replies anonymous, please don’t include names or @mentions.')
      else if (m.includes('personal_info')) alert('Please remove personal info (like emails) from the reply.')
      else if (m.includes('blocked_content')) alert('That reply was blocked by the content filter.')
      else alert('Could not send: ' + m)
      return
    }
    setDraft((d) => ({ ...d, [sid]: '' }))
    load()
  }
  async function skip(sid) {
    setBusy(sid)
    await supabase.rpc('mark_replied', { sid })
    setBusy(null)
    load()
  }

  if (state.loading) return <p className="empty">Loading…</p>
  if (!state.isMod) return null
  if (state.items.length === 0) return <p className="empty">No new posts waiting for a reply. 🌤️</p>

  return (
    <div className="inbox-list">
      {state.items.map((it) => (
        <div className="ibx new" key={it.story_id}>
          <div className="ibx-orig">
            <div className="l">
              💬 {it.category}{it.anonymous ? ' · anonymous' : ''} · ☂ {it.umbrella_count} · {ago(it.created_at)}
            </div>
            <div className="t" style={{ margin: '4px 0 8px' }}>{it.text}</div>
          </div>
          <textarea
            placeholder="Type a reply… (posted as a member, shows in their inbox)"
            value={draft[it.story_id] || ''}
            onChange={(e) => setDraft((d) => ({ ...d, [it.story_id]: e.target.value }))}
            rows={2}
            style={{ width: '100%', resize: 'vertical', padding: '8px', borderRadius: '8px',
                     border: '1px solid var(--line)', font: 'inherit' }}
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
            <button className="btn" disabled={busy === it.story_id} onClick={() => sendReply(it.story_id)}>
              {busy === it.story_id ? 'Sending…' : 'Send reply'}
            </button>
            <button className="btn ghost" disabled={busy === it.story_id} onClick={() => skip(it.story_id)}>
              Skip
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

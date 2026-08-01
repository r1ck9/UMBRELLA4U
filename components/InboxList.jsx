'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function ago(iso) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return m + 'm ago'
  const h = Math.floor(m / 60); if (h < 24) return h + 'h ago'
  const d = Math.floor(h / 24); return d + (d === 1 ? ' day ago' : 'd ago')
}
function excerpt(t = '') { return t.length > 70 ? t.slice(0, 70) + '…' : t }

// Quick thank-yous the poster can send back to whoever left them a word.
const THANKS = [
  'Thank you for sharing 💛',
  'Thank you for your advice 🙏',
  'This really helped, thank you 🫂',
]

export default function InboxList() {
  const [state, setState] = useState({ loading: true, user: null, items: [] })
  const [sent, setSent] = useState({})   // umbrella_id -> the thank-you sent
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    if (!supabase) { setState({ loading: false, user: null, items: [] }); return }
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) { setState({ loading: false, user: null, items: [] }); return }

      // my own stories (incl. anonymous) via the private author link
      const { data: sa } = await supabase.from('story_authors').select('story_id')
      const ids = (sa || []).map((r) => r.story_id)
      const map = {}
      if (ids.length) {
        const { data: stories } = await supabase.from('stories').select('id,text,category').in('id', ids)
        ;(stories || []).forEach((s) => { map[s.id] = s })
      }

      let umbs = []
      if (ids.length) {
        const { data: u } = await supabase.from('umbrellas')
          .select('id,story_id,note,created_at,user_id')
          .in('story_id', ids).order('created_at', { ascending: false })
        umbs = (u || []).filter((x) => x.user_id !== user.id) // don't notify you about your own
      }

      // thank-yous other posters sent me for words I left on their stories
      const { data: th } = await supabase.from('thanks')
        .select('id,message,created_at,from_user').eq('to_user', user.id)
        .order('created_at', { ascending: false })

      // Human media-review decisions. Approvals simply publish; rejections
      // create an explicit private inbox notice for the submitting member.
      const { data: mediaNotices } = await supabase.from('media_review_notifications')
        .select('id,message,story_excerpt,created_at')
        .order('created_at', { ascending: false })

      // thank-yous I've already sent, so those replies show a "Sent" state
      const { data: mine } = await supabase.from('thanks')
        .select('umbrella_id,message').eq('from_user', user.id)
      const already = {}
      ;(mine || []).forEach((t) => { if (t.umbrella_id) already[t.umbrella_id] = t.message })
      setSent(already)

      const seen = localStorage.getItem('umbrella_inbox_seen') || '1970-01-01T00:00:00Z'
      const umbItems = umbs.map((u) => ({
        kind: 'umbrella', id: u.id, note: u.note, user_id: u.user_id,
        story: map[u.story_id], created_at: u.created_at, isNew: u.created_at > seen,
      }))
      const thankItems = (th || []).map((t) => ({
        kind: 'thanks', id: 't' + t.id, message: t.message,
        created_at: t.created_at, isNew: t.created_at > seen,
      }))
      const mediaItems = (mediaNotices || []).map((notice) => ({
        kind: 'media-review', id: 'm' + notice.id, message: notice.message,
        story_excerpt: notice.story_excerpt, created_at: notice.created_at,
        isNew: notice.created_at > seen,
      }))
      const items = [...umbItems, ...thankItems, ...mediaItems].sort((a, b) => b.created_at.localeCompare(a.created_at))
      setState({ loading: false, user, items })
      localStorage.setItem('umbrella_inbox_seen', new Date().toISOString()) // mark read on view
    })()
  }, [])

  async function sendThanks(umbrellaId, message) {
    if (!supabase || sent[umbrellaId]) return
    setBusy(umbrellaId)
    const { error } = await supabase.rpc('send_thanks', { u_id: umbrellaId, msg: message })
    setBusy(null)
    if (error) { alert('Could not send thanks: ' + (error.message || 'try again')); return }
    setSent((s) => ({ ...s, [umbrellaId]: message }))
  }

  if (state.loading) return <p className="empty">Loading…</p>
  if (!state.user) return <p className="empty">Log in to see your notifications.</p>
  if (state.items.length === 0)
    return <p className="empty">No notifications yet. When someone opens an umbrella on your story, you&apos;ll see it here. ☂</p>

  const newCount = state.items.filter((i) => i.isNew).length

  return (
    <>
      {newCount > 0 && <p className="notif-new">{newCount} new</p>}
      <div className="notif-list">
        {state.items.map((n) => {
          if (n.kind === 'media-review') {
            return (
              <div className={'notif' + (n.isNew ? ' new' : '')} key={n.id}>
                <span className="ic">🛡️</span>
                <div className="nbody">
                  <div className="ntext">{n.message}</div>
                  {n.story_excerpt && <div className="nctx">On &ldquo;{excerpt(n.story_excerpt)}&rdquo;</div>}
                </div>
                <span className="ntm">{ago(n.created_at)}</span>
              </div>
            )
          }
          if (n.kind === 'thanks') {
            return (
              <div className={'notif' + (n.isNew ? ' new' : '')} key={n.id}>
                <span className="ic">💛</span>
                <div className="nbody">
                  <div className="ntext">Someone you helped said thanks: <b>&ldquo;{n.message}&rdquo;</b></div>
                </div>
                <span className="ntm">{ago(n.created_at)}</span>
              </div>
            )
          }
          return (
            <div className={'notif' + (n.isNew ? ' new' : '')} key={n.id}>
              <span className="ic">{n.note ? '💬' : '🌂'}</span>
              <div className="nbody">
                <div className="ntext">
                  {n.note
                    ? <>Someone left you a word: <b>&ldquo;{n.note}&rdquo;</b></>
                    : <>Someone opened an umbrella on your story</>}
                </div>
                <div className="nctx">on &ldquo;{excerpt(n.story?.text)}&rdquo;</div>
                {n.note && (
                  sent[n.id]
                    ? <div className="thanks-sent">Sent {sent[n.id]}</div>
                    : <div className="thanks-row">
                        {THANKS.map((t) => (
                          <button key={t} type="button" className="thanks-chip"
                            disabled={busy === n.id}
                            onClick={() => sendThanks(n.id, t)}>{t}</button>
                        ))}
                      </div>
                )}
              </div>
              <span className="ntm">{ago(n.created_at)}</span>
            </div>
          )
        })}
      </div>
    </>
  )
}

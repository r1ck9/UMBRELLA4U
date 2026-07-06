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

export default function InboxList() {
  const [state, setState] = useState({ loading: true, user: null, items: [] })

  useEffect(() => {
    if (!supabase) { setState({ loading: false, user: null, items: [] }); return }
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) { setState({ loading: false, user: null, items: [] }); return }

      const { data: stories } = await supabase.from('stories').select('id,text,category').eq('author_id', user.id)
      const map = {}; (stories || []).forEach((s) => { map[s.id] = s })
      const ids = (stories || []).map((s) => s.id)

      let umbs = []
      if (ids.length) {
        const { data: u } = await supabase.from('umbrellas')
          .select('story_id,note,created_at,user_id')
          .in('story_id', ids).order('created_at', { ascending: false })
        umbs = (u || []).filter((x) => x.user_id !== user.id) // don't notify you about your own
      }

      const seen = localStorage.getItem('umbrella_inbox_seen') || '1970-01-01T00:00:00Z'
      const items = umbs.map((u) => ({ ...u, story: map[u.story_id], isNew: u.created_at > seen }))
      setState({ loading: false, user, items })
      localStorage.setItem('umbrella_inbox_seen', new Date().toISOString()) // mark read on view
    })()
  }, [])

  if (state.loading) return <p className="empty">Loading…</p>
  if (!state.user) return <p className="empty">Log in to see your notifications.</p>
  if (state.items.length === 0)
    return <p className="empty">No notifications yet. When someone opens an umbrella on your story, you&apos;ll see it here. ☂</p>

  const newCount = state.items.filter((i) => i.isNew).length

  return (
    <>
      {newCount > 0 && <p className="notif-new">{newCount} new</p>}
      <div className="notif-list">
        {state.items.map((n, i) => (
          <div className={'notif' + (n.isNew ? ' new' : '')} key={i}>
            <span className="ic">{n.note ? '💬' : '🌂'}</span>
            <div className="nbody">
              <div className="ntext">
                {n.note
                  ? <>Someone left you a word: <b>&ldquo;{n.note}&rdquo;</b></>
                  : <>Someone opened an umbrella on your story</>}
              </div>
              <div className="nctx">on &ldquo;{excerpt(n.story?.text)}&rdquo;</div>
            </div>
            <span className="ntm">{ago(n.created_at)}</span>
          </div>
        ))}
      </div>
    </>
  )
}

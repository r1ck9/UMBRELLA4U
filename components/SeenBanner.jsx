'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

// The "you were seen" moment: when a returning member has new umbrellas on
// their stories since they last checked their inbox, greet them with it right
// at the top of the feed. This is the emotional payoff of the reciprocity loop
// — the single biggest reason someone comes back.
export default function SeenBanner() {
  const [n, setN] = useState(0)
  const [note, setNote] = useState(null)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    if (!supabase) return
    try { if (sessionStorage.getItem('umb_seen_dismissed')) { setHidden(true); return } } catch {}
    ;(async () => {
      const me = await getMe()
      if (!me.userId) return
      const { data: mine } = await supabase.from('stories').select('id').eq('author_id', me.userId)
      const ids = (mine || []).map((s) => s.id)
      if (!ids.length) return
      let seen = '1970-01-01T00:00:00Z'
      try { seen = localStorage.getItem('umbrella_inbox_seen') || seen } catch {}
      const { data, count } = await supabase.from('umbrellas')
        .select('note', { count: 'exact' })
        .in('story_id', ids).neq('user_id', me.userId).gt('created_at', seen)
        .order('created_at', { ascending: false }).limit(1)
      if (count && count > 0) { setN(count); if (data && data[0]?.note) setNote(data[0].note) }
    })()
  }, [])

  if (hidden || n <= 0) return null
  return (
    <div className="seen-banner">
      <span className="sb-ic" aria-hidden="true">☂</span>
      <div className="sb-body">
        <b>{n === 1 ? 'Someone stood with you.' : `${n} people stood with you.`}</b>
        <span>{note ? `“${note}”` : 'While you were away, an umbrella opened for you. You’re not alone. 🫂'}</span>
      </div>
      <Link href="/inbox" className="btn prim sm sb-cta">See who ☂</Link>
      <button className="sb-x" aria-label="Dismiss"
        onClick={() => { try { sessionStorage.setItem('umb_seen_dismissed', '1') } catch {} setHidden(true) }}>✕</button>
    </div>
  )
}

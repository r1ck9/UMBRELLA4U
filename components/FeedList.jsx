'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import StoryCard from '@/components/StoryCard'

const GUEST_LIMIT = 3 // how many stories a logged-out visitor can read before the wall

export default function FeedList({ stories, category = null }) {
  const [guest, setGuest] = useState(null) // null = still checking
  const [modRows, setModRows] = useState(null) // moderators: raw newest-first feed (no ranking)

  useEffect(() => {
    if (!supabase) { setGuest(false); return }
    getMe().then((m) => {
      setGuest(!m.userId)
      // Moderators see the feed in plain time order, no ranking, boost, or
      // off-topic sinking, so it's easier to review everything as it comes in.
      if (m.isModerator) {
        let q = supabase.from('stories').select('*').eq('state', 'live')
          .order('created_at', { ascending: false }).limit(100)
        if (category) q = q.eq('category', category)
        q.then(({ data }) => { if (data) setModRows(data) })
      }
    })
  }, [category])

  const list = modRows || stories
  const limited = guest === true
  const visible = limited ? list.slice(0, GUEST_LIMIT) : list
  const hidden = list.length - visible.length

  return (
    <>
      {visible.map((s) => <StoryCard key={s.id} story={s} />)}
      {limited && (
        <div className="guest-wall">
          <div className="gw-umb" aria-hidden="true">☂</div>
          <h3>Come in from the rain</h3>
          <p>You&apos;re reading as a guest, so you&apos;re only seeing a glimpse.{hidden > 0 ? ` There ${hidden === 1 ? 'is' : 'are'} ${hidden} more ${hidden === 1 ? 'story' : 'stories'} waiting.` : ''} Create a free, anonymous account to read every story, open umbrellas, and share your own weather.</p>
          <div className="row" style={{ gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link className="btn prim" href="/signup">Create a free account</Link>
            <Link className="btn ghost" href="/login">Log in</Link>
          </div>
          <p className="gw-note">Your voice matters here. The more honest stories people share, the less alone everyone feels.</p>
        </div>
      )}
    </>
  )
}

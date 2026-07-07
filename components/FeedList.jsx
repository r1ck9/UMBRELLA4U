'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import StoryCard from '@/components/StoryCard'

const GUEST_LIMIT = 3 // how many stories a logged-out visitor can read before the wall

export default function FeedList({ stories }) {
  const [guest, setGuest] = useState(null) // null = still checking

  useEffect(() => {
    if (!supabase) { setGuest(false); return }
    supabase.auth.getUser().then(({ data }) => setGuest(!data.user))
  }, [])

  const limited = guest === true
  const visible = limited ? stories.slice(0, GUEST_LIMIT) : stories
  const hidden = stories.length - visible.length

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

'use client'
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import { attachStoryAuthors } from '@/lib/storyAuthors'
import StoryCard from '@/components/StoryCard'

const GUEST_LIMIT = 3 // how many stories a logged-out visitor can read before the wall

export default function FeedList({ stories, category = null }) {
  const router = useRouter()
  const [guest, setGuest] = useState(null) // null = still checking
  const [modRows, setModRows] = useState(null) // moderators: raw newest-first feed (no ranking)
  const [isModerator, setIsModerator] = useState(false)

  const loadModeratorRows = useCallback(async () => {
    if (!supabase) return
    let q = supabase.from('stories').select('id,author_id,author_name,anonymous,text,intent,category,content_warning,umbrella_count,state,created_at,boost_count,hug_count,off_topic_count,prompt_id,view_count,weather,giphy_id,photo_path').eq('state', 'live')
      .order('created_at', { ascending: false }).limit(100)
    if (category) q = q.eq('category', category)
    const { data } = await q
    if (data) setModRows(await attachStoryAuthors(supabase, data))
  }, [category])

  useEffect(() => {
    if (!supabase) { setGuest(false); return }
    getMe().then((m) => {
      setGuest(!m.userId)
      setIsModerator(m.isModerator)
      // Moderators see the feed in plain time order, no ranking, boost, or
      // off-topic sinking, so it's easier to review everything as it comes in.
      if (m.isModerator) loadModeratorRows()
    })
  }, [loadModeratorRows])

  useEffect(() => {
    if (!supabase) return
    let active = true
    let refreshTimer
    let lastRefresh = 0

    function refreshInBackground() {
      const now = Date.now()
      if (!active || now - lastRefresh < 750) return
      lastRefresh = now
      window.clearTimeout(refreshTimer)
      refreshTimer = window.setTimeout(() => {
        if (!active) return
        if (isModerator) loadModeratorRows()
        else router.refresh()
      }, 120)
    }

    // Show the cached feed immediately when someone returns, then refresh it
    // without blanking the current cards while fresh data is on the way.
    try {
      const seenBefore = sessionStorage.getItem('haven_feed_seen')
      sessionStorage.setItem('haven_feed_seen', String(Date.now()))
      if (seenBefore) refreshInBackground()
    } catch {}

    const channel = supabase.channel(`feed-stories-${category || 'all'}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stories' }, refreshInBackground)
      .subscribe()
    const onPageShow = (event) => { if (event.persisted) refreshInBackground() }
    const onVisibility = () => { if (document.visibilityState === 'visible') refreshInBackground() }
    window.addEventListener('pageshow', onPageShow)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      active = false
      window.clearTimeout(refreshTimer)
      window.removeEventListener('pageshow', onPageShow)
      document.removeEventListener('visibilitychange', onVisibility)
      supabase.removeChannel(channel)
    }
  }, [category, isModerator, loadModeratorRows, router])

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

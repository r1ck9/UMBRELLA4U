'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import StoryCard from '@/components/StoryCard'
import { supabase } from '@/lib/supabase'

function Results() {
  const q = (useSearchParams().get('q') || '').trim()
  const [state, setState] = useState({ loading: true, stories: [], people: [] })

  useEffect(() => {
    if (!supabase || !q) { setState({ loading: false, stories: [], people: [] }); return }
    ;(async () => {
      const like = `%${q}%`
      const { data: stories } = await supabase.from('stories')
        .select('*').eq('state', 'live').ilike('text', like)
        .order('created_at', { ascending: false }).limit(30)
      // People: discoverable profiles matching username, display name, or a tag.
      const { data: byName } = await supabase.from('profiles')
        .select('username,display_name,pronouns,avatar_url,accent_color,tags')
        .eq('discoverable', true).or(`username.ilike.${like},display_name.ilike.${like}`).limit(20)
      const { data: byTag } = await supabase.from('profiles')
        .select('username,display_name,pronouns,avatar_url,accent_color,tags')
        .eq('discoverable', true).contains('tags', [q.toLowerCase()]).limit(20)
      const seen = new Set(); const people = []
      ;[...(byName || []), ...(byTag || [])].forEach((pr) => {
        if (!seen.has(pr.username)) { seen.add(pr.username); people.push(pr) }
      })
      setState({ loading: false, stories: stories || [], people })
    })()
  }, [q])

  if (!q) return <p className="empty">Type something in the search box above to find stories and people.</p>
  if (state.loading) return <p className="empty">Searching…</p>

  return (
    <>
      <h2 className="feedhead">Results for “{q}”</h2>

      {state.people.length > 0 && (
        <div className="search-people">
          <h3 className="search-lbl">People</h3>
          <div className="people-row">
            {state.people.map((pr) => {
              const av = pr.avatar_url || ''
              const isEmoji = av.startsWith('emoji:')
              const isImg = /^https?:/.test(av)
              const initial = (pr.display_name || pr.username || '☂').trim().charAt(0).toUpperCase()
              const st = isImg ? { backgroundImage: `url(${av})` } : { background: pr.accent_color || '#3f6fa3' }
              return (
                <Link key={pr.username} href={`/u/${encodeURIComponent(pr.username)}`} className="person-chip">
                  <span className="pc-av" style={st}>{isEmoji ? av.slice(6) : (isImg ? '' : initial)}</span>
                  <span className="pc-name">{pr.display_name || pr.username}<em>@{pr.username}</em></span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <h3 className="search-lbl">Stories</h3>
      {state.stories.length === 0
        ? <p className="empty">No stories match “{q}”. 🌫️</p>
        : state.stories.map((s) => <StoryCard key={s.id} story={s} />)}
    </>
  )
}

export default function Search() {
  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          <Suspense fallback={<p className="empty">Loading…</p>}><Results /></Suspense>
        </main>
        <Rail />
      </div>
    </>
  )
}

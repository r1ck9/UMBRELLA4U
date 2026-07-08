'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MobileMenu from '@/components/MobileMenu'

export default function TopBar() {
  const router = useRouter()
  const [email, setEmail] = useState(null)
  const [av, setAv] = useState(null)
  const [unread, setUnread] = useState(0)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!supabase) return
    let active = true
    let channel
    async function load() {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!active) return
      setEmail(user?.email ?? null)
      if (user) {
        const { data: prof } = await supabase.from('profiles')
          .select('avatar_url,accent_color,username').eq('id', user.id).single()
        if (active && prof) setAv(prof)
        const { data: mine } = await supabase.from('story_authors').select('story_id')
        const ids = (mine || []).map((s) => s.story_id)
        if (ids.length) {
          const seen = localStorage.getItem('umbrella_inbox_seen') || '1970-01-01T00:00:00Z'
          const { count } = await supabase.from('umbrellas')
            .select('*', { count: 'exact', head: true })
            .in('story_id', ids).gt('created_at', seen).neq('user_id', user.id)
          if (active) setUnread(count || 0)
          // Live: bump the bell the moment someone opens an umbrella on my story
          // (no-op if realtime replication isn't enabled on the umbrellas table).
          const mySet = new Set(ids)
          channel = supabase.channel('bell:' + user.id)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'umbrellas' }, (payload) => {
              const row = payload.new
              if (active && row && mySet.has(row.story_id) && row.user_id !== user.id) {
                setUnread((u) => u + 1)
              }
            })
            .subscribe()
        }
      }
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null))
    return () => { active = false; sub.subscription.unsubscribe(); if (channel) supabase.removeChannel(channel) }
  }, [])

  async function logout() { await supabase?.auth.signOut() }

  // Render the profile picture (preset emoji / uploaded image / colored initial).
  const url = av?.avatar_url || ''
  const isEmoji = url.startsWith('emoji:')
  const isImg = /^https?:/.test(url)
  const initial = (av?.username || email || '☂').trim().charAt(0).toUpperCase()
  const avStyle = isImg ? { backgroundImage: `url(${url})` } : { background: av?.accent_color || 'var(--shelter)' }

  return (
    <header className="topbar">
      <MobileMenu />
      <Link href="/feed" className="brand" title="Back to the main feed">☂ Umbrella</Link>
      <form className="tb-search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`) }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stories & people" aria-label="Search" />
      </form>
      <div className="tb-right">
        <Link href="/welcome" className="tb-help" title="How to use Umbrella">?</Link>
        {email ? (
          <>
            <Link href="/inbox" className="bell" title="Your inbox">📨{unread > 0 && <span className="dotn">{unread}</span>}</Link>
            <Link href="/profile" className="tb-avatar" style={avStyle} title={`Your profile${email ? ' · ' + email : ''}`}>
              {isEmoji ? url.slice(6) : (isImg ? '' : initial)}
            </Link>
            <button className="btn ghost sm tb-logout" onClick={logout}>Log out</button>
          </>
        ) : (
          <>
            <Link href="/login" className="btn ghost sm">Log in</Link>
            <Link href="/signup" className="btn prim sm">Sign up</Link>
          </>
        )}
      </div>
    </header>
  )
}

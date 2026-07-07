'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function TopBar() {
  const router = useRouter()
  const [email, setEmail] = useState(null)
  const [unread, setUnread] = useState(0)
  const [q, setQ] = useState('')

  useEffect(() => {
    if (!supabase) return
    let active = true
    async function load() {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!active) return
      setEmail(user?.email ?? null)
      if (user) {
        const { data: mine } = await supabase.from('stories').select('id').eq('author_id', user.id)
        const ids = (mine || []).map((s) => s.id)
        if (ids.length) {
          const seen = localStorage.getItem('umbrella_inbox_seen') || '1970-01-01T00:00:00Z'
          const { count } = await supabase.from('umbrellas')
            .select('*', { count: 'exact', head: true })
            .in('story_id', ids).gt('created_at', seen).neq('user_id', user.id)
          if (active) setUnread(count || 0)
        }
      }
    }
    load()
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setEmail(s?.user?.email ?? null))
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  async function logout() { await supabase?.auth.signOut() }

  return (
    <header className="topbar">
      <Link href="/feed" className="brand" title="Back to the main feed">☂ Umbrella</Link>
      <form className="tb-search" onSubmit={(e) => { e.preventDefault(); if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`) }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search stories & people" aria-label="Search" />
      </form>
      <div className="tb-right">
        {email ? (
          <>
            <Link href="/inbox" className="bell" title="Your inbox">📨{unread > 0 && <span className="dotn">{unread}</span>}</Link>
            <Link href="/profile" className="chip">{email}</Link>
            <button className="btn ghost sm" onClick={logout}>Log out</button>
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

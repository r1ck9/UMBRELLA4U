'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import { supabase } from '@/lib/supabase'
import { bannerStyle } from '@/lib/banners'
import { streakBadge } from '@/lib/badges'

function since(ts) {
  if (!ts) return '—'
  const d = new Date(ts)
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export default function PublicProfile({ params }) {
  const router = useRouter()
  const uname = decodeURIComponent(params.username || '')
  const [state, setState] = useState({ loading: true, prof: null })
  const [stats, setStats] = useState({ stories: 0, received: 0, opened: 0 })
  const [reported, setReported] = useState(false)

  useEffect(() => {
    if (!supabase) { setState({ loading: false, prof: null }); return }
    ;(async () => {
      const { data: prof } = await supabase.from('profiles').select('*').eq('username', uname).single()
      if (!prof) { setState({ loading: false, prof: null }); return }
      // Only attributable (non-anonymous) stories count toward a public profile.
      const { data: mine } = await supabase.from('stories')
        .select('umbrella_count').eq('author_id', prof.id).eq('anonymous', false).eq('state', 'live')
      const s = mine || []
      const { data: opened } = await supabase.rpc('umbrellas_opened_by', { uid: prof.id })
      setStats({
        stories: s.length,
        received: s.reduce((a, x) => a + (x.umbrella_count || 0), 0),
        opened: Number(opened) || 0
      })
      setState({ loading: false, prof })
    })()
  }, [uname])

  async function report() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setReported(true)
    await supabase.from('reports').insert({ target_type: 'profile', target_id: state.prof.id, reporter_id: data.user.id })
  }

  const { loading, prof } = state
  const av = prof?.avatar_url || ''
  const isEmoji = av.startsWith('emoji:')
  const isImg = /^https?:/.test(av)
  const initial = (prof?.display_name || prof?.username || '☂').trim().charAt(0).toUpperCase()
  const avStyle = isImg ? { backgroundImage: `url(${av})` } : { background: prof?.accent_color || '#3f6fa3' }

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          {loading ? <p className="empty">Loading…</p>
            : !prof ? <p className="empty">No one here by that name. 🌫️</p>
            : (
              <div className="profile-card">
                <div className="pf-banner" style={bannerStyle(prof.banner_theme)} />
                <div className="pf-top">
                  <div className="pf-avatar" style={avStyle}>{isEmoji ? av.slice(6) : (isImg ? '' : initial)}</div>
                  <div className="pf-id">
                    <div className="pf-name">
                      {prof.display_name || prof.username}
                      {streakBadge(prof.streak_count || 0) && (
                        <span className="streak-badge" title={streakBadge(prof.streak_count).label}>{streakBadge(prof.streak_count).icon}</span>
                      )}
                    </div>
                    <div className="pf-handle">@{prof.username}{prof.pronouns ? ' · ' + prof.pronouns : ''}</div>
                    {prof.status_weather && <div className="pf-status">{prof.status_weather}</div>}
                  </div>
                </div>
                <div className="pf-stats">
                  <div><b>{stats.stories}</b> stories</div>
                  <div><b>{stats.opened}</b> umbrellas opened</div>
                  <div><b>{stats.received}</b> received</div>
                  <div><b>{since(prof.created_at)}</b> joined</div>
                </div>
                {prof.about_me && <p className="pf-about">{prof.about_me}</p>}
                {prof.tags?.length > 0 && (
                  <div className="pf-tags">{prof.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>
                )}
                <div className="pf-actions">
                  {reported
                    ? <span className="reported">Reported ✓</span>
                    : <button className="report" onClick={report}>🛑 Report this profile</button>}
                </div>
              </div>
            )}
        </main>
        <Rail />
      </div>
    </>
  )
}

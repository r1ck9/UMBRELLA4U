'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import StoryCard from '@/components/StoryCard'
import FollowButton from '@/components/FollowButton'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import { bannerStyle } from '@/lib/banners'
import { earnedBadges } from '@/lib/badges'

function since(ts) {
  if (!ts) return ' '
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
}

export default function PublicProfile({ params }) {
  const router = useRouter()
  const uname = decodeURIComponent(params.username || '')
  const [state, setState] = useState({ loading: true, prof: null })
  const [stats, setStats] = useState({ stories: 0, received: 0, opened: 0 })
  const [counts, setCounts] = useState({ followers: 0, following: 0 })
  const [channels, setChannels] = useState([])
  const [posts, setPosts] = useState([])
  const [sel, setSel] = useState('all')
  const [isOwner, setIsOwner] = useState(false)
  const [reported, setReported] = useState(false)

  useEffect(() => {
    if (!supabase) { setState({ loading: false, prof: null }); return }
    ;(async () => {
      const { data: prof } = await supabase.from('profiles').select('id,username,display_name,pronouns,status_weather,about_me,accent_color,avatar_url,banner_url,banner_theme,tags,discoverable,notify_email,onboarded,post_count,streak_count,umbrellas_sent,is_moderator,created_at').eq('username', uname).single()
      if (!prof) { setState({ loading: false, prof: null }); return }

      const me = await getMe()
      setIsOwner(me.userId === prof.id)

      const [{ data: mine }, { data: opened }, { data: fc }, { data: chs }, { data: ps }] = await Promise.all([
        supabase.from('stories').select('umbrella_count').eq('author_id', prof.id).eq('anonymous', false).eq('state', 'live'),
        supabase.rpc('umbrellas_opened_by', { uid: prof.id }),
        supabase.rpc('follow_counts', { target: prof.id }),
        supabase.from('channels').select('id,name').eq('owner_id', prof.id).order('created_at', { ascending: true }),
        supabase.from('stories').select('id,author_id,author_name,anonymous,text,intent,category,content_warning,umbrella_count,state,created_at,boost_count,hug_count,off_topic_count,prompt_id,view_count,weather').eq('author_id', prof.id).eq('anonymous', false).eq('state', 'live').order('created_at', { ascending: false })
      ])
      const s = mine || []
      setStats({ stories: s.length, received: s.reduce((a, x) => a + (x.umbrella_count || 0), 0), opened: Number(opened) || 0 })
      const row = Array.isArray(fc) ? fc[0] : fc
      setCounts({ followers: Number(row?.followers) || 0, following: Number(row?.following) || 0 })
      setChannels(chs || [])
      setPosts(ps || [])
      setState({ loading: false, prof })
    })()
  }, [uname])

  async function report() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setReported(true)
    await supabase.from('reports').insert({ target_type: 'profile', target_id: state.prof.id, reporter_id: data.user.id })
  }

  async function newChannel() {
    const name = (window.prompt('Name your new channel (e.g. "Small wins", "Poetry")') || '').trim()
    if (!name) return
    const { data, error } = await supabase.from('channels').insert({ owner_id: state.prof.id, name }).select('id,name').single()
    if (error) { alert('Could not create channel: ' + error.message); return }
    setChannels((c) => [...c, data])
    setSel(data.id)
  }

  const { loading, prof } = state
  const av = prof?.avatar_url || ''
  const isEmoji = av.startsWith('emoji:')
  const isImg = /^https?:/.test(av)
  const initial = (prof?.display_name || prof?.username || '☂').trim().charAt(0).toUpperCase()
  const avStyle = isImg ? { backgroundImage: `url(${av})` } : { background: prof?.accent_color || '#76509a' }
  const shown = posts.filter((p) => sel === 'all' || p.channel_id === sel)

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          {loading ? <p className="empty">Loading…</p>
            : !prof ? <p className="empty">No one here by that name. 🌫️</p>
            : (
              <>
                <div className="profile-card">
                  <div className="pf-banner" style={bannerStyle(prof.banner_theme)} />
                  <div className="pf-top">
                    <div className="pf-avatar" style={avStyle}>{isEmoji ? av.slice(6) : (isImg ? '' : initial)}</div>
                    <div className="pf-id">
                      <div className="pf-name">
                        {prof.display_name || prof.username}
                        {earnedBadges({ streak: prof.streak_count || 0, posts: stats.stories, umbrellasSent: stats.opened })
                          .map((b) => <span key={b.label} className="streak-badge" title={b.label}>{b.icon}</span>)}
                      </div>
                      <div className="pf-handle">@{prof.username}{prof.pronouns ? ' · ' + prof.pronouns : ''}</div>
                      {prof.status_weather && <div className="pf-status">{prof.status_weather}</div>}
                    </div>
                    <FollowButton targetId={prof.id} onChange={(d) => setCounts((c) => ({ ...c, followers: Math.max(0, c.followers + d) }))} />
                  </div>
                  <div className="pf-stats">
                    <div><b>{counts.followers}</b> followers</div>
                    <div><b>{counts.following}</b> following</div>
                    <div><b>{stats.stories}</b> stories</div>
                    <div><b>{stats.received}</b> received</div>
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

                {(channels.length > 0 || isOwner) && (
                  <div className="chan-tabs">
                    <button className={'chan-tab' + (sel === 'all' ? ' on' : '')} onClick={() => setSel('all')}>All</button>
                    {channels.map((c) => (
                      <button key={c.id} className={'chan-tab' + (sel === c.id ? ' on' : '')} onClick={() => setSel(c.id)}>{c.name}</button>
                    ))}
                    {isOwner && <button className="chan-tab new" onClick={newChannel}>+ New channel</button>}
                  </div>
                )}

                <p className="sub" style={{ color: 'var(--ink-3)', margin: '4px 0 10px' }}>
                  {isOwner ? 'Your posts' : `Posts by @${prof.username}`}{sel !== 'all' ? ' · this channel' : ''}
                </p>
                {shown.length === 0
                  ? <p className="empty">No posts here yet. 🌤️</p>
                  : shown.map((s) => <StoryCard key={s.id} story={s} />)}
              </>
            )}
        </main>
        <Rail />
      </div>
    </>
  )
}

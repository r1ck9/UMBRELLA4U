'use client'
import { useEffect, useState } from 'react'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import { supabase } from '@/lib/supabase'

const ACCENTS = ['#3f6fa3', '#e0655e', '#c8506a', '#8b6fc9', '#3f9d9d', '#3f9d78', '#e8913c']
const PRESETS = ['☂', '🌧', '🌱', '🌊', '🏐', '🎧', '🎨', '🌙']

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState({ stories: 0, received: 0 })
  const [p, setP] = useState({
    username: '', display_name: '', pronouns: '', status_weather: '', about_me: '', accent_color: '#3f6fa3', avatar_url: ''
  })

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setLoading(false); return }
      setUser(data.user)
      const { data: prof } = await supabase.from('profiles').select('*').eq('id', data.user.id).single()
      if (prof) setP({
        username: prof.username || '', display_name: prof.display_name || '', pronouns: prof.pronouns || '',
        status_weather: prof.status_weather || '', about_me: prof.about_me || '',
        accent_color: prof.accent_color || '#3f6fa3', avatar_url: prof.avatar_url || ''
      })
      const { data: mine } = await supabase.from('stories').select('id,umbrella_count').eq('author_id', data.user.id)
      const s = mine || []
      setStats({ stories: s.length, received: s.reduce((a, x) => a + (x.umbrella_count || 0), 0) })
      setLoading(false)
    })()
  }, [])

  function set(k, v) { setP((prev) => ({ ...prev, [k]: v })); setSaved(false) }

  async function save() {
    const { error } = await supabase.from('profiles').update({
      display_name: p.display_name, pronouns: p.pronouns, status_weather: p.status_weather,
      about_me: p.about_me, accent_color: p.accent_color, avatar_url: p.avatar_url
    }).eq('id', user.id)
    if (error) { alert(error.message); return }
    setSaved(true)
  }

  if (loading) return (<><TopBar /><main className="container"><p className="empty">Loading…</p></main></>)
  if (!user) return (<><TopBar /><main className="container"><h1>Your profile</h1><p className="sub" style={{ color: 'var(--ink-2)' }}>Log in to set up your profile.</p></main></>)

  const initial = (p.display_name || p.username || '☂').trim().charAt(0).toUpperCase()
  // avatar_url holds either "emoji:X" (preset) or a real URL (legacy uploads)
  const isEmoji = p.avatar_url.startsWith('emoji:')
  const isImg = /^https?:/.test(p.avatar_url)
  const avStyle = isImg ? { backgroundImage: `url(${p.avatar_url})` } : { background: p.accent_color }
  const avInner = isEmoji ? p.avatar_url.slice(6) : (isImg ? '' : initial)

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          {/* presentable profile */}
          <div className="profile-card">
            <div className="pf-banner" style={{ background: `linear-gradient(120deg, ${p.accent_color}, #26344e)` }} />
            <div className="pf-top">
              <div className="pf-avatar" style={avStyle}>{avInner}</div>
              <div className="pf-id">
                <div className="pf-name">{p.display_name || p.username || 'you'}</div>
                <div className="pf-handle">@{p.username}{p.pronouns ? ' · ' + p.pronouns : ''}</div>
                {p.status_weather && <div className="pf-status">{p.status_weather}</div>}
              </div>
            </div>
            <div className="pf-stats">
              <div><b>{stats.stories}</b> stories</div>
              <div><b>{stats.received}</b> umbrellas received</div>
            </div>
            {p.about_me && <p className="pf-about">{p.about_me}</p>}
          </div>

          {/* editor */}
          <div className="pf-edit">
            <h3>Edit profile</h3>
            <div className="pform">
              <label>Avatar
                <div className="swatches avset">
                  {PRESETS.map((e) => (
                    <button key={e} type="button" className={'sw av' + (p.avatar_url === 'emoji:' + e ? ' on' : '')}
                      style={{ background: p.accent_color }} onClick={() => set('avatar_url', 'emoji:' + e)} aria-label={'avatar ' + e}>{e}</button>
                  ))}
                </div>
              </label>
              <p className="up-note">Pick an avatar for now. Custom photo uploads are coming once we add image moderation to keep everyone safe. 🔒</p>

              <label>Display name<input value={p.display_name} maxLength={30} onChange={(e) => set('display_name', e.target.value)} placeholder={p.username} /></label>
              <label>Pronouns<input value={p.pronouns} maxLength={30} onChange={(e) => set('pronouns', e.target.value)} placeholder="they/them (optional)" /></label>
              <label>Today&apos;s weather (status)<input value={p.status_weather} maxLength={60} onChange={(e) => set('status_weather', e.target.value)} placeholder="🌧 heavy but managing" /></label>
              <label>About me<textarea value={p.about_me} maxLength={300} onChange={(e) => set('about_me', e.target.value)} placeholder="Volleyball. Pink hoodies. Still figuring it out." /></label>
              <label>Accent color
                <div className="swatches">
                  {ACCENTS.map((c) => (
                    <button key={c} type="button" className={'sw' + (p.accent_color === c ? ' on' : '')} style={{ background: c }} onClick={() => set('accent_color', c)} aria-label={c} />
                  ))}
                </div>
              </label>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <button className="btn prim" onClick={save}>Save profile</button>
                {saved && <span className="psaved">✓ Saved</span>}
              </div>
            </div>
          </div>
        </main>
        <Rail />
      </div>
    </>
  )
}

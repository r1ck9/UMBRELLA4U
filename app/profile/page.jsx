'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import { supabase } from '@/lib/supabase'
import { BANNERS, bannerStyle } from '@/lib/banners'
import EmojiPicker from '@/components/EmojiPicker'
import { earnedBadges } from '@/lib/badges'

const ACCENTS = ['#3f6fa3', '#e0655e', '#c8506a', '#8b6fc9', '#3f9d9d', '#3f9d78', '#e8913c']

// Rotating example bios, a fresh one is picked each time the page opens.
const BIO_EXAMPLES = [
  'Volleyball, playlists on repeat, and still figuring it out. 🌱',
  'Art kid. Overthinker. Trying to be kinder to myself.',
  'Loves rainy days, bad puns, and my dog. Here to listen.',
  'Just a teen navigating school, friends, and everything in between.',
  'Books over parties. Anxiety is loud, but so is my hope.',
  'Learning guitar (badly). Big feelings, small steps.',
  'Third-culture kid finding where I belong. 🌍',
  'Some days heavy, some days light, either way, I’m here.',
  'Coffee, coding, and cats. Say hi. ☕',
  'Trying my best, one deep breath at a time.',
  'Music makes it bearable. Ask me for song recs. 🎧',
  'New school, new city, still me. Figuring it out.',
  'Soft-spoken, but I’ve always got your back.',
  'Plant parent in training 🌿, here to hold umbrellas.',
  'Gamer, dreamer, occasional crier. All are welcome here.'
]
const STATUS_EXAMPLES = [
  '🌧 heavy but managing', '⛅ better than yesterday', '🌱 slowly growing',
  '🌊 riding the waves', '☀️ actually okay today', '🌙 tired but hopeful',
  '🌫 a little foggy', '⛈ rough week, still standing'
]
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)]

export default function Profile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState({ stories: 0, received: 0, sent: 0 })
  const [streak, setStreak] = useState(0)
  const [tagInput, setTagInput] = useState('')
  // Fresh example placeholders each time the page mounts.
  const [ph] = useState(() => ({ bio: pick(BIO_EXAMPLES), status: pick(STATUS_EXAMPLES) }))
  const [p, setP] = useState({
    username: '', display_name: '', pronouns: '', status_weather: '', about_me: '',
    accent_color: '#3f6fa3', avatar_url: '', banner_theme: 'rain', tags: []
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
        accent_color: prof.accent_color || '#3f6fa3', avatar_url: prof.avatar_url || '',
        banner_theme: prof.banner_theme || 'rain', tags: prof.tags || []
      })
      if (prof) setStreak(prof.streak_count || 0)
      const { data: mine } = await supabase.from('stories').select('id,umbrella_count').eq('author_id', data.user.id)
      const s = mine || []
      setStats({
        stories: s.length,
        received: s.reduce((a, x) => a + (x.umbrella_count || 0), 0),
        sent: prof?.umbrellas_sent || 0
      })
      setLoading(false)
    })()
  }, [])

  function set(k, v) { setP((prev) => ({ ...prev, [k]: v })); setSaved(false) }

  function addTag() {
    const t = tagInput.trim().replace(/^#/, '').slice(0, 20)
    if (t && !p.tags.includes(t) && p.tags.length < 8) set('tags', [...p.tags, t])
    setTagInput('')
  }
  function removeTag(t) { set('tags', p.tags.filter((x) => x !== t)) }

  async function save() {
    const { error } = await supabase.from('profiles').update({
      display_name: p.display_name, pronouns: p.pronouns, status_weather: p.status_weather,
      about_me: p.about_me, accent_color: p.accent_color, avatar_url: p.avatar_url,
      banner_theme: p.banner_theme, tags: p.tags
    }).eq('id', user.id)
    if (error) {
      alert(/blocked_content/i.test(error.message)
        ? "Some of your profile text isn’t allowed, please remove any hurtful or unsafe words and try again. 💛"
        : error.message)
      return
    }
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
  const badges = earnedBadges({ streak, posts: stats.stories, umbrellasSent: stats.sent })

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          {/* presentable profile */}
          <div className="profile-card">
            <div className="pf-banner" style={bannerStyle(p.banner_theme)} />
            <div className="pf-top">
              <div className="pf-avatar" style={avStyle}>{avInner}</div>
              <div className="pf-id">
                <div className="pf-name">{p.display_name || p.username || 'you'}{badges.map((b) => <span key={b.label} className="streak-badge" title={b.label}>{b.icon}</span>)}</div>
                <div className="pf-handle">@{p.username}{p.pronouns ? ' · ' + p.pronouns : ''}</div>
                {p.status_weather && <div className="pf-status">{p.status_weather}</div>}
              </div>
            </div>
            <div className="pf-stats">
              <div><b>{stats.stories}</b> stories</div>
              <div><b>{stats.received}</b> umbrellas received</div>
              <div><b>{stats.sent}</b> umbrellas sent</div>
              <div><b>{streak}</b> day streak</div>
            </div>
            {badges.length > 0 && (
              <div className="pf-badges">
                {badges.map((b) => (
                  <span key={b.label} className="pf-badge"><span className="pf-badge-ic">{b.icon}</span>{b.label}</span>
                ))}
              </div>
            )}
            {p.about_me && <p className="pf-about">{p.about_me}</p>}
            {p.tags.length > 0 && <div className="pf-tags">{p.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div>}
            {p.username && <Link className="pf-viewlink" href={`/u/${encodeURIComponent(p.username)}`}>View my public profile →</Link>}
          </div>

          {/* editor */}
          <div className="pf-edit">
            <h3>Edit profile</h3>
            <div className="pform">
              <label>Avatar
                <EmojiPicker value={p.avatar_url} accent={p.accent_color} onSelect={(e) => set('avatar_url', 'emoji:' + e)} />
              </label>
              <p className="up-note">Choose any emoji as your picture, on Apple devices you’ll see the Apple emoji set. Custom photo uploads are coming once we add image moderation to keep everyone safe. 🔒</p>

              <label>Display name<input value={p.display_name} maxLength={30} onChange={(e) => set('display_name', e.target.value)} placeholder={p.username} /></label>
              <label>Pronouns<input value={p.pronouns} maxLength={30} onChange={(e) => set('pronouns', e.target.value)} placeholder="they/them (optional)" /></label>
              <label>Today&apos;s weather (status)<input value={p.status_weather} maxLength={60} onChange={(e) => set('status_weather', e.target.value)} placeholder={ph.status} /></label>
              <label>About me<textarea value={p.about_me} maxLength={300} onChange={(e) => set('about_me', e.target.value)} placeholder={`e.g. ${ph.bio}`} /></label>
              <p className="privacy-note">🔒 Don&apos;t put your real name, school, or address here. Combining identifying details can reveal who you are.</p>
              <label>Accent color
                <div className="swatches">
                  {ACCENTS.map((c) => (
                    <button key={c} type="button" className={'sw' + (p.accent_color === c ? ' on' : '')} style={{ background: c }} onClick={() => set('accent_color', c)} aria-label={c} />
                  ))}
                </div>
              </label>
              <label>Banner
                <div className="swatches bnset">
                  {BANNERS.map((b) => (
                    <button key={b.key} type="button" title={b.name}
                      className={'sw bn' + (p.banner_theme === b.key ? ' on' : '')}
                      style={bannerStyle(b.key)} onClick={() => set('banner_theme', b.key)} aria-label={b.name} />
                  ))}
                </div>
              </label>
              <label>Interests / tags
                <div className="tag-edit">
                  {p.tags.map((t) => (
                    <span key={t} className="tag rm" onClick={() => removeTag(t)}>{t} ✕</span>
                  ))}
                  {p.tags.length < 8 && (
                    <input className="tag-input" value={tagInput} maxLength={20}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                      onBlur={addTag} placeholder="+ add a tag (Enter)" />
                  )}
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

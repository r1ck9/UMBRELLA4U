'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { supabase } from '@/lib/supabase'
import { BANNERS, bannerStyle } from '@/lib/banners'
import { GUIDELINES } from '@/lib/guidelines'
import EmojiPicker from '@/components/EmojiPicker'
import { track } from '@/lib/analytics'

const ACCENTS = ['#3f6fa3', '#e0655e', '#c8506a', '#8b6fc9', '#3f9d9d', '#3f9d78', '#e8913c']
const USERNAME_IDEAS = ['rainy_owl', 'quiet_fern', 'soft_static', 'paper_boats', 'moonlit_kid', 'still_water', 'little_lighthouse', 'warm_socks', 'cloud_nine', 'half_asleep', 'tiny_thunder', 'sunday_dust']
const SUGGESTED_TAGS = ['art', 'music', 'gaming', 'anime', 'books', 'poetry', 'film', 'photography', 'coding', 'sports', 'volleyball', 'skating', 'dance', 'coffee', 'plants', 'baking', 'anxiety', 'mental health', 'lgbtq+', 'newcomer', 'faith', 'languages', 'studying', 'night owl', 'introvert', 'overthinker', 'trying my best']
const BIO_EXAMPLES = [
  'Art kid. Overthinker. Trying to be kinder to myself.',
  'Volleyball, playlists on repeat, still figuring it out. 🌱',
  'Loves rainy days, bad puns, and my dog. Here to listen.',
  'Third-culture kid finding where I belong. 🌍',
  'Books over parties. Anxiety is loud, but so is my hope.',
  'New school, new city, still me.',
  'Quiet, but I’ve always got your back.',
  'Learning guitar badly. Big feelings, small steps.'
]
const STATUS_EXAMPLES = ['🌧 heavy but managing', '⛅ better than yesterday', '🌱 slowly growing', '🌊 riding the waves', '☀️ actually okay today', '🌙 tired but hopeful']
const pick = (a) => a[Math.floor(Math.random() * a.length)]

export default function Onboarding() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState(0)
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [p, setP] = useState({
    username: '', display_name: '', pronouns: '', status_weather: '', about_me: '',
    accent_color: '#3f6fa3', avatar_url: 'emoji:☂', banner_theme: 'rain', tags: []
  })
  const [tagInput, setTagInput] = useState('')
  const [ph] = useState(() => ({ bio: pick(BIO_EXAMPLES), status: pick(STATUS_EXAMPLES), names: [...USERNAME_IDEAS].sort(() => Math.random() - 0.5).slice(0, 4) }))

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setLoading(false); return }
      setUser(data.user)
      const { data: prof } = await supabase.from('profiles').select('id,username,display_name,pronouns,status_weather,about_me,accent_color,avatar_url,banner_url,banner_theme,tags,discoverable,notify_email,onboarded,post_count,streak_count,umbrellas_sent,is_moderator,last_active_date,created_at').eq('id', data.user.id).single()
      if (prof?.onboarded) { router.replace('/feed'); return }
      if (prof) setP((prev) => ({
        ...prev,
        username: prof.username || '', display_name: prof.display_name || '',
        avatar_url: prof.avatar_url || 'emoji:☂', accent_color: prof.accent_color || '#3f6fa3'
      }))
      setLoading(false)
    })()
  }, [router])

  function set(k, v) { setP((prev) => ({ ...prev, [k]: v })); setErr('') }
  function addTag() {
    const t = tagInput.trim().replace(/^#/, '').slice(0, 20)
    if (t && !p.tags.includes(t) && p.tags.length < 8) set('tags', [...p.tags, t])
    setTagInput('')
  }

  async function finish() {
    setSaving(true); setErr('')
    const uname = p.username.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
    if (uname.length < 3) { setErr('Pick a username with at least 3 letters/numbers.'); setSaving(false); setStep(1); return }
    const { error } = await supabase.from('profiles').update({
      username: uname, display_name: p.display_name || uname, pronouns: p.pronouns,
      status_weather: p.status_weather, about_me: p.about_me, accent_color: p.accent_color,
      avatar_url: p.avatar_url, banner_theme: p.banner_theme, tags: p.tags, onboarded: true
    }).eq('id', user.id)
    setSaving(false)
    if (error) {
      if (/duplicate|unique/i.test(error.message)) { setErr('That username is taken, try another.'); setStep(1) }
      else if (/blocked_content/i.test(error.message)) { setErr('Please remove any hurtful or unsafe words from your name, bio, or tags. 💛'); setStep(1) }
      else setErr(error.message)
      return
    }
    track('registered')
    router.push('/feed')
  }

  if (loading) return (<><TopBar /><main className="container"><p className="empty">Loading…</p></main></>)
  if (!user) return (<><TopBar /><main className="container"><h1>Set up your profile</h1><p className="sub">Please <Link href="/signup">sign up</Link> or <Link href="/login">log in</Link> first.</p></main></>)

  const avInner = p.avatar_url.startsWith('emoji:') ? p.avatar_url.slice(6) : (p.display_name || p.username || '☂').charAt(0).toUpperCase()
  const STEPS = ['Welcome', 'Your name', 'Your look', 'About you', 'Kindness']

  return (
    <>
      <TopBar />
      <main className="container onb">
        <div className="onb-dots">
          {STEPS.map((s, i) => <span key={s} className={'onb-dot' + (i === step ? ' on' : '') + (i < step ? ' done' : '')} />)}
        </div>

        {step === 0 && (
          <div className="onb-step">
            <h1>Welcome in from the rain ☂</h1>
            <p className="onb-lead">Umbrella is a quiet place to share what you’re carrying and to stand with others. Let’s set up your anonymous profile, it takes a minute.</p>
            <ul className="onb-quick">
              <li>🕶️ You’re anonymous, no real names, ever.</li>
              <li>☂ People respond with one umbrella, the way you asked to be met.</li>
              <li>🛟 Word filter, AI screening, reports and human moderators keep it safe.</li>
            </ul>
            <p className="onb-more"><Link href="/welcome">Read the full “how it works &amp; why you’re safe” →</Link></p>
          </div>
        )}

        {step === 1 && (
          <div className="onb-step">
            <h1>Pick a name</h1>
            <p className="onb-lead">This is your handle, make it something that isn’t your real name.</p>
            <label>Username<input value={p.username} maxLength={20}
              onChange={(e) => set('username', e.target.value)} placeholder={ph.names[0]} /></label>
            <div className="onb-suggest">
              <span>Need ideas?</span>
              {ph.names.map((n) => <button key={n} type="button" className="sugg" onClick={() => set('username', n)}>{n}</button>)}
            </div>
            <label>Display name (optional)<input value={p.display_name} maxLength={30}
              onChange={(e) => set('display_name', e.target.value)} placeholder="how you want to appear" /></label>
            <label>Pronouns (optional)<input value={p.pronouns} maxLength={30}
              onChange={(e) => set('pronouns', e.target.value)} placeholder="they/them" /></label>
          </div>
        )}

        {step === 2 && (
          <div className="onb-step">
            <h1>Make it yours</h1>
            <div className="onb-preview">
              <div className="pf-banner" style={bannerStyle(p.banner_theme)} />
              <div className="pf-avatar" style={{ background: p.accent_color }}>{avInner}</div>
            </div>
            <label>Avatar
              <EmojiPicker value={p.avatar_url} accent={p.accent_color} onSelect={(e) => set('avatar_url', 'emoji:' + e)} />
            </label>
            <label>Accent
              <div className="swatches">
                {ACCENTS.map((c) => <button key={c} type="button" className={'sw' + (p.accent_color === c ? ' on' : '')} style={{ background: c }} onClick={() => set('accent_color', c)} />)}
              </div>
            </label>
            <label>Banner
              <div className="swatches bnset">
                {BANNERS.map((b) => <button key={b.key} type="button" title={b.name} className={'sw bn' + (p.banner_theme === b.key ? ' on' : '')} style={bannerStyle(b.key)} onClick={() => set('banner_theme', b.key)} />)}
              </div>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="onb-step">
            <h1>A little about you</h1>
            <p className="onb-lead">All optional. Whatever you’re into, there’s a corner here for it, tags help you find your people.</p>
            <label>Today’s weather (status)<input value={p.status_weather} maxLength={60}
              onChange={(e) => set('status_weather', e.target.value)} placeholder={ph.status} /></label>
            <label>About me<textarea value={p.about_me} maxLength={300}
              onChange={(e) => set('about_me', e.target.value)} placeholder={`e.g. ${ph.bio}`} /></label>
            <p className="privacy-note">🔒 Skip your real name, school, or address. Staying anonymous is what keeps you safe here.</p>
            <label>Interests / tags
              <div className="tag-edit">
                {p.tags.map((t) => <span key={t} className="tag rm" onClick={() => set('tags', p.tags.filter((x) => x !== t))}>{t} ✕</span>)}
                {p.tags.length < 8 && (
                  <input className="tag-input" value={tagInput} maxLength={20}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }}
                    onBlur={addTag} placeholder="+ type your own (Enter)" />
                )}
              </div>
              {p.tags.length < 8 && (
                <div className="onb-suggest tagsugg">
                  {SUGGESTED_TAGS.filter((t) => !p.tags.includes(t)).slice(0, 16).map((t) => (
                    <button key={t} type="button" className="sugg" onClick={() => p.tags.length < 8 && set('tags', [...p.tags, t])}>+ {t}</button>
                  ))}
                </div>
              )}
            </label>
          </div>
        )}

        {step === 4 && (
          <div className="onb-step">
            <h1>Keep it a shelter</h1>
            <p className="onb-lead">We know struggling is hard. Please keep your words safe and kind, to yourself, and to everyone here. 🫂</p>
            <ul className="rulelist">
              {GUIDELINES.map((r, i) => <li key={i}><span className="ri">{r.i}</span>{r.t}</li>)}
            </ul>
            <label className="agree-check">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I’ve read this and I’ll follow it.
            </label>
          </div>
        )}

        {err && <p className="msg" style={{ color: 'var(--care)' }}>{err}</p>}

        <div className="onb-nav">
          {step > 0 && <button className="btn ghost sm" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 4 && <button className="btn prim sm" onClick={() => setStep(step + 1)}>Continue</button>}
          {step === 4 && <button className="btn prim sm" disabled={!agreed || saving} onClick={finish}>{saving ? 'Setting up…' : 'Enter Haven ☂'}</button>}
        </div>
      </main>
    </>
  )
}

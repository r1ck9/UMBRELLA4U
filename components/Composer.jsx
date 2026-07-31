'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GUIDELINES } from '@/lib/guidelines'
import { CATEGORIES } from '@/lib/categories'
import { WEEKLY_PROMPT } from '@/lib/prompt'
import { DAILY_STORY_LIMIT } from '@/lib/config'
import { track } from '@/lib/analytics'
import { CRISIS, CRISIS_MESSAGE } from '@/lib/crisis'

// Post weather the author picks: heavier weather takes more umbrellas to clear.
const WEATHERS = [
  { v: 0, e: '⛈️', l: 'Heavy rain' },
  { v: 1, e: '🌧️', l: 'Rain' },
  { v: 2, e: '☁️', l: 'Cloudy' },
  { v: 3, e: '🌤️', l: 'Partly sunny' },
  { v: 4, e: '☀️', l: 'Sunny' },
]
// Quick client-side check for obviously harmful language (the DATABASE is the real, unbypassable gate).
// We normalize first, de-leet + strip non-letters, so "f u c k", "sh1t", "xxfaggotxx" are all caught.
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'l' }
const norm = (t) => t.toLowerCase().replace(/[0134578@$!|]/g, (c) => LEET[c] || '').replace(/[^a-z]/g, '')
// terms matched even when hidden inside other text (mirror of the DB 'substr' list, worst offenders)
const HARM_EMBEDDED = ['killyourself', 'killurself', 'godie', 'youshoulddie', 'faggot', 'nigger', 'nigga', 'kike', 'motherfucker', 'fuck']
const HARM = (t) => { const n = norm(t); return HARM_EMBEDDED.some((w) => n.includes(w)) }
const REJECT_MSG = "This can't be posted, it looks like it may contain harmful or hateful language. Umbrella is a place to be kind, even on hard days. Please rephrase. 💛"
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
const PII_MSG = "Please remove the personal contact info (an email address). Keeping yourself and others anonymous is what keeps this place safe. 💛"
const DOX_MSG = "This looks like it could identify a real person. Please keep everyone anonymous, no full names, schools, addresses, or contact info. 💛"

export default function Composer() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [intent, setIntent] = useState('similar')   // default nudges toward "me too" replies → more interaction
  const [intentTouched, setIntentTouched] = useState(false)  // did the user pick an intent themselves?
  const [heavy, setHeavy] = useState(false)                  // heavy/crisis language detected → suggest "just listen"
  const [category, setCategory] = useState('school')
  const [anon, setAnon] = useState(false)
  const [weather, setWeather] = useState(2)          // 0 heavy rain … 4 sunny; default cloudy
  const [pollOn, setPollOn] = useState(false)
  const [pollOpts, setPollOpts] = useState(['', ''])   // 2–4 options
  const [confirming, setConfirming] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejected, setRejected] = useState('')
  const [prompt, setPrompt] = useState(null)
  const [channels, setChannels] = useState([])       // the current user's channels
  const [channelId, setChannelId] = useState('')     // chosen channel (non-anonymous only)

  // The "Answer this" button in the Rail opens the composer with the prompt pinned.
  useEffect(() => {
    function onAnswer(e) {
      setPrompt(e.detail)
      setOpen(true)
      setTimeout(() => document.querySelector('.composer textarea')?.focus(), 50)
    }
    window.addEventListener('umbrella:answer-prompt', onAnswer)
    return () => window.removeEventListener('umbrella:answer-prompt', onAnswer)
  }, [])

  // Load the current user's channels so they can file a (non-anonymous) post.
  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (!u.user) return
      const { data } = await supabase.from('channels').select('id,name').eq('owner_id', u.user.id).order('created_at', { ascending: true })
      setChannels(data || [])
    })()
  }, [])

  // Gently steer heavy posts toward "Just listen" so someone sharing something
  // hard isn't met with unsolicited advice, unless they've chosen an intent.
  useEffect(() => {
    const isHeavy = CRISIS.test(text)
    setHeavy(isHeavy)
    if (!intentTouched) setIntent(isHeavy ? 'listen' : 'similar')
  }, [text, intentTouched])

  function startShare() {
    if (!text.trim()) return
    if (CRISIS.test(text)) { alert(CRISIS_MESSAGE); return }
    if (HARM(text)) { setRejected(REJECT_MSG); return }
    if (EMAIL.test(text)) { setRejected(PII_MSG); return }
    if (pollOn) {
      const opts = pollOpts.map((o) => o.trim()).filter(Boolean)
      if (opts.length < 2) { setRejected('A poll needs at least two options, or turn the poll off. 💛'); return }
      const bad = opts.find((o) => HARM(o) || EMAIL.test(o))
      if (bad) { setRejected(EMAIL.test(bad) ? PII_MSG : REJECT_MSG); return }
    }
    if (!supabase) { alert('Connect Supabase to post, see README.md.'); return }
    setRejected(''); setAgreed(false); setConfirming(true)
  }

  async function doPost() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setBusy(true)

    // AI moderation check (server-side; no-ops until ANTHROPIC_API_KEY is set)
    try {
      const moderationController = new AbortController()
      const moderationTimeout = setTimeout(() => moderationController.abort(), 8000)
      const res = await fetch('/api/moderate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }), signal: moderationController.signal
      })
      clearTimeout(moderationTimeout)
      const mod = await res.json()
      if (mod && mod.allowed === false) { setBusy(false); setConfirming(false); setRejected(mod.reason === 'doxxing' ? DOX_MSG : REJECT_MSG); return }
    } catch { /* network hiccup, fall through; the DB keyword trigger still guards */ }

    const insertController = new AbortController()
    const insertTimeout = setTimeout(() => insertController.abort(), 15000)
    let created, error
    try {
      ({ data: created, error } = await supabase.from('stories')
        .insert(Object.assign({ text: text.trim(), intent, category, anonymous: anon, weather, prompt_id: prompt?.key || null }, (!anon && channelId) ? { channel_id: channelId } : {}))
        .select('id').single().abortSignal(insertController.signal))
    } catch (e) {
      error = e
    } finally {
      clearTimeout(insertTimeout)
    }
    if (error) {
      setBusy(false)
      setConfirming(false)
      if (/blocked_content/i.test(error.message)) setRejected(REJECT_MSG)
      else if (/personal_info/i.test(error.message)) setRejected(PII_MSG)
      else if (/daily_story_limit/i.test(error.message)) setRejected(`You've shared your ${DAILY_STORY_LIMIT} stories for today. Come back tomorrow, a fresh page, a fresh start. ☂`)
      else alert(error.message)
      return
    }

    // Attach the poll, if there is one. The DB screens every option with the
    // same word/PII filters as the story; if any is rejected we undo the story
    // so we never leave a story with a half-built poll.
    if (pollOn) {
      const rows = pollOpts.map((o) => o.trim()).filter(Boolean)
        .map((label, idx) => ({ story_id: created.id, idx, label }))
      const { error: pe } = await supabase.from('poll_options').insert(rows)
      if (pe) {
        await supabase.from('stories').delete().eq('id', created.id)
        setBusy(false); setConfirming(false)
        setRejected(/personal_info/i.test(pe.message) ? PII_MSG
          : /blocked_content|empty_option/i.test(pe.message) ? REJECT_MSG : pe.message)
        return
      }
    }
    setBusy(false)
    setConfirming(false)
    track('posted')
    window.dispatchEvent(new CustomEvent('umbrella:burst', {
      detail: { variant: 'post', message: "We can't stop the rain, but we can hold out an umbrella for each other." }
    }))
    setTimeout(() => { setText(''); setOpen(false); setAnon(false); setWeather(2); setPollOn(false); setPollOpts(['', '']); setPrompt(null); setIntentTouched(false); setHeavy(false); router.refresh() }, 3100)
  }

  return (
    <>
      {!open ? (
        <button className="composer-peek" onClick={() => { setOpen(true); track('click_create') }}>What&apos;s your weather today?</button>
      ) : (
        <div className="composer">
          {rejected && <div className="reject-banner">{rejected}</div>}
          {prompt ? (
            <div className="prompt-pin">
              <span>☂ Answering this week’s prompt</span>
              <em>{prompt.text}</em>
            </div>
          ) : (
            <div className="prompt-suggest">
              <div className="ps-text">
                <span>☂ This week’s prompt</span>
                <em>{WEEKLY_PROMPT.text}</em>
              </div>
              <button type="button" className="btn ghost sm ps-btn"
                onClick={() => { setPrompt(WEEKLY_PROMPT); document.querySelector('.composer textarea')?.focus() }}>
                Answer this
              </button>
            </div>
          )}
          <textarea value={text} onChange={(e) => { setText(e.target.value); if (e.target.value.trim()) track('compose_start'); if (rejected) setRejected('') }}
            placeholder="You don't have to share your worst moment, just whatever you're carrying right now." />
          <p className="compose-privacy">🔒 Keep it anonymous, please don&apos;t include your (or anyone else&apos;s) full name, school, address, phone, email, or socials.</p>
          <div className="row">
            <label>Respond with
              <select value={intent} onChange={(e) => { setIntent(e.target.value); setIntentTouched(true) }}>
                <option value="similar">Similar stories</option>
                <option value="listen">Just listen</option>
                <option value="advice">Give advice</option>
                <option value="resources">Resources</option>
              </select>
            </label>
          </div>
          {heavy && !intentTouched && intent === 'listen' && (
            <p className="intent-hint">🫂 This sounds heavy, we set this to <b>Just listen</b> so you can share without getting advice. Change it anytime.</p>
          )}
          <div className="cat-pick">
            <span className="cat-lbl">What&apos;s this about?</span>
            <div className="cat-chips">
              {CATEGORIES.map((c) => (
                <button type="button" key={c.key}
                  className={'cat-chip' + (category === c.key ? ' on' : '')}
                  onClick={() => setCategory(c.key)}
                  aria-pressed={category === c.key}>
                  <span className="cc-dot" style={{ background: c.color }} />
                  <span className="cc-text"><b>{c.name}</b><em>{c.desc}</em></span>
                </button>
              ))}
            </div>
          </div>
          <div className="wx-pick">
            <span className="wx-lbl">How&apos;s your weather today? Umbrellas from others help clear it to sunny.</span>
            <div className="wx-opts">
              {WEATHERS.map((w) => (
                <button type="button" key={w.v}
                  className={'wx-opt' + (weather === w.v ? ' on' : '')}
                  onClick={() => setWeather(w.v)} aria-pressed={weather === w.v}>
                  <span className="we">{w.e}</span>{w.l}
                </button>
              ))}
            </div>
          </div>
          <label className="anon">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            🕶️ Post fully anonymously (not linked to your account name)
          </label>

          {!anon && channels.length > 0 && (
            <div className="compose-channel">
              <span>📺 Channel:</span>
              <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
                <option value="">None</option>
                {channels.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          <div className="poll-add">
            {!pollOn ? (
              <button type="button" className="poll-toggle" onClick={() => setPollOn(true)}>
                📊 Add a poll
              </button>
            ) : (
              <div className="poll-build">
                <div className="poll-build-head">
                  <span>📊 Poll</span>
                  <button type="button" className="poll-off" onClick={() => { setPollOn(false); setPollOpts(['', '']) }}>Remove poll</button>
                </div>
                {pollOpts.map((opt, i) => (
                  <div className="poll-opt-row" key={i}>
                    <input type="text" className="poll-opt-input" value={opt} maxLength={80}
                      placeholder={`Option ${i + 1}`}
                      onChange={(e) => { const next = [...pollOpts]; next[i] = e.target.value; setPollOpts(next); if (rejected) setRejected('') }} />
                    {pollOpts.length > 2 && (
                      <button type="button" className="poll-opt-x" aria-label="Remove option"
                        onClick={() => setPollOpts(pollOpts.filter((_, j) => j !== i))}>✕</button>
                    )}
                  </div>
                ))}
                {pollOpts.length < 4 && (
                  <button type="button" className="poll-opt-add" onClick={() => setPollOpts([...pollOpts, ''])}>
                    ＋ Add option
                  </button>
                )}
                <p className="poll-note">Everyone can vote once. Results are public and update live. ☂</p>
              </div>
            )}
          </div>

          <div className="row end">
            <button className="btn ghost sm" onClick={() => { if (text.trim()) track('compose_abandon'); setOpen(false); setPrompt(null); setPollOn(false); setPollOpts(['', '']) }}>Cancel</button>
            <button className="btn prim sm" onClick={startShare}>☂ Share</button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) setConfirming(false) }}>
          <div className="modal-box" role="dialog" aria-label="Agree to community guidelines">
            <h2>Before you share</h2>
            <p className="care-line">We know struggling is hard. Please keep your words safe and kind, to yourself, and to everyone else here. 🫂</p>
            <p className="ms-sub">A quick reminder, this keeps Haven safe for everyone.</p>
            <ul className="rulelist">
              {GUIDELINES.map((r, i) => <li key={i}><span className="ri">{r.i}</span>{r.t}</li>)}
            </ul>
            <label className="agree-check">
              <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
              I&apos;ve read this and I&apos;ll follow it.
            </label>
            <div className="row end" style={{ marginTop: 14 }}>
              <button className="btn ghost sm" onClick={() => setConfirming(false)}>Cancel</button>
              <button className="btn prim sm" onClick={doPost} disabled={!agreed || busy}>{busy ? 'Posting…' : 'Post my story ☂'}</button>
            </div>
          </div>
        </div>
      )}

    </>
  )
}

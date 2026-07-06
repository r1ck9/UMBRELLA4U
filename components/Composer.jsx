'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { GUIDELINES } from '@/lib/guidelines'

const CRISIS = /(kill myself|end it all|don'?t want to (be here|live)|no reason to live|suicide|hurt myself|hopeless)/i
// Quick client-side check for obviously harmful language (the DATABASE is the real, unbypassable gate).
// We normalize first — de-leet + strip non-letters — so "f u c k", "sh1t", "xxfaggotxx" are all caught.
const LEET = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', '$': 's', '!': 'i', '|': 'l' }
const norm = (t) => t.toLowerCase().replace(/[0134578@$!|]/g, (c) => LEET[c] || '').replace(/[^a-z]/g, '')
// terms matched even when hidden inside other text (mirror of the DB 'substr' list, worst offenders)
const HARM_EMBEDDED = ['killyourself', 'killurself', 'godie', 'youshoulddie', 'faggot', 'nigger', 'nigga', 'kike', 'motherfucker', 'fuck']
const HARM = (t) => { const n = norm(t); return HARM_EMBEDDED.some((w) => n.includes(w)) }
const REJECT_MSG = "This can't be posted — it looks like it may contain harmful or hateful language. Umbrella is a place to be kind, even on hard days. Please rephrase. 💛"

export default function Composer() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [intent, setIntent] = useState('listen')
  const [category, setCategory] = useState('school')
  const [anon, setAnon] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [rejected, setRejected] = useState('')

  function startShare() {
    if (!text.trim()) return
    if (CRISIS.test(text)) {
      alert("That sounds really heavy right now. Please reach out to someone trained:\n\n988 — Suicide Crisis Helpline (call or text)\nKids Help Phone — text CONNECT to 686868")
      return
    }
    if (HARM(text)) { setRejected(REJECT_MSG); return }
    if (!supabase) { alert('Connect Supabase to post — see README.md.'); return }
    setRejected(''); setAgreed(false); setConfirming(true)
  }

  async function doPost() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setBusy(true)

    // AI moderation check (server-side; no-ops until ANTHROPIC_API_KEY is set)
    try {
      const res = await fetch('/api/moderate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      })
      const mod = await res.json()
      if (mod && mod.allowed === false) { setBusy(false); setConfirming(false); setRejected(REJECT_MSG); return }
    } catch { /* network hiccup — fall through; the DB keyword trigger still guards */ }

    const { error } = await supabase.from('stories').insert({ text: text.trim(), intent, category, anonymous: anon })
    setBusy(false)
    if (error) {
      if (/blocked_content/i.test(error.message)) { setConfirming(false); setRejected(REJECT_MSG) }
      else alert(error.message)
      return
    }
    setConfirming(false)
    window.dispatchEvent(new CustomEvent('umbrella:burst', {
      detail: { variant: 'post', message: "We can't stop the rain — but we can hold out an umbrella for each other." }
    }))
    setTimeout(() => { setText(''); setOpen(false); setAnon(false); router.refresh() }, 3100)
  }

  return (
    <>
      {!open ? (
        <button className="composer-peek" onClick={() => setOpen(true)}>What&apos;s your weather today?</button>
      ) : (
        <div className="composer">
          {rejected && <div className="reject-banner">{rejected}</div>}
          <textarea value={text} onChange={(e) => { setText(e.target.value); if (rejected) setRejected('') }}
            placeholder="You don't have to share your worst moment — just whatever you're carrying right now." />
          <div className="row">
            <label>Respond with
              <select value={intent} onChange={(e) => setIntent(e.target.value)}>
                <option value="listen">Just listen</option>
                <option value="advice">Give advice</option>
                <option value="similar">Similar stories</option>
                <option value="resources">Resources</option>
              </select>
            </label>
            <label>Category
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="identity">Identity</option>
                <option value="school">School life</option>
                <option value="mind">Mental health</option>
                <option value="culture">Culture</option>
                <option value="wins">Small wins</option>
                <option value="vent">Venting</option>
              </select>
            </label>
          </div>
          <label className="anon">
            <input type="checkbox" checked={anon} onChange={(e) => setAnon(e.target.checked)} />
            🕶️ Post fully anonymously (not linked to your account name)
          </label>
          <div className="row end">
            <button className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn prim sm" onClick={startShare}>☂ Share</button>
          </div>
        </div>
      )}

      {confirming && (
        <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) setConfirming(false) }}>
          <div className="modal-box" role="dialog" aria-label="Agree to community guidelines">
            <h2>Before you share</h2>
            <p className="care-line">We know struggling is hard. Please keep your words safe and kind — to yourself, and to everyone else here. 🫂</p>
            <p className="ms-sub">A quick reminder — this keeps Umbrella safe for everyone.</p>
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

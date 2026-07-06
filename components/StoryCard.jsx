'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DAILY_UMBRELLA_LIMIT } from '@/lib/config'

const INTENT = {
  listen: '🫂 Just listen', advice: '☂ Give advice',
  similar: '💬 Similar stories', resources: '📎 Resources'
}
const NOTE_PROMPT = {
  advice: 'one line of advice…', similar: '“me too” — in a sentence…', resources: 'a link or resource that helped…'
}

export default function StoryCard({ story }) {
  const router = useRouter()
  const [count, setCount] = useState(story.umbrella_count ?? 0)
  const [opened, setOpened] = useState(false)
  const [revealed, setRevealed] = useState(!story.content_warning)
  const [showNote, setShowNote] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [sent, setSent] = useState('')

  const canNote = story.intent && story.intent !== 'listen'

  function fireBurst() {
    window.dispatchEvent(new CustomEvent('umbrella:burst', { detail: { variant: 'open', message: 'You opened your umbrella for them. ☂' } }))
  }

  async function openUmbrella(note) {
    if (opened) return
    if (!supabase) { setOpened(true); setCount((c) => c + 1); if (note) setSent(note); fireBurst(); return } // sample mode
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setOpened(true); setCount((c) => c + 1); setShowNote(false); if (note) setSent(note)
    const { error } = await supabase.from('umbrellas')
      .insert({ story_id: story.id, user_id: data.user.id, note: note || null })
    if (error) {
      setOpened(false); setCount((c) => c - 1); setSent('')
      if (/daily_umbrella_limit/i.test(error.message)) {
        alert(`You've opened all ${DAILY_UMBRELLA_LIMIT} umbrellas for today. They refill tomorrow — that's what makes each one mean something. ☂`)
      } else if (/duplicate|unique/i.test(error.message)) {
        setOpened(true) // already sheltered this one — the "one umbrella each" rule
      } else {
        alert(error.message)
      }
    } else {
      fireBurst()
    }
  }

  const who = story.anonymous ? 'Anonymous' : (story.author_name || 'someone')

  return (
    <article className="card">
      <div className="chead">
        <span className={'avatar' + (story.anonymous ? ' anon' : '')} aria-hidden="true">{story.anonymous ? '🕶️' : ''}</span>
        <div>
          <div className="name">{who}{story.anonymous && <span className="lock"> · 🔒 hidden</span>}</div>
          <div className="meta">{story.category}</div>
        </div>
        <span className="badge">{INTENT[story.intent] || INTENT.listen}</span>
      </div>

      {revealed
        ? <p className="text">{story.text}</p>
        : <button className="cw" onClick={() => setRevealed(true)}>🌧 Sensitive · tap to read</button>}

      <div className="cfoot">
        <button className={'umb' + (opened ? ' on' : '')} onClick={() => openUmbrella(null)}
          title={opened ? 'Umbrella opened' : 'Open an umbrella'}>
          <span className="umb-ico">{opened ? '☂' : '🌂'}</span> <span>{count}</span>
        </button>
        {canNote && !opened && <button className="addword" onClick={() => setShowNote((v) => !v)}>+ add a word</button>}
        <span className="hint">
          {story.intent === 'listen' ? 'Just listen — the umbrella is the whole message.' : 'One umbrella each — no threads.'}
        </span>
      </div>

      {showNote && canNote && !opened && (
        <div className="noterow">
          <input value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={120}
            placeholder={NOTE_PROMPT[story.intent] || 'a word of support…'} />
          <button className="btn prim sm" onClick={() => noteText.trim() && openUmbrella(noteText.trim())}>Send ☂</button>
        </div>
      )}
      {sent && <div className="sent">☂ Sent: &ldquo;{sent}&rdquo;</div>}
    </article>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DAILY_UMBRELLA_LIMIT } from '@/lib/config'
import { getMe } from '@/lib/me'

const INTENT = {
  listen: '🫂 Just listen', advice: '☂ Give advice',
  similar: '💬 Similar stories', resources: '📎 Resources'
}
const NOTE_PROMPT = {
  advice: 'one line of advice…', similar: '“me too” — in a sentence…', resources: 'a link or resource that helped…'
}
const RESPOND_LABEL = {
  advice: '💡 They asked for advice — offer one kind line:',
  similar: '💬 Let them know they’re not alone — share a “me too”:',
  resources: '📎 Share a link or resource that helped you:'
}

export default function StoryCard({ story }) {
  const router = useRouter()
  const [count, setCount] = useState(story.umbrella_count ?? 0)
  const [opened, setOpened] = useState(false)
  const [revealed, setRevealed] = useState(!story.content_warning)
  const [noteText, setNoteText] = useState('')
  const [sent, setSent] = useState('')
  const [me, setMe] = useState({ userId: null, isModerator: false })
  const [removed, setRemoved] = useState(false)
  const [reported, setReported] = useState(false)
  const [marked, setMarked] = useState(false)

  useEffect(() => {
    getMe().then((m) => {
      setMe(m)
      // Remember across refreshes: did I already open an umbrella on this story?
      if (m.userId && supabase) {
        supabase.from('umbrellas').select('note').eq('story_id', story.id).eq('user_id', m.userId).maybeSingle()
          .then(({ data }) => { if (data) { setOpened(true); if (data.note) setSent(data.note) } })
      }
    })
  }, [])

  async function handleReport() {
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setReported(true)
    const { error } = await supabase.from('reports').insert({ target_type: 'story', target_id: story.id, reporter_id: data.user.id })
    if (error && !/duplicate/i.test(error.message)) { setReported(false); alert(error.message) }
  }

  // Quiet "this doesn't belong here" signal — no score is shown to the poster.
  async function handleNotRelevant() {
    if (!supabase) { setMarked(true); return } // sample mode
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setMarked(true)
    const { error } = await supabase.from('relevance_marks').insert({ story_id: story.id, user_id: data.user.id })
    if (error && !/duplicate|unique/i.test(error.message)) { setMarked(false); alert(error.message) }
  }

  const canNote = story.intent && story.intent !== 'listen'
  const canRemove = (me.userId && me.userId === story.author_id) || me.isModerator

  async function handleRemove() {
    const own = me.userId === story.author_id
    if (!window.confirm(own ? 'Delete your story? This can’t be undone.' : 'Take this story down for everyone?')) return
    const { error } = await supabase.from('stories').delete().eq('id', story.id)
    if (error) { alert(error.message); return }
    setRemoved(true)
  }

  function fireBurst() {
    window.dispatchEvent(new CustomEvent('umbrella:burst', { detail: { variant: 'open', message: 'You opened your umbrella for them. ☂' } }))
  }

  async function openUmbrella(note) {
    if (opened) return
    if (!supabase) { setOpened(true); setCount((c) => c + 1); if (note) setSent(note); fireBurst(); return } // sample mode
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    setOpened(true); setCount((c) => c + 1); if (note) setSent(note)
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

  if (removed) return null

  return (
    <article className="card">
      <div className="chead">
        <span className={'avatar' + (story.anonymous ? ' anon' : '')} aria-hidden="true">{story.anonymous ? '🕶️' : ''}</span>
        <div>
          <div className="name">
            {story.anonymous || !story.author_name
              ? <>{who}{story.anonymous && <span className="lock"> · 🔒 hidden</span>}</>
              : <Link href={`/u/${encodeURIComponent(story.author_name)}`} className="namelink">{who}</Link>}
          </div>
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
        <span className="hint">
          {story.intent === 'listen'
            ? 'Just listen — the umbrella is the whole message.'
            : (opened ? 'One umbrella each — no threads.' : 'Add a word below, or just open an umbrella.')}
        </span>
        <span className="cfoot-actions">
          {me.userId && me.userId !== story.author_id && !marked && !reported &&
            <button className="notrel" onClick={handleNotRelevant} title="Quietly flag this as spam, a joke, or off-topic. The poster is never shown a score.">Not relevant here</button>}
          {marked && <span className="marked">Thanks — noted ✓</span>}
          {me.userId && me.userId !== story.author_id && !reported &&
            <button className="report" onClick={handleReport}>🛑 Report</button>}
          {reported && <span className="reported">Reported ✓</span>}
          {canRemove &&
            <button className="takedown" onClick={handleRemove}>{me.userId === story.author_id ? 'Delete' : '🛑 Take down'}</button>}
        </span>
      </div>

      {canNote && !opened && (
        <div className="respond">
          <div className="respond-lbl">{RESPOND_LABEL[story.intent] || 'Leave a word of support:'}</div>
          <div className="noterow">
            <input value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={120}
              placeholder={NOTE_PROMPT[story.intent] || 'a word of support…'} />
            <button className="btn prim sm" disabled={!noteText.trim()}
              onClick={() => noteText.trim() && openUmbrella(noteText.trim())}>Send ☂</button>
          </div>
        </div>
      )}
      {sent && <div className="sent">☂ Sent: &ldquo;{sent}&rdquo;</div>}
    </article>
  )
}

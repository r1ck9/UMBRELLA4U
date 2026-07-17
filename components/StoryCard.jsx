'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DAILY_UMBRELLA_LIMIT } from '@/lib/config'
import { getMe, getMyStoryIds } from '@/lib/me'
import { earnedBadges } from '@/lib/badges'
import { CRISIS, CRISIS_MESSAGE } from '@/lib/crisis'

const INTENT = {
  listen: '🫂 Just listen', advice: '☂ Give advice',
  similar: '💬 Similar stories', resources: '📎 Resources'
}

// Post weather: the author picks it; umbrellas clear it toward sunny. Heavier
// weather needs more. WX[i].need = umbrellas to reach sunny from stage i.
const WX = [
  { e: '⛈️', l: 'Heavy rain', need: 50 },
  { e: '🌧️', l: 'Rain', need: 35 },
  { e: '☁️', l: 'Cloudy', need: 22 },
  { e: '🌤️', l: 'Partly sunny', need: 12 },
  { e: '☀️', l: 'Sunny', need: 8 },
]
function WeatherMeter({ weather, count }) {
  const has = weather != null && weather >= 0 && weather <= 4
  // legacy posts (no chosen weather): derive a stage from the count vs 50
  const base = has ? weather : (count >= 50 ? 4 : count >= 40 ? 3 : count >= 25 ? 2 : count >= 10 ? 1 : 0)
  const need = has ? WX[base].need : 50
  const prog = need > 0 ? Math.min(count / need, 1) : 1
  const idx = need > 0 ? Math.min(4, base + Math.round(prog * (4 - base))) : 4
  const w = WX[idx]
  const more = Math.max(0, need - count)
  const sunny = idx >= 4
  // Once it's sunny, drop the bar and show a big sun instead — it's cleared.
  if (sunny) {
    return (
      <div className="wx-meter wx-sunny">
        <span className="wx-sun" aria-hidden="true">☀️</span>
        <span className="wx-sun-txt">Sunny{count ? ` — cleared by ${count} umbrella${count === 1 ? '' : 's'}` : ''}</span>
      </div>
    )
  }
  return (
    <div className="wx-meter">
      <div className="wx-head">
        <span className="wx-e">{w.e}</span>
        <span className="wx-l">{w.l}</span>
        <span className="wx-need">{`${more} umbrella${more === 1 ? '' : 's'} to sunny`}</span>
      </div>
      <div className="wx-bar"><div className="wx-fill" style={{ width: (prog * 100) + '%' }} /></div>
    </div>
  )
}

// The "who's here" hugger-faces row under a post is hidden for now (to be
// redesigned/re-added later). Flip to true to bring it back.
const SHOW_HUG_FACES = false

// A hugger's little avatar (emoji / uploaded image / colored initial).
function HugAvatar({ h }) {
  const url = h.avatar_url || ''
  const isEmoji = url.startsWith('emoji:')
  const isImg = /^https?:/.test(url)
  const initial = (h.username || '☂').trim().charAt(0).toUpperCase()
  const style = isImg ? { backgroundImage: `url(${url})` } : { background: h.accent_color || 'var(--shelter)' }
  return <span className="hug-av" style={style} title={'@' + h.username}>{isEmoji ? url.slice(6) : (isImg ? '' : initial)}</span>
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
  const [mine, setMine] = useState(false)   // is this story mine? (covers anonymous posts)
  const [removed, setRemoved] = useState(false)
  const [reported, setReported] = useState(false)
  const [marked, setMarked] = useState(false)
  const [poll, setPoll] = useState(null)   // null = loading · false = no poll · {options,total,myOption}
  const [boosted, setBoosted] = useState(false)
  const [boostCount, setBoostCount] = useState(story.boost_count ?? 0)
  const [hugCount, setHugCount] = useState(story.hug_count ?? 0)
  const [hugged, setHugged] = useState(false)
  const [huggers, setHuggers] = useState([])     // profile-lite for the faces on the post
  const [hugExpanded, setHugExpanded] = useState(false)

  // Load the faces of the people who've hugged this story.
  function refreshHuggers(limit = 20) {
    if (!supabase || !story.id) return
    supabase.rpc('story_huggers', { sid: story.id, lim: limit })
      .then(({ data }) => { if (data) setHuggers(data) })
  }
  useEffect(() => { if ((story.hug_count ?? 0) > 0) refreshHuggers(20) }, [])

  // Hug: unlimited, one per post (a toggle). Adds a warm "I'm here with you".
  async function toggleHug() {
    if (!supabase) { setHugged((h) => !h); setHugCount((c) => c + (hugged ? -1 : 1)); return }
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    const next = !hugged
    setHugged(next); setHugCount((c) => Math.max(0, c + (next ? 1 : -1)))
    if (next) {
      const { error } = await supabase.from('hugs').insert({ story_id: story.id, user_id: data.user.id })
      if (error && !/duplicate|unique/i.test(error.message)) { setHugged(false); setHugCount((c) => Math.max(0, c - 1)); return }
      window.dispatchEvent(new CustomEvent('umbrella:burst', { detail: { variant: 'open', message: 'You sent a hug. 🫂' } }))
    } else {
      await supabase.from('hugs').delete().eq('story_id', story.id).eq('user_id', data.user.id)
    }
    refreshHuggers(hugExpanded ? 500 : 20)
  }

  // Count one view per story per browser session (feeds the ranking algorithm).
  useEffect(() => {
    if (!supabase || !story.id) return
    try { const k = 'umb_v_' + story.id; if (sessionStorage.getItem(k)) return; sessionStorage.setItem(k, '1') } catch { return }
    supabase.rpc('bump_story_view', { sid: story.id })
  }, [])

  useEffect(() => {
    getMe().then((m) => {
      setMe(m)
      // Remember across refreshes: did I already open an umbrella on this story?
      if (m.userId && supabase) {
        supabase.from('umbrellas').select('note').eq('story_id', story.id).eq('user_id', m.userId).maybeSingle()
          .then(({ data }) => { if (data) { setOpened(true); if (data.note) setSent(data.note) } })
      }
      // Is this my own story? (author_id is null on anonymous posts, so check
      // the private author link too.)
      if (m.userId) {
        if (m.userId === story.author_id) setMine(true)
        else getMyStoryIds().then((ids) => { if (ids.has(story.id)) setMine(true) })
        // did I already hug this?
        supabase.from('hugs').select('id').eq('story_id', story.id).eq('user_id', m.userId).maybeSingle()
          .then(({ data }) => { if (data) setHugged(true) })
      }
      // Moderators: reflect whether I've boosted this story.
      if (m.isModerator && supabase) {
        supabase.from('story_boosts').select('story_id').eq('story_id', story.id).eq('mod_id', m.userId).maybeSingle()
          .then(({ data }) => { if (data) setBoosted(true) })
      }
    })
  }, [])

  async function toggleBoost() {
    const next = !boosted
    setBoosted(next); setBoostCount((c) => Math.max(0, c + (next ? 1 : -1)))
    if (!supabase) return // sample mode
    const { data, error } = await supabase.rpc('toggle_boost', { sid: story.id })
    if (error) {
      setBoosted(!next); setBoostCount((c) => Math.max(0, c + (next ? -1 : 1)))
      alert(error.message); return
    }
    if (typeof data === 'number') setBoostCount(data)
  }

  // Load this story's poll (if any) + which option I picked. Then subscribe to
  // live vote inserts so tallies update in real time, like a live Instagram poll.
  useEffect(() => {
    if (!supabase || !story.id) { setPoll(false); return }
    let channel
    ;(async () => {
      const { data: opts } = await supabase.from('poll_options')
        .select('id,idx,label,vote_count').eq('story_id', story.id).order('idx')
      if (!opts || !opts.length) { setPoll(false); return }
      const total = opts.reduce((n, o) => n + (o.vote_count || 0), 0)
      let myOption = null
      const { data: u } = await supabase.auth.getUser()
      if (u.user) {
        const { data: v } = await supabase.from('poll_votes')
          .select('option_id').eq('story_id', story.id).eq('user_id', u.user.id).maybeSingle()
        if (v) myOption = v.option_id
      }
      setPoll({ options: opts, total, myOption })
      // live updates (no-op if realtime replication isn't enabled on the table)
      channel = supabase.channel('poll:' + story.id)
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'poll_votes', filter: 'story_id=eq.' + story.id },
          () => refreshPollCounts())
        .subscribe()
    })()
    return () => { if (channel) supabase.removeChannel(channel) }
  }, [])

  // Pull authoritative tallies from the DB (used on live events, avoids drift).
  async function refreshPollCounts() {
    const { data: opts } = await supabase.from('poll_options')
      .select('id,idx,label,vote_count').eq('story_id', story.id).order('idx')
    if (!opts) return
    const total = opts.reduce((n, o) => n + (o.vote_count || 0), 0)
    setPoll((p) => (p ? { ...p, options: opts, total } : p))
  }

  async function castVote(optionId) {
    if (!poll || poll.myOption) return
    const { data } = await supabase.auth.getUser()
    if (!data.user) { router.push('/signup'); return }
    // optimistic: lock in my choice + bump the tally right away
    setPoll((p) => ({
      ...p, myOption: optionId, total: p.total + 1,
      options: p.options.map((o) => o.id === optionId ? { ...o, vote_count: (o.vote_count || 0) + 1 } : o),
    }))
    const { error } = await supabase.from('poll_votes')
      .insert({ story_id: story.id, option_id: optionId, user_id: data.user.id })
    if (error) {
      if (/duplicate|unique/i.test(error.message)) { refreshPollCounts(); return } // already voted elsewhere
      // roll back the optimistic bump
      setPoll((p) => ({
        ...p, myOption: null, total: p.total - 1,
        options: p.options.map((o) => o.id === optionId ? { ...o, vote_count: o.vote_count - 1 } : o),
      }))
      alert(error.message)
    }
  }

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

  const isOwn = !!(me.userId && (me.userId === story.author_id || mine))
  const canNote = story.intent && story.intent !== 'listen'
  const canRemove = isOwn || me.isModerator

  async function handleRemove() {
    if (!window.confirm(isOwn ? 'Delete your story? This can’t be undone.' : 'Take this story down for everyone?')) return
    const { error } = await supabase.from('stories').delete().eq('id', story.id)
    if (error) { alert(error.message); return }
    setRemoved(true)
  }

  function fireBurst() {
    window.dispatchEvent(new CustomEvent('umbrella:burst', { detail: { variant: 'open', message: 'You opened your umbrella for them. ☂' } }))
  }

  async function openUmbrella(note) {
    if (opened || isOwn) return
    if (note && CRISIS.test(note)) { alert(CRISIS_MESSAGE); return }
    if (note && /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/.test(note)) {
      alert('Please remove the email from your note — keep everyone anonymous. 💛'); return
    }
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
      } else if (/self_umbrella/i.test(error.message)) {
        // can't umbrella your own story — just quietly undo (UI already hides this)
      } else if (/blocked_content|personal_info/i.test(error.message)) {
        alert('That note can’t be sent — please keep it kind and leave out personal info (names, emails, and the like). 💛')
      } else {
        alert(error.message)
      }
    } else {
      fireBurst()
      // tell the rail to refresh its live counts (umbrellas left today + community total)
      window.dispatchEvent(new CustomEvent('umbrella:opened'))
      // opening an umbrella also gives them a hug
      if (!hugged && data.user) {
        setHugged(true); setHugCount((c) => c + 1)
        supabase.from('hugs').insert({ story_id: story.id, user_id: data.user.id })
          .then(() => refreshHuggers(hugExpanded ? 500 : 20))
      }
    }
  }

  const who = story.anonymous ? 'Anonymous' : (story.author_name || 'someone')
  const badges = story.anonymous ? [] : earnedBadges({
    streak: story.author_streak || 0,
    posts: story.author_posts || 0,
    umbrellasSent: story.author_umbrellas_sent || 0
  })
  const noteWords = noteText.trim() ? noteText.trim().split(/\s+/).length : 0
  const noteOver = noteWords > 300

  if (removed) return null

  return (
    <article className="card">
      <div className="chead">
        <span className={'avatar' + (story.anonymous ? ' anon' : '')} aria-hidden="true">{story.anonymous ? '🕶️' : ''}</span>
        <div>
          <div className="name">
            {story.anonymous || !story.author_name
              ? <>{who}{story.anonymous && <span className="lock"> · 🔒 hidden</span>}</>
              : <>
                  <Link href={`/u/${encodeURIComponent(story.author_name)}`} className="namelink">{who}</Link>
                  {badges.map((b) => <span key={b.label} className="streak-badge" title={b.label}>{b.icon}</span>)}
                </>}
          </div>
          <div className="meta">{story.category}</div>
        </div>
        <span className="badge">{INTENT[story.intent] || INTENT.listen}</span>
      </div>

      {revealed
        ? <p className="text">{story.text}</p>
        : <button className="cw" onClick={() => setRevealed(true)}>🌧 Sensitive · tap to read</button>}

      {poll && revealed && (() => {
        const showResults = !!poll.myOption || isOwn
        return (
          <div className="poll">
            <div className="poll-head">
              <span className="poll-ico">📊</span>
              <span className="poll-total">{poll.total} {poll.total === 1 ? 'vote' : 'votes'}</span>
              {!showResults && <span className="poll-cta">· tap to vote</span>}
            </div>
            {poll.options.map((o) => {
              const pct = poll.total ? Math.round((o.vote_count / poll.total) * 100) : 0
              const mine = poll.myOption === o.id
              if (!showResults) {
                return (
                  <button type="button" key={o.id} className="poll-vote-btn" onClick={() => castVote(o.id)}>
                    {o.label}
                  </button>
                )
              }
              return (
                <div key={o.id} className={'poll-result' + (mine ? ' mine' : '')}>
                  <div className="poll-bar" style={{ width: pct + '%' }} aria-hidden="true" />
                  <span className="poll-label">{mine && <span className="poll-check">✓</span>}{o.label}</span>
                  <span className="poll-pct">{pct}%</span>
                </div>
              )
            })}
          </div>
        )
      })()}

      <WeatherMeter weather={story.weather} count={count} />

      <div className="cfoot">
        {isOwn
          ? <span className="umb own" title="Umbrellas others opened for you"><span className="umb-ico">☂</span> <span>{count}</span></span>
          : <button className={'umb' + (opened ? ' on' : '')} onClick={() => openUmbrella(null)}
              title={opened ? 'Umbrella opened' : 'Open an umbrella'}>
              <span className="umb-ico">{opened ? '☂' : '🌂'}</span> <span>{count}</span>
            </button>}
        {!isOwn && (
          <button className={'hug' + (hugged ? ' on' : '')} onClick={toggleHug}
            title={hugged ? 'You’re here with them' : 'Send a hug — I’m here with you'}>
            🫂 <span>{hugCount}</span>
          </button>
        )}
        <span className="hint">
          {isOwn
            ? 'Your story. Umbrellas people open for you land in your inbox. ☂'
            : story.intent === 'listen'
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
          {me.isModerator &&
            <button className={'boost' + (boosted ? ' on' : '')} onClick={toggleBoost}
              title="Promote this story — a boost gives it 25 umbrellas' worth of reach in the feed. Moderators only.">
              ▲ {boosted ? 'Promoted' : 'Promote'}{boostCount > 0 ? ` · ${boostCount}` : ''}
            </button>}
          {canRemove &&
            <button className="takedown" onClick={handleRemove}>{isOwn ? 'Delete' : '🛑 Take down'}</button>}
        </span>
      </div>

      {SHOW_HUG_FACES && hugCount > 0 && (
        <div className="hug-faces">
          <div className={'hug-stack' + (hugExpanded ? ' expanded' : '')}>
            {huggers.map((h) => <HugAvatar key={h.user_id} h={h} />)}
          </div>
          <button className="hug-more" onClick={() => { const ex = !hugExpanded; setHugExpanded(ex); refreshHuggers(ex ? 500 : 20) }}>
            {hugCount.toLocaleString()} {hugCount === 1 ? 'person is' : 'people are'} here
            {!hugExpanded && hugCount > huggers.length ? ' · see all' : hugExpanded ? ' · show less' : ''}
          </button>
        </div>
      )}

      {canNote && !opened && !isOwn && (
        <div className="respond">
          <div className="respond-lbl">{RESPOND_LABEL[story.intent] || 'Leave a word of support:'}</div>
          <textarea className="note-box" value={noteText} maxLength={3000} rows={3}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder={NOTE_PROMPT[story.intent] || 'a word of support…'} />
          <div className="note-foot">
            <span className={'note-count' + (noteOver ? ' near' : '')}>{noteWords}/300 words</span>
            <button className="btn prim sm" disabled={!noteText.trim() || noteOver}
              onClick={() => noteText.trim() && !noteOver && openUmbrella(noteText.trim())}>Send ☂</button>
          </div>
        </div>
      )}
      {sent && <div className="sent">☂ Sent: &ldquo;{sent}&rdquo;</div>}
    </article>
  )
}

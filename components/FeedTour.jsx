'use client'
import { useEffect, useState, useCallback } from 'react'

// A step-by-step spotlight tour of the main feed. Each step points at a real
// element on the page; missing elements (e.g. no stories yet) are skipped.
const STEPS = [
  { sel: '.composer-peek, .composer', title: 'Post something',
    body: 'Tap here to post. A hard day, a worry, a small win, whatever it is. You pick how you want people to respond.' },
  { sel: '.hamburger', title: 'The menu', pad: 4,
    body: 'Categories, the resource hub, settings, and how to use the place. You can replay this tour from here too.' },
  { sel: '.nav', title: 'Browse by weather', pad: 6,
    body: 'Filter by what a story is about: school, identity, mental health, small wins, venting.' },
  { sel: '.umb', title: 'Open an umbrella',
    body: 'Instead of commenting, you open one umbrella. It means “I’m standing with you.” One each, and there are no threads.' },
  { sel: '.hug', title: 'Send a hug 🫂',
    body: 'Lighter than an umbrella, and there’s no daily limit, so tap it as much as you want. Opening an umbrella sends a hug too. The little faces show who’s there.' },
  { sel: '.bell', title: 'Your inbox',
    body: 'When someone opens an umbrella on your story, it lands here. The number is how many you haven’t looked at.' },
  { sel: '.tb-search', title: 'Find anything', pad: 4,
    body: 'Search stories and people by name or by tag.' },
  { sel: '.tb-avatar', title: 'Your profile', pad: 4,
    body: 'Set your picture, banner, display name, pronouns, status, tags and bio. It’s how people get a sense of you while you stay anonymous.' },
  { sel: '.quota', title: 'Your umbrellas today',
    body: 'A handful a day. Running out is the point.' },
  { sel: '.prompt', title: 'This week’s prompt',
    body: 'Stuck for something to post? Answer the weekly prompt in one tap.' }
]
const KEY = 'umbrella_tour_v1'

export default function FeedTour() {
  const [idx, setIdx] = useState(-1)      // -1 = inactive
  const [rect, setRect] = useState(null)

  // Decide whether to start on mount (first visit, or ?tour=1).
  useEffect(() => {
    let start = false
    try {
      const forced = new URLSearchParams(window.location.search).get('tour') === '1'
      start = forced || !localStorage.getItem(KEY)
    } catch { start = false }
    const timers = []
    if (start) timers.push(setTimeout(() => setIdx(0), 650)) // let the feed render first
    const replay = () => setIdx(0) // "Take a tour" clicked while already on the feed
    window.addEventListener('umbrella:start-tour', replay)
    return () => { timers.forEach(clearTimeout); window.removeEventListener('umbrella:start-tour', replay) }
  }, [])

  const finish = useCallback(() => {
    try { localStorage.setItem(KEY, '1') } catch {}
    setIdx(-1); setRect(null)
  }, [])

  // Measure the current step's target; skip steps whose element is absent.
  useEffect(() => {
    if (idx < 0) return
    if (idx >= STEPS.length) { finish(); return }
    const step = STEPS[idx]
    const el = document.querySelector(step.sel)
    if (!el || el.offsetParent === null) { setIdx((i) => i + 1); return } // skip missing/hidden target (e.g. sidebar on mobile)

    let raf
    const measure = () => {
      const r = el.getBoundingClientRect()
      const pad = step.pad ?? 8
      setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 })
    }
    el.scrollIntoView({ block: 'center', behavior: 'smooth' })
    raf = setTimeout(measure, 320)
    const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(measure) }
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => { clearTimeout(raf); cancelAnimationFrame(raf); window.removeEventListener('resize', onMove); window.removeEventListener('scroll', onMove, true) }
  }, [idx, finish])

  if (idx < 0 || idx >= STEPS.length || !rect) return null
  const step = STEPS[idx]

  // Place the tooltip above or below the highlight depending on room.
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1000
  const below = rect.top + rect.height + 190 < vh
  const tipTop = below ? rect.top + rect.height + 12 : Math.max(12, rect.top - 178)
  const tipLeft = Math.min(Math.max(12, rect.left + rect.width / 2 - 160), vw - 332)
  const last = idx === STEPS.length - 1

  return (
    <div className="tour" role="dialog" aria-label="Getting-started tour">
      <div className="tour-catch" onClick={() => {}} />
      <div className="tour-ring" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />
      <div className="tour-tip" style={{ top: tipTop, left: tipLeft }}>
        <div className="tour-count">Step {idx + 1} of {STEPS.length}</div>
        <h3>{step.title}</h3>
        <p>{step.body}</p>
        <div className="tour-actions">
          <button className="tour-skip" onClick={finish}>Skip tour</button>
          <div className="tour-nav">
            {idx > 0 && <button className="btn ghost sm" onClick={() => setIdx(idx - 1)}>Back</button>}
            <button className="btn prim sm" onClick={() => (last ? finish() : setIdx(idx + 1))}>{last ? 'Got it ☂' : 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DAILY_UMBRELLA_LIMIT, DAILY_STORY_LIMIT } from '@/lib/config'
import { startOfDayISO } from '@/lib/day'
import { WEEKLY_PROMPT } from '@/lib/prompt'
import { STREAK_MILESTONES } from '@/lib/badges'
import CountUpNumber from '@/components/CountUpNumber'

export default function Rail() {
  const railRef = useRef(null)
  const railSlotRef = useRef(null)
  const [stats, setStats] = useState({ stories: null, umbrellas: null, sunny: null })
  const [left, setLeft] = useState(null) // umbrellas left today; null = guest / unknown
  const [postsLeft, setPostsLeft] = useState(null) // stories left today
  const [streak, setStreak] = useState(null) // days-in-a-row; null = guest

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const s = await supabase.from('stories').select('*', { count: 'exact', head: true }).eq('state', 'live')
      const u = await supabase.rpc('community_umbrellas')   // aggregate count (umbrella rows are private)
      const sun = await supabase.rpc('sunny_count')
      setStats({ stories: s.count ?? 0, umbrellas: Number(u.data) || 0, sunny: Number(sun.data) || 0 })

      const { data } = await supabase.auth.getUser()
      if (data.user) {
        const start = startOfDayISO()   // start of "today" in the app timezone (matches the DB)
        const t = await supabase.from('umbrellas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', data.user.id).gte('created_at', start)
        setLeft(Math.max(0, DAILY_UMBRELLA_LIMIT - (t.count ?? 0)))
        const ps = await supabase.from('stories')
          .select('*', { count: 'exact', head: true })
          .eq('author_id', data.user.id).gte('created_at', start)
        setPostsLeft(Math.max(0, DAILY_STORY_LIMIT - (ps.count ?? 0)))
        // gentle daily streak, counts "showing up," idempotent per day
        const { data: sc } = await supabase.rpc('touch_streak')
        setStreak(typeof sc === 'number' ? sc : 0)
        // celebrate a milestone once, the day it's reached
        if (STREAK_MILESTONES.includes(sc)) {
          try {
            if (localStorage.getItem('umb_streak_seen') !== String(sc)) {
              localStorage.setItem('umb_streak_seen', String(sc))
              window.dispatchEvent(new CustomEvent('umbrella:burst', {
                detail: { variant: 'open', message: `${sc} days in a row. You keep showing up for people. ☂` }
              }))
            }
          } catch {}
        }
      }
    })()
  }, [])

  // When the visitor opens an umbrella anywhere on the page, update the live
  // counts here immediately instead of waiting for a manual refresh.
  useEffect(() => {
    function onOpened() {
      setLeft((n) => (typeof n === 'number' ? Math.max(0, n - 1) : n))
      setStats((s) => ({ ...s, umbrellas: (s.umbrellas ?? 0) + 1 }))
    }
    window.addEventListener('umbrella:opened', onOpened)
    return () => window.removeEventListener('umbrella:opened', onOpened)
  }, [])

  useEffect(() => {
    const rail = railRef.current
    const slot = railSlotRef.current
    if (!rail || !slot) return

    const TOP_STOP = 82
    const BOTTOM_STOP = 18
    let slotTop = 0
    let railHeight = 0
    let lastScrollY = window.scrollY
    let mode = 'page'
    let active = false

    function getStops() {
      const viewport = window.innerHeight || document.documentElement.clientHeight || 0
      return {
        minTop: Math.min(TOP_STOP, viewport - railHeight - BOTTOM_STOP),
        maxTop: TOP_STOP
      }
    }

    function clampTop(top) {
      const { minTop, maxTop } = getStops()
      return Math.min(maxTop, Math.max(minTop, top))
    }

    function placeWithPage(viewportTop) {
      mode = 'page'
      const localTop = viewportTop + window.scrollY - slotTop
      rail.style.position = 'absolute'
      rail.style.inset = `${Math.round(localTop)}px 0 auto`
      rail.style.width = '100%'
      rail.style.transform = 'none'
    }

    function lockAt(edge) {
      const slotRect = slot.getBoundingClientRect()
      const { minTop, maxTop } = getStops()
      mode = edge
      rail.style.position = 'fixed'
      rail.style.inset = `${Math.round(edge === 'top' ? maxTop : minTop)}px auto auto ${Math.round(slotRect.left)}px`
      rail.style.width = `${Math.round(slotRect.width)}px`
      rail.style.transform = 'none'
    }

    function clearPosition() {
      active = false
      mode = 'page'
      rail.style.position = ''
      rail.style.inset = ''
      rail.style.width = ''
      rail.style.transform = ''
      slot.style.height = ''
    }

    function measureRail() {
      const desktop = !window.matchMedia('(max-width: 1040px)').matches
      if (!desktop) {
        clearPosition()
        lastScrollY = window.scrollY
        return
      }

      const previousTop = active ? rail.getBoundingClientRect().top : null
      railHeight = rail.offsetHeight || 0
      slot.style.height = `${railHeight}px`
      slotTop = slot.getBoundingClientRect().top + window.scrollY
      const nextTop = clampTop(previousTop ?? (slotTop - window.scrollY))
      lastScrollY = window.scrollY
      active = true

      const { minTop, maxTop } = getStops()
      if (nextTop <= minTop) lockAt('bottom')
      else if (nextTop >= maxTop) lockAt('top')
      else placeWithPage(nextTop)
    }

    function moveRail() {
      if (!active) return
      const nextScrollY = window.scrollY
      const delta = nextScrollY - lastScrollY
      lastScrollY = nextScrollY
      if (!delta) return

      const { minTop, maxTop } = getStops()

      // Leaving either stop pins the rail back to the document at that exact
      // point. From there the browser scrolls it normally with the page, so
      // there is no interpolated or spring-like movement.
      if ((mode === 'bottom' && delta < 0) || (mode === 'top' && delta > 0)) {
        const releasedTop = clampTop(rail.getBoundingClientRect().top - delta)
        if (releasedTop <= minTop) lockAt('bottom')
        else if (releasedTop >= maxTop) lockAt('top')
        else placeWithPage(releasedTop)
        return
      }

      if (mode !== 'page') return

      const rect = rail.getBoundingClientRect()
      if (delta > 0 && rect.bottom <= window.innerHeight - BOTTOM_STOP) lockAt('bottom')
      else if (delta < 0 && rect.top >= TOP_STOP) lockAt('top')
    }

    measureRail()
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measureRail) : null
    observer?.observe(rail)
    window.addEventListener('resize', measureRail)
    window.addEventListener('scroll', moveRail, { passive: true })
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measureRail)
      window.removeEventListener('scroll', moveRail)
      clearPosition()
    }
  }, [])

  return (
    <div className="rail-slot" ref={railSlotRef}>
      <aside className="rail" ref={railRef}>
      {streak !== null && streak > 0 && (
        <div className="panel streak">
          <h3>Your streak</h3>
          <div className="streak-n"><span className="streak-ico" aria-hidden="true">☂</span> <CountUpNumber value={streak} /> day{streak === 1 ? '' : 's'}</div>
          <p className="streak-msg">
            {streak === 1
              ? 'You showed up today. That’s the whole thing, come back tomorrow to keep it going. 🫂'
              : `${streak} days in a row. Every day you’re here, someone feels a little less alone.`}
          </p>
        </div>
      )}
      <div className="panel">
        <h3>The community</h3>
        <div className="bigcount">
          <div className="n"><CountUpNumber value={stats.umbrellas ?? 0} /></div>
          <div className="l">☂ umbrellas opened</div>
        </div>
        <div className="ministat"><b><CountUpNumber value={stats.stories ?? 0} /></b> stories shared</div>
        <div className="ministat">☀️ <b><CountUpNumber value={stats.sunny ?? 0} /></b> skies cleared to sunny</div>
      </div>

      <div className="panel quota">
        <h3>Your umbrellas today</h3>
        {left === null
          ? <p className="qmsg"><Link href="/login">Log in</Link> to open umbrellas.</p>
          : <p className="qbig"><b><CountUpNumber value={left} /></b> of {DAILY_UMBRELLA_LIMIT} umbrellas left</p>}
        {postsLeft !== null && <p className="qbig"><b><CountUpNumber value={postsLeft} /></b> of {DAILY_STORY_LIMIT} posts left</p>}
        <p className="qhint">You get {DAILY_UMBRELLA_LIMIT} umbrellas and {DAILY_STORY_LIMIT} posts a day, so each one really counts.</p>
        <p className="qcare">🫂 One umbrella can mean the world to someone. Spend yours kindly, and help make this a place worth standing in.</p>
      </div>

      <div className="panel prompt">
        <h3>This week</h3>
        <p className="q">{WEEKLY_PROMPT.text}</p>
        <button className="btn ghost sm prompt-answer"
          onClick={() => window.dispatchEvent(new CustomEvent('umbrella:answer-prompt', { detail: WEEKLY_PROMPT }))}>
          ☂ Answer this
        </button>
      </div>

      <div className="panel">
        <h3>Need help now?</h3>
        <Link className="crisis" href="/resources">Resource hub &amp; crisis lines →</Link>
        <p className="safe">Peer support, not a substitute for professional counselling or crisis services.</p>
      </div>
      </aside>
    </div>
  )
}

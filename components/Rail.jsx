'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DAILY_UMBRELLA_LIMIT, DAILY_STORY_LIMIT } from '@/lib/config'
import { startOfDayISO } from '@/lib/day'
import { WEEKLY_PROMPT } from '@/lib/prompt'
import { STREAK_MILESTONES } from '@/lib/badges'
import CountUpNumber from '@/components/CountUpNumber'
import { getRailUiCache, updateRailUiCache } from '@/lib/havenUiCache'

export default function Rail() {
  const railRef = useRef(null)
  const railSlotRef = useRef(null)
  const initialCache = useState(() => getRailUiCache())[0]
  const [stats, setStats] = useState(initialCache.stats)
  const [left, setLeft] = useState(initialCache.umbrellasLeft) // null = guest / unknown
  const [postsLeft, setPostsLeft] = useState(initialCache.postsLeft)
  const [streak, setStreak] = useState(initialCache.streak) // days-in-a-row; null = guest

  useEffect(() => {
    if (!supabase) return
    let active = true
    ;(async () => {
      const [pulse, sun, auth] = await Promise.all([
        supabase.rpc('community_pulse'), // privacy-safe aggregate; story rows stay private
        supabase.rpc('sunny_count'),
        supabase.auth.getUser(),
      ])
      if (!active) return

      const pulseRow = Array.isArray(pulse.data) ? pulse.data[0] : pulse.data
      if (!pulse.error && pulseRow) {
        const nextStats = {
          stories: Number(pulseRow.stories) || 0,
          umbrellas: Number(pulseRow.umbrellas) || 0,
          sunny: sun.error ? (initialCache.stats.sunny ?? 0) : Number(sun.data) || 0,
        }
        setStats(nextStats)
        updateRailUiCache({ statsReady: true, stats: nextStats })
      }

      const user = auth.data.user
      if (user) {
        if (initialCache.userId && initialCache.userId !== user.id) {
          setLeft(null)
          setPostsLeft(null)
          setStreak(null)
        }
        const start = startOfDayISO()   // start of "today" in the app timezone (matches the DB)
        const [t, ps, streakResult] = await Promise.all([
          supabase.from('umbrellas').select('*', { count: 'exact', head: true })
            .eq('user_id', user.id).gte('created_at', start),
          supabase.from('stories').select('*', { count: 'exact', head: true })
            .eq('author_id', user.id).gte('created_at', start),
          supabase.rpc('touch_streak'), // idempotent daily streak touch
        ])
        if (!active) return
        const nextLeft = Math.max(0, DAILY_UMBRELLA_LIMIT - (t.count ?? 0))
        const nextPostsLeft = Math.max(0, DAILY_STORY_LIMIT - (ps.count ?? 0))
        const sc = typeof streakResult.data === 'number' ? streakResult.data : 0
        setLeft(nextLeft)
        setPostsLeft(nextPostsLeft)
        setStreak(sc)
        updateRailUiCache({
          userReady: true,
          userId: user.id,
          umbrellasLeft: nextLeft,
          postsLeft: nextPostsLeft,
          streak: sc,
        })
        // celebrate a milestone once, the day it's reached
        if (STREAK_MILESTONES.includes(sc)) {
          try {
            if (localStorage.getItem('umb_streak_seen') !== String(sc)) {
              localStorage.setItem('umb_streak_seen', String(sc))
              window.dispatchEvent(new CustomEvent('umbrella:burst', {
                detail: { variant: 'open', message: `${sc} days in a row. You keep showing up. ☂` }
              }))
            }
          } catch {}
        }
      } else {
        setLeft(null)
        setPostsLeft(null)
        setStreak(null)
        updateRailUiCache({ userReady: true, userId: null, umbrellasLeft: null, postsLeft: null, streak: null })
      }
    })()
    return () => { active = false }
  }, [])

  // When the visitor opens an umbrella anywhere on the page, update the live
  // counts here immediately instead of waiting for a manual refresh.
  useEffect(() => {
    function onOpened() {
      setLeft((n) => {
        const next = typeof n === 'number' ? Math.max(0, n - 1) : n
        updateRailUiCache({ umbrellasLeft: next })
        return next
      })
      setStats((s) => {
        const next = { ...s, umbrellas: (s.umbrellas ?? 0) + 1 }
        updateRailUiCache({ statsReady: true, stats: next })
        return next
      })
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
      rail.classList.remove('rail-settle-top', 'rail-settle-bottom')
      const localTop = viewportTop + window.scrollY - slotTop
      rail.style.position = 'absolute'
      rail.style.inset = `${Math.round(localTop)}px 0 auto`
      rail.style.width = '100%'
      rail.style.transform = 'none'
    }

    function lockAt(edge, settle = false) {
      const slotRect = slot.getBoundingClientRect()
      const { minTop, maxTop } = getStops()
      mode = edge
      rail.classList.remove('rail-settle-top', 'rail-settle-bottom')
      rail.style.position = 'fixed'
      rail.style.inset = `${Math.round(edge === 'top' ? maxTop : minTop)}px auto auto ${Math.round(slotRect.left)}px`
      rail.style.width = `${Math.round(slotRect.width)}px`
      rail.style.transform = 'none'
      if (settle) {
        // Restart the tiny edge-settle animation only when scrolling actually
        // reaches a stop, never while the rail is travelling with the page.
        void rail.offsetWidth
        rail.classList.add(`rail-settle-${edge}`)
      }
    }

    function clearPosition() {
      active = false
      mode = 'page'
      rail.style.position = ''
      rail.style.inset = ''
      rail.style.width = ''
      rail.style.transform = ''
      rail.classList.remove('rail-settle-top', 'rail-settle-bottom')
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
        if (releasedTop <= minTop) lockAt('bottom', true)
        else if (releasedTop >= maxTop) lockAt('top', true)
        else placeWithPage(releasedTop)
        return
      }

      if (mode !== 'page') return

      const rect = rail.getBoundingClientRect()
      if (delta > 0 && rect.bottom <= window.innerHeight - BOTTOM_STOP) lockAt('bottom', true)
      else if (delta < 0 && rect.top >= TOP_STOP) lockAt('top', true)
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
          <div className="streak-n"><span className="streak-ico" aria-hidden="true">☂</span> <CountUpNumber value={streak} initialValue={initialCache.userReady ? streak : undefined} /> day{streak === 1 ? '' : 's'}</div>
          <p className="streak-msg">
            {streak === 1
              ? 'You showed up today. Come back tomorrow and it keeps going.'
              : `${streak} days in a row. That’s a habit now.`}
          </p>
        </div>
      )}
      <div className="panel">
        <h3>The community</h3>
        <div className="bigcount">
          <div className="n"><CountUpNumber value={stats.umbrellas ?? 0} initialValue={initialCache.statsReady ? stats.umbrellas : undefined} /></div>
          <div className="l">☂ umbrellas opened</div>
        </div>
        <div className="ministat"><b><CountUpNumber value={stats.stories ?? 0} initialValue={initialCache.statsReady ? stats.stories : undefined} /></b> stories shared</div>
        <div className="ministat">☀️ <b><CountUpNumber value={stats.sunny ?? 0} initialValue={initialCache.statsReady ? stats.sunny : undefined} /></b> skies cleared to sunny</div>
      </div>

      <div className="panel quota">
        <h3>Your umbrellas today</h3>
        {left === null
          ? <p className="qmsg"><Link href="/login">Log in</Link> to open umbrellas.</p>
          : <p className="qbig"><b><CountUpNumber value={left} initialValue={initialCache.userReady ? left : undefined} /></b> of {DAILY_UMBRELLA_LIMIT} umbrellas left</p>}
        {postsLeft !== null && <p className="qbig"><b><CountUpNumber value={postsLeft} initialValue={initialCache.userReady ? postsLeft : undefined} /></b> of {DAILY_STORY_LIMIT} posts left</p>}
        <p className="qhint">{DAILY_UMBRELLA_LIMIT} umbrellas and {DAILY_STORY_LIMIT} posts a day. That’s the cap, so pick where yours go.</p>
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
        <p className="safe">Haven is peer support. For anything urgent, use these instead.</p>
      </div>
      </aside>
    </div>
  )
}

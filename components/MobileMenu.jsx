'use client'
import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getMe } from '@/lib/me'
import { CATEGORIES } from '@/lib/categories'
import { mobileMenuCopy } from '@/lib/mobileMenuI18n'

// Compact mobile drawer: a grid of tap targets with part of the page left visible.
const LINKS = [
  { href: '/feed', icon: '🏠', key: 'home' },
  { href: '/search', icon: '🔍', key: 'search' },
  { href: '/inbox', icon: '📨', key: 'inbox' },
  { href: '/resources', icon: '📎', key: 'resources' },
  { href: '/welcome', icon: '☂', key: 'how' },
  { href: '/settings', icon: '⚙️', key: 'settings' },
  { href: '/feedback', icon: '💬', key: 'feedback' },
  { href: '/guidelines', icon: '📜', key: 'guidelines' }
]

function savedLanguage() {
  if (typeof window === 'undefined') return 'en'
  return localStorage.getItem('umbrella_language') || document.documentElement.lang || 'en'
}

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [isMod, setIsMod] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState('en')
  const [dragX, setDragX] = useState(0)
  const gesture = useRef(null)
  const suppressClick = useRef(false)
  const closeTimer = useRef(null)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    setLanguage(savedLanguage())
    const sync = (event) => setLanguage(event?.detail?.language || savedLanguage())
    window.addEventListener('umbrella:languagechange', sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener('umbrella:languagechange', sync)
      window.removeEventListener('storage', sync)
    }
  }, [])
  useEffect(() => { getMe().then((m) => setIsMod(m.isModerator)) }, [])
  useEffect(() => {
    return () => clearTimeout(closeTimer.current)
  }, [])
  useEffect(() => { if (open) closeMenu() }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])
  useEffect(() => {
    if (!open) return
    const closeOnEscape = (event) => { if (event.key === 'Escape') closeMenu() }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [open])

  function showMenu() {
    clearTimeout(closeTimer.current)
    setLanguage(savedLanguage())
    setClosing(false)
    setOpen(true)
  }

  function closeMenu() {
    if (!open) return
    clearTimeout(closeTimer.current)
    setDragX(0)
    setClosing(true)
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220
    closeTimer.current = setTimeout(() => {
      setOpen(false)
      setClosing(false)
    }, delay)
  }

  function startSwipe(event) {
    if (!event.isPrimary) return
    suppressClick.current = false
    gesture.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      horizontal: null,
    }
  }

  function moveSwipe(event) {
    const swipe = gesture.current
    if (!swipe || swipe.pointerId !== event.pointerId) return
    const dx = event.clientX - swipe.startX
    const dy = event.clientY - swipe.startY
    if (swipe.horizontal === null && Math.max(Math.abs(dx), Math.abs(dy)) > 8) {
      swipe.horizontal = Math.abs(dx) > Math.abs(dy) && dx < 0
    }
    if (!swipe.horizontal) return
    suppressClick.current = true
    event.currentTarget.setPointerCapture?.(event.pointerId)
    setDragX(Math.max(-window.innerWidth * 0.75, Math.min(0, dx)))
  }

  function endSwipe(event) {
    const swipe = gesture.current
    if (!swipe || swipe.pointerId !== event.pointerId) return
    const dx = event.clientX - swipe.startX
    const dy = event.clientY - swipe.startY
    gesture.current = null
    setDragX(0)
    if (dx < -Math.min(64, window.innerWidth * 0.14) && Math.abs(dx) > Math.abs(dy)) {
      closeMenu()
    }
  }

  function blockSwipeClick(event) {
    if (!suppressClick.current) return
    event.preventDefault()
    event.stopPropagation()
    suppressClick.current = false
  }

  function tour() {
    closeMenu()
    if (pathname === '/feed') window.dispatchEvent(new CustomEvent('umbrella:start-tour'))
    else router.push('/feed?tour=1')
  }

  const copy = mobileMenuCopy(language)

  return (
    <>
      <button className="hamburger notranslate" translate="no" aria-label={copy.openMenu} aria-expanded={open && !closing}
        onClick={showMenu}>
        <span /><span /><span />
      </button>

      {open && mounted && createPortal(
        <div className={'mm-layer notranslate' + (closing ? ' closing' : '')} translate="no">
          <button type="button" className="mm-backdrop" aria-label={copy.closeMenu}
            onClick={closeMenu} />
          <div className={'mm-panel' + (dragX ? ' dragging' : '')}
            role="dialog" aria-modal="true" aria-label={copy.menu}
            style={dragX ? { transform: `translate3d(${dragX}px,0,0)` } : undefined}
            onPointerDown={startSwipe} onPointerMove={moveSwipe}
            onPointerUp={endSwipe} onPointerCancel={endSwipe}
            onClickCapture={blockSwipeClick}>
            <div className="mm-head">
              <span className="mm-title">☂ {copy.menu}</span>
              <button className="mm-close" aria-label={copy.closeMenu} onClick={closeMenu}>✕</button>
            </div>

            <div className="mm-grid">
              {LINKS.map((l) => (
                <Link key={l.href} href={l.href} className="mm-item" onClick={closeMenu}>
                  <span className="mi-ic" aria-hidden="true">{l.icon}</span><span className="mi-label">{copy[l.key]}</span>
                </Link>
              ))}
              <a href="/team" className="mm-item">
                <span className="mi-ic" aria-hidden="true">🫂</span><span className="mi-label">{copy.team}</span>
              </a>
              <button className="mm-item" onClick={tour}>
                <span className="mi-ic" aria-hidden="true">🧭</span><span className="mi-label">{copy.tour}</span>
              </button>
              {isMod && (
                <Link href="/moderation" className="mm-item" onClick={closeMenu}>
                  <span className="mi-ic" aria-hidden="true">🛑</span><span className="mi-label">{copy.reports}</span>
                </Link>
              )}
            </div>

            <div className="mm-section">{copy.browse}</div>
            <div className="mm-cats">
              {CATEGORIES.map((c) => (
                <Link key={c.key} href={`/feed?cat=${c.key}`} className="mm-cat" onClick={closeMenu}>
                  <span className="dot" style={{ background: c.color }} /><span className="mm-cat-label">{copy.categories[c.key] || c.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

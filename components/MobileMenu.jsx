'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getMe } from '@/lib/me'
import { CATEGORIES } from '@/lib/categories'
import { mobileMenuCopy } from '@/lib/mobileMenuI18n'

// Full-screen mobile menu: a grid of big tap targets (no long scrolling list).
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
  const [isMod, setIsMod] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [language, setLanguage] = useState('en')
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
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function tour() {
    setOpen(false)
    if (pathname === '/feed') window.dispatchEvent(new CustomEvent('umbrella:start-tour'))
    else router.push('/feed?tour=1')
  }

  const copy = mobileMenuCopy(language)

  return (
    <>
      <button className="hamburger notranslate" translate="no" aria-label={copy.openMenu} aria-expanded={open}
        onClick={() => { setLanguage(savedLanguage()); setOpen(true) }}>
        <span /><span /><span />
      </button>

      {open && mounted && createPortal(
        <div className="mm-panel notranslate" translate="no" role="dialog" aria-label={copy.menu}>
          <div className="mm-head">
            <span className="mm-title">☂ {copy.menu}</span>
            <button className="mm-close" aria-label={copy.closeMenu} onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="mm-grid">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="mm-item">
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
              <Link href="/moderation" className="mm-item">
                <span className="mi-ic" aria-hidden="true">🛑</span><span className="mi-label">{copy.reports}</span>
              </Link>
            )}
          </div>

          <div className="mm-section">{copy.browse}</div>
          <div className="mm-cats">
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={`/feed?cat=${c.key}`} className="mm-cat">
                <span className="dot" style={{ background: c.color }} /><span className="mm-cat-label">{copy.categories[c.key] || c.name}</span>
              </Link>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

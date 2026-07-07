'use client'
import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { getMe } from '@/lib/me'
import { CATEGORIES } from '@/lib/categories'

// Full-screen mobile menu: a grid of big tap targets (no long scrolling list).
const LINKS = [
  { href: '/feed', icon: '🏠', label: 'Home' },
  { href: '/inbox', icon: '📨', label: 'Inbox' },
  { href: '/resources', icon: '📎', label: 'Resource hub' },
  { href: '/welcome', icon: '☂', label: 'How it works' },
  { href: '/settings', icon: '⚙️', label: 'Settings' },
  { href: '/feedback', icon: '💬', label: 'Feedback' },
  { href: '/guidelines', icon: '📜', label: 'Guidelines' }
]

export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const [isMod, setIsMod] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => { setMounted(true) }, [])
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

  return (
    <>
      <button className="hamburger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <span /><span /><span />
      </button>

      {open && mounted && createPortal(
        <div className="mm-panel" role="dialog" aria-label="Menu">
          <div className="mm-head">
            <span className="mm-title">☂ Menu</span>
            <button className="mm-close" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="mm-grid">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="mm-item">
                <span className="mi-ic" aria-hidden="true">{l.icon}</span>{l.label}
              </Link>
            ))}
            <button className="mm-item" onClick={tour}>
              <span className="mi-ic" aria-hidden="true">🧭</span>Take a tour
            </button>
            {isMod && (
              <Link href="/moderation" className="mm-item">
                <span className="mi-ic" aria-hidden="true">🛑</span>Reports
              </Link>
            )}
          </div>

          <div className="mm-section">Browse by weather</div>
          <div className="mm-cats">
            {CATEGORIES.map((c) => (
              <Link key={c.key} href={`/feed?cat=${c.key}`} className="mm-cat">
                <span className="dot" style={{ background: c.color }} />{c.name}
              </Link>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  )
}

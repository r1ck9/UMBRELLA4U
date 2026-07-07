'use client'
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import Nav from '@/components/Nav'

// Hamburger + slide-out drawer for phones. On desktop it's hidden (CSS);
// the normal sidebar Nav shows instead. The drawer reuses the same Nav so
// there's only one menu to maintain.
export default function MobileMenu() {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Close after navigating, and lock body scroll while open.
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <button className="hamburger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <span /><span /><span />
      </button>
      {open && (
        <div className="drawer-scrim" onClick={() => setOpen(false)}>
          <div className="drawer" role="dialog" aria-label="Menu" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-head">
              <span className="brand">☂ Umbrella</span>
              <button className="drawer-close" aria-label="Close menu" onClick={() => setOpen(false)}>✕</button>
            </div>
            <Nav />
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'haven_care_banner_dismissed'

export default function CareBanner() {
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISSED_KEY) === '1') } catch {}
  }, [])

  function dismiss() {
    setDismissed(true)
    try { localStorage.setItem(DISMISSED_KEY, '1') } catch {}
  }

  if (dismissed) return null

  return (
    <aside className="care-banner" role="note">
      <span>🫂 We know some days are heavy. However you&apos;re feeling, you&apos;re welcome here, just be kind to yourself, and to everyone else.</span>
      <button type="button" className="care-banner-close" onClick={dismiss}
        aria-label="Dismiss this message" title="Dismiss">×</button>
    </aside>
  )
}

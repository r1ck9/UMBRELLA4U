'use client'
import { useEffect, useState } from 'react'

// A reassuring, dismissible notice so people know it's safe to be honest here.
export default function SafetyNote() {
  const [show, setShow] = useState(false)
  useEffect(() => { try { setShow(!localStorage.getItem('umb_safety_seen')) } catch { setShow(true) } }, [])
  if (!show) return null
  function dismiss() { try { localStorage.setItem('umb_safety_seen', '1') } catch {} ; setShow(false) }
  return (
    <div className="safety-note" role="note">
      <span className="sn-ic" aria-hidden="true">🛟</span>
      <div className="sn-body">
        <b>Say what you actually feel.</b>
        <p>Slurs, harassment and hate get blocked before they ever make it onto the feed, and a real person reads every report that comes in. Nobody is going to tear you apart in here.</p>
      </div>
      <button className="sn-x" onClick={dismiss} aria-label="Dismiss">✕</button>
    </div>
  )
}

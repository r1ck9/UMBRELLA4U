'use client'
import { useEffect, useState } from 'react'

const DEFAULT_MSG = "We can't stop the rain — but we can hold out an umbrella for each other."

// Global full-screen umbrella-open celebration.
// Trigger: window.dispatchEvent(new CustomEvent('umbrella:burst', { detail: { message, variant } }))
// variant 'open' = warm amber; variant 'post' = cool blue beam.
export default function UmbrellaBurst() {
  const [burst, setBurst] = useState(null)
  useEffect(() => {
    let timer
    function onBurst(e) {
      const message = (e.detail && e.detail.message) || DEFAULT_MSG
      const variant = (e.detail && e.detail.variant) || 'open'
      setBurst({ id: (window.__umbId = (window.__umbId || 0) + 1), message, variant })
      clearTimeout(timer); timer = setTimeout(() => setBurst(null), variant === 'post' ? 4500 : 3050)
    }
    window.addEventListener('umbrella:burst', onBurst)
    return () => { window.removeEventListener('umbrella:burst', onBurst); clearTimeout(timer) }
  }, [])
  if (!burst) return null
  return (
    <div className={'celebrate ' + burst.variant} key={burst.id}>
      <div className="cele-flash" aria-hidden="true" />
      {burst.variant === 'post' && <div className="cele-beam" aria-hidden="true" />}
      <div className="cele-glow" aria-hidden="true" />
      <div className="cele-rings" aria-hidden="true"><span /><span /><span /></div>
      <div className="cele-rain" aria-hidden="true">
        {Array.from({ length: 22 }).map((_, i) => (
          <span key={i} style={{
            left: `${(i * 4.5) % 100}%`,
            animationDelay: `${(i % 7) * 0.11}s`,
            animationDuration: `${0.85 + (i % 5) * 0.13}s`,
            opacity: 0.28 + (i % 4) * 0.16
          }} />
        ))}
      </div>
      <svg className="cele-umb" viewBox="0 0 200 210" aria-hidden="true">
        <defs>
          <linearGradient id="celeG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f5b168" />
            <stop offset="1" stopColor="#c9721f" />
          </linearGradient>
        </defs>
        <line x1="100" y1="95" x2="100" y2="172" stroke="#d9c4a6" strokeWidth="4" strokeLinecap="round" />
        <path d="M100 172 a13 13 0 0 1 -26 0" fill="none" stroke="#d9c4a6" strokeWidth="4" strokeLinecap="round" />
        <g className="cele-canopy">
          <path d="M20 95 Q33 109 46 95 Q60 109 74 95 Q87 109 100 95 Q113 109 126 95 Q140 109 154 95 Q167 109 180 95 A82 66 0 0 0 20 95 Z" fill="url(#celeG)" />
          <line x1="100" y1="33" x2="100" y2="16" stroke="#eac08a" strokeWidth="3" strokeLinecap="round" />
          <g stroke="rgba(60,30,0,.16)" strokeWidth="1.2">
            <line x1="100" y1="34" x2="46" y2="95" /><line x1="100" y1="34" x2="74" y2="95" />
            <line x1="100" y1="34" x2="126" y2="95" /><line x1="100" y1="34" x2="154" y2="95" />
          </g>
        </g>
      </svg>
      <p className="cele-msg">{burst.message}</p>
    </div>
  )
}

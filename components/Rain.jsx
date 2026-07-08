'use client'
import { useEffect, useRef } from 'react'

// Ambient three-layer parallax downpour behind the whole app. Delta-timed for
// smooth 60fps; DPR-aware for crisp streaks; respects reduced-motion.
export default function Rain() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches
    let W, H, DPR, layers = [], raf, last = null

    // rain color from the theme token (falls back to a cool slate)
    const rc = getComputedStyle(document.documentElement).getPropertyValue('--rainc') || ''
    const m = rc.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    const rgb = m ? `${m[1]},${m[2]},${m[3]}` : '150,165,185'

    // far -> near: fewer/slower/fainter to more/faster/brighter
    const SPECS = [
      { dens: 16, s: 95, len: 8, w: 1, a: 0.11 },
      { dens: 12, s: 185, len: 14, w: 1.2, a: 0.22 },
      { dens: 9, s: 320, len: 22, w: 1.7, a: 0.34 }
    ]

    function size() {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth; H = window.innerHeight
      c.width = W * DPR; c.height = H * DPR; x.setTransform(DPR, 0, 0, DPR, 0, 0)
      layers = SPECS.map((sp) => {
        const n = Math.round(W / sp.dens), d = []
        for (let i = 0; i < n; i++) d.push({ x: Math.random() * W, y: Math.random() * H })
        return { ...sp, d }
      })
    }

    function paint(dt) {
      x.clearRect(0, 0, W, H); x.lineCap = 'round'
      for (const L of layers) {
        x.strokeStyle = `rgba(${rgb},${L.a})`; x.lineWidth = L.w
        for (const d of L.d) {
          x.beginPath(); x.moveTo(d.x, d.y); x.lineTo(d.x - 1.8, d.y - L.len); x.stroke()
          d.y += L.s * dt
          if (d.y > H + L.len) { d.y = -L.len; d.x = Math.random() * W }
        }
      }
    }
    function frame(ts) {
      if (last === null) last = ts
      const dt = Math.min((ts - last) / 1000, 0.05); last = ts
      paint(dt)
      raf = requestAnimationFrame(frame)
    }

    size(); window.addEventListener('resize', size)
    if (reduce) paint(0)              // one static frame
    else raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])
  return <canvas ref={ref} className="rainbg" aria-hidden="true" />
}

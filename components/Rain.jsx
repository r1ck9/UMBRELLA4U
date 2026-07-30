'use client'
import { useEffect, useRef } from 'react'

// Subtle ambient rain behind the whole app.
export default function Rain() {
  const ref = useRef(null)
  useEffect(() => {
    const c = ref.current, x = c.getContext('2d')
    let W, H, drops = [], raf
    const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches
    const col = (getComputedStyle(document.documentElement).getPropertyValue('--rainc') || 'rgba(118,80,154,.3)').trim()
    function size() {
      W = c.width = window.innerWidth; H = c.height = window.innerHeight; drops = []
      const n = Math.round(W / 14)
      for (let i = 0; i < n; i++) drops.push({ x: (i * 37) % W, y: (i * 71) % H, l: 9 + ((i * 13) % 16), s: 2 + ((i % 6) * 0.6) })
    }
    function draw() {
      x.clearRect(0, 0, W, H); x.strokeStyle = col; x.lineWidth = 1
      for (const d of drops) {
        x.beginPath(); x.moveTo(d.x, d.y); x.lineTo(d.x - 1.6, d.y + d.l); x.stroke()
        d.y += d.s; if (d.y > H) d.y = -d.l
      }
      raf = requestAnimationFrame(draw)
    }
    size(); window.addEventListener('resize', size)
    if (reduce) draw() // one static frame
    else draw()
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [])
  return <canvas ref={ref} className="rainbg" aria-hidden="true" />
}

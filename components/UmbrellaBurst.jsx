'use client'
import { useEffect, useRef, useState } from 'react'

const DEFAULT_MSG = "We can't stop the rain — but we can hold out an umbrella for each other."

function easeOutBack(x){ const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }

// Draw a right-side-up umbrella centered at (cx,cy) with canopy radius r.
function umbrella(ctx, cx, cy, r, hi, lo, rib, pole){
  if (r < 2) return
  const n = 6, step = (2 * r) / n
  ctx.beginPath()
  ctx.arc(cx, cy, r, Math.PI, 0, false)                  // dome over the top
  for (let i = 0; i < n; i++){ const x0 = cx + r - i * step, x1 = x0 - step; ctx.quadraticCurveTo((x0 + x1) / 2, cy + r * 0.14, x1, cy) }
  ctx.closePath()
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy)
  g.addColorStop(0, hi); g.addColorStop(1, lo)
  ctx.fillStyle = g; ctx.fill()
  ctx.strokeStyle = rib; ctx.lineWidth = Math.max(1, r * 0.014)
  for (let i = 0; i <= n; i++){ const x = cx - r + i * step; ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(x, cy); ctx.stroke() }
  ctx.beginPath(); ctx.moveTo(cx, cy - r); ctx.lineTo(cx, cy - r - r * 0.15); ctx.lineWidth = Math.max(1.5, r * 0.022); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + r * 1.2); ctx.strokeStyle = pole; ctx.lineWidth = Math.max(1.6, r * 0.028); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx - r * 0.13, cy + r * 1.2, r * 0.13, 0, Math.PI, false); ctx.stroke()
}

// Global full-screen "umbrella opens and blooms" celebration (canvas).
// Trigger: window.dispatchEvent(new CustomEvent('umbrella:burst', { detail: { message, variant } }))
export default function UmbrellaBurst() {
  const [burst, setBurst] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let timer
    function onBurst(e) {
      const message = (e.detail && e.detail.message) || DEFAULT_MSG
      const variant = (e.detail && e.detail.variant) || 'open'
      setBurst({ id: (window.__umbId = (window.__umbId || 0) + 1), message, variant })
      clearTimeout(timer); timer = setTimeout(() => setBurst(null), variant === 'post' ? 4200 : 3050)
    }
    window.addEventListener('umbrella:burst', onBurst)
    return () => { window.removeEventListener('umbrella:burst', onBurst); clearTimeout(timer) }
  }, [])

  useEffect(() => {
    if (!burst) return
    const cv = canvasRef.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches
    const warm = burst.variant !== 'post'
    const glow = warm ? '240,168,98' : '128,176,232'
    const spray = warm ? '255,224,186' : '214,230,255'
    const umbHi = warm ? '#f6b06a' : '#8bb4e6', umbLo = warm ? '#d97e37' : '#4f83c8'
    const rib = warm ? 'rgba(90,45,10,.22)' : 'rgba(20,40,80,.28)', pole = warm ? '#e6d3b6' : '#cdd9ea'

    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    function size(){ cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0) }
    size(); window.addEventListener('resize', size)

    let raf, last = null, t = 0, parts = [], rings = [], sparked = false, alive = true

    function render(t){
      const W = innerWidth, H = innerHeight, cx = W / 2, cy = H * 0.42, R = Math.min(W, H) * 0.15
      ctx.clearRect(0, 0, W, H)
      // warm/cool glow behind the umbrella
      const gr = ctx.createRadialGradient(cx, cy, 4, cx, cy, R * 3.2)
      const gA = 0.16 + 0.10 * Math.sin(t * 3)
      gr.addColorStop(0, 'rgba(' + glow + ',' + gA + ')'); gr.addColorStop(1, 'rgba(' + glow + ',0)')
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
      // expanding shock rings
      for (const rp of rings){ ctx.strokeStyle = 'rgba(' + glow + ',' + Math.max(0, rp.life) * 0.5 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy + R * 0.15, rp.r, 0, Math.PI * 2); ctx.stroke() }
      // droplet spray
      for (const q of parts){ ctx.fillStyle = 'rgba(' + spray + ',' + Math.max(0, q.life) + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, 2.1, 0, Math.PI * 2); ctx.fill() }
      // the umbrella, springing open
      const scale = easeOutBack(Math.min(t / 0.5, 1))
      umbrella(ctx, cx, cy, R * scale, umbHi, umbLo, rib, pole)
    }

    function spark(t){
      if (sparked || t < 0.46) return
      sparked = true
      const W = innerWidth, H = innerHeight, cx = W / 2, cy = H * 0.42, R = Math.min(W, H) * 0.15
      const N = 52
      for (let i = 0; i < N; i++){ const a = (i / N) * Math.PI * 2 + Math.random() * 0.3; const sp = 180 + Math.random() * 260; parts.push({ x: cx, y: cy + R * 0.15, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 170, life: 1 }) }
      rings.push({ r: R * 0.5, life: 1 })
    }

    function frame(ts){
      if (!alive) return
      if (last === null) last = ts
      const dt = Math.min((ts - last) / 1000, 0.05); last = ts; t += dt
      spark(t)
      for (let i = parts.length - 1; i >= 0; i--){ const q = parts[i]; q.vy += 540 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt * 0.6; if (q.life <= 0) parts.splice(i, 1) }
      for (let i = rings.length - 1; i >= 0; i--){ const rp = rings[i]; rp.r += 460 * dt; rp.life -= dt * 1.3; if (rp.life <= 0) rings.splice(i, 1) }
      render(t)
      raf = requestAnimationFrame(frame)
    }

    if (reduce){ spark(0.6); render(0.6) }   // one settled frame, no motion
    else raf = requestAnimationFrame(frame)

    return () => { alive = false; cancelAnimationFrame(raf); window.removeEventListener('resize', size) }
  }, [burst])

  if (!burst) return null
  return (
    <div className={'celebrate ' + burst.variant} key={burst.id}>
      <canvas ref={canvasRef} className="cele-canvas" aria-hidden="true" />
      <p className="cele-msg">{burst.message}</p>
    </div>
  )
}

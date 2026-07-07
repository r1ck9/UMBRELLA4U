'use client'
import { useEffect, useRef, useState } from 'react'

const DEFAULT_MSG = "We can't stop the rain — but we can hold out an umbrella for each other."

const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x

// A right-side-up umbrella. rx/ry are the canopy half-width/height (rx animates as it opens).
function umbrella(ctx, cx, cy, rx, ry, hi, lo, rib, pole){
  if (rx < 1) return
  const n = 7, x0 = cx - rx, span = (2 * rx) / n
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, Math.PI, 0, false)              // canopy dome, over the top
  for (let i = 0; i < n; i++){ const a = cx + rx - i * span, b = a - span; ctx.quadraticCurveTo((a + b) / 2, cy + ry * 0.26, b, cy) }
  ctx.closePath()
  const g = ctx.createLinearGradient(cx - rx, cy - ry, cx + rx * 0.4, cy)
  g.addColorStop(0, hi); g.addColorStop(1, lo)
  ctx.fillStyle = g; ctx.fill()
  // glossy highlight sweep near the crown
  ctx.beginPath(); ctx.ellipse(cx - rx * 0.28, cy - ry * 0.34, rx * 0.34, ry * 0.28, 0, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255,255,255,.14)'; ctx.fill()
  // ribs
  ctx.strokeStyle = rib; ctx.lineWidth = Math.max(1, rx * 0.012); ctx.lineJoin = 'round'
  for (let i = 0; i <= n; i++){ const x = x0 + i * span; ctx.beginPath(); ctx.moveTo(cx, cy - ry); ctx.lineTo(x, cy); ctx.stroke() }
  // finial + pole + handle
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx, cy - ry); ctx.lineTo(cx, cy - ry - ry * 0.22); ctx.lineWidth = Math.max(1.6, rx * 0.02); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + rx * 1.15)
  ctx.strokeStyle = pole; ctx.lineWidth = Math.max(1.8, rx * 0.026); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx - rx * 0.13, cy + rx * 1.15, rx * 0.13, 0, Math.PI, false); ctx.stroke()
}

// Global full-screen "umbrella opens and blooms" celebration (canvas, delta-timed 60fps).
export default function UmbrellaBurst() {
  const [burst, setBurst] = useState(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    let timer
    function onBurst(e) {
      const message = (e.detail && e.detail.message) || DEFAULT_MSG
      const variant = (e.detail && e.detail.variant) || 'open'
      setBurst({ id: (window.__umbId = (window.__umbId || 0) + 1), message, variant })
      clearTimeout(timer); timer = setTimeout(() => setBurst(null), variant === 'post' ? 4200 : 3400)
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
    const glow = warm ? '240,164,79' : '132,180,236'                        // original amber glow
    const spray = warm ? '198,214,238' : '216,232,255'                      // water droplets stay cool (like the original rain)
    const umbHi = warm ? '#f5b168' : '#8fb8ea', umbLo = warm ? '#c9721f' : '#4a7ec4'   // original canopy gradient
    const rib = warm ? 'rgba(60,30,0,.16)' : 'rgba(18,38,78,.28)', pole = warm ? '#d9c4a6' : '#cfdaec'
    const bigR = warm ? 0.205 : 0.165                       // "open" is larger
    const cyF = warm ? 0.37 : 0.40                          // "open" sits a touch higher / centered

    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    function size(){ cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0) }
    size(); window.addEventListener('resize', size)

    let raf, last = null, t = 0, alive = true
    let parts = [], rings = [], rain = [], splashes = [], sparked = false, rainAcc = 0

    function geo(){
      const W = innerWidth, H = innerHeight, R = Math.min(W, H) * bigR
      const yoff = -14 * easeOut(clamp01(t / 1.1))          // gentle lift as it opens
      return { W, H, cx: W / 2, cy: H * cyF + yoff, R }
    }
    function domeTopY(g, rx, ry, x){ const dx = (x - g.cx) / rx; if (Math.abs(dx) > 1) return Infinity; return g.cy - ry * Math.sqrt(1 - dx * dx) }

    function spark(g, rx, ry){
      if (sparked) return
      sparked = true
      const N = 64
      for (let i = 0; i < N; i++){
        const frac = i / N, ang = -Math.PI * 0.02 - Math.PI * (0.96 * frac)   // fling off the rim, up-and-out
        const rimx = g.cx + Math.cos(Math.PI - Math.PI * frac) * rx
        const rimy = g.cy - Math.sin(Math.PI * frac) * ry * 0.3
        const dir = rimx < g.cx ? -1 : 1
        const sp = 200 + Math.random() * 300
        parts.push({ x: rimx, y: rimy, vx: dir * Math.abs(Math.cos(ang)) * sp * (0.5 + Math.random()), vy: -Math.abs(Math.sin(ang)) * sp - 120 - Math.random() * 120, life: 1, r: 1.4 + Math.random() * 2.2 })
      }
      rings.push({ r: rx * 0.7, life: 1 }); rings.push({ r: rx * 0.3, life: 1, d: 0.12 })
    }

    function render(){
      const g = geo(), { W, H, cx, cy, R } = g
      // canopy opens horizontally with an overshoot; height fills in slightly after
      const p = clamp01((t - 0.10) / 0.52)
      const open = 0.06 + 0.94 * easeOutBack(p)
      const rx = R * open
      const ry = R * 0.66 * (0.34 + 0.66 * clamp01(p * 1.7))
      if (p > 0.55) spark(g, rx, ry)

      ctx.clearRect(0, 0, W, H)

      // --- ambient rain behind everything (two parallax layers) ---
      ctx.lineCap = 'round'
      for (const d of rain){
        ctx.strokeStyle = 'rgba(' + spray + ',' + (d.layer === 0 ? 0.16 : 0.30) + ')'
        ctx.lineWidth = d.layer === 0 ? 1 : 1.5
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.12, d.y - d.len); ctx.stroke()
      }

      // --- warm light bloom, drawn additively so it glows ---
      ctx.globalCompositeOperation = 'lighter'
      const bloom = 0.10 + 0.20 * easeOut(clamp01((t - 0.28) / 0.5)) - 0.06 * clamp01((t - 1.4) / 1)
      const gr = ctx.createRadialGradient(cx, cy - ry * 0.2, 4, cx, cy - ry * 0.2, R * 3.4)
      gr.addColorStop(0, 'rgba(' + glow + ',' + Math.max(0, bloom) + ')'); gr.addColorStop(1, 'rgba(' + glow + ',0)')
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
      // shock rings
      for (const rp of rings){ const rr = (rp.r); ctx.strokeStyle = 'rgba(' + glow + ',' + Math.max(0, rp.life) * 0.4 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy + ry * 0.1, rr, 0, Math.PI * 2); ctx.stroke() }
      ctx.globalCompositeOperation = 'source-over'

      // --- canopy splashes (rain hitting the dome) ---
      for (const s of splashes){ ctx.fillStyle = 'rgba(' + spray + ',' + Math.max(0, s.life) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill() }

      // --- flung droplets, with little motion-blur trails ---
      for (const q of parts){
        const a = Math.max(0, q.life)
        ctx.strokeStyle = 'rgba(' + spray + ',' + a * 0.5 + ')'; ctx.lineWidth = q.r * 0.9
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.025, q.y - q.vy * 0.025); ctx.stroke()
        ctx.fillStyle = 'rgba(' + spray + ',' + a + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill()
      }

      umbrella(ctx, cx, cy, rx, ry, umbHi, umbLo, rib, pole)
      return { g, rx, ry }
    }

    function frame(ts){
      if (!alive) return
      if (last === null) last = ts
      const dt = Math.min((ts - last) / 1000, 0.05); last = ts; t += dt
      const W = innerWidth, H = innerHeight

      // spawn ambient rain
      rainAcc += dt * W * 0.16
      while (rainAcc > 1){ rainAcc--; rain.push({ x: Math.random() * W, y: -40, len: 42 + Math.random() * 46, spd: 900 + Math.random() * 500, layer: Math.random() < 0.5 ? 0 : 1 }) }

      const { g, rx, ry } = render()
      // integrate after render used current positions
      for (let i = rain.length - 1; i >= 0; i--){ const d = rain[i]; d.y += d.spd * dt * (d.layer === 0 ? 0.8 : 1)
        const ty = domeTopY(g, rx, ry, d.x)
        if (ty !== Infinity && d.y >= ty && d.y < ty + 30){ for (let k = 0; k < 3; k++) splashes.push({ x: d.x + (Math.random() - .5) * 6, y: ty, life: 1 }); rain.splice(i, 1); continue }
        if (d.y > H + 40) rain.splice(i, 1)
      }
      for (let i = parts.length - 1; i >= 0; i--){ const q = parts[i]; q.vy += 560 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt * 0.52; if (q.life <= 0 || q.y > H + 20) parts.splice(i, 1) }
      for (let i = rings.length - 1; i >= 0; i--){ const rp = rings[i]; if (rp.d){ rp.d -= dt; if (rp.d > 0) continue } rp.r += 520 * dt; rp.life -= dt * 1.25; if (rp.life <= 0) rings.splice(i, 1) }
      for (let i = splashes.length - 1; i >= 0; i--){ const s = splashes[i]; s.y -= 20 * dt; s.life -= dt * 2.4; if (s.life <= 0) splashes.splice(i, 1) }

      raf = requestAnimationFrame(frame)
    }

    if (reduce){ t = 0.9; spark(geo(), geo().R, geo().R * 0.6); render() }
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

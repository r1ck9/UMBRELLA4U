'use client'
import { useEffect, useRef, useState } from 'react'

const DEFAULT_MSG = "We can't stop the rain — but we can hold out an umbrella for each other."

const easeOutBack = (x) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2) }
const easeOut = (x) => 1 - Math.pow(1 - x, 3)
const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x
const lerp = (a, b, t) => a + (b - a) * t

// A front-view umbrella built from triangular fabric PANELS that fan open.
// `open` (0..1, can overshoot) drives the bloom: tips travel from a closed
// vertical bundle out to the scalloped rim.
function umbrella(ctx, cx, cy, R, open, C){
  const n = 8, ry = R * 0.66, apexY = cy - ry
  const tips = []
  for (let i = 0; i <= n; i++){
    const ox = cx - R + i * (2 * R / n), oy = cy                 // open rim tip
    const bx = cx + (i - n / 2) * (R * 0.05), by = cy - ry * 0.72 // closed bundle tip
    tips.push([lerp(bx, ox, open), lerp(by, oy, open)])
  }
  // fabric panels (alternating shade → faceted look)
  for (let i = 0; i < n; i++){
    const a = tips[i], b = tips[i + 1]
    ctx.beginPath()
    ctx.moveTo(cx, apexY)
    ctx.lineTo(a[0], a[1])
    ctx.quadraticCurveTo((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + ry * 0.24 * clamp01(open), b[0], b[1])
    ctx.closePath()
    ctx.fillStyle = (i % 2 === 0) ? C.a : C.b
    ctx.fill()
  }
  // ribs along panel seams
  ctx.strokeStyle = C.rib; ctx.lineWidth = Math.max(1, R * 0.012); ctx.lineJoin = 'round'; ctx.lineCap = 'round'
  for (let i = 0; i <= n; i++){ ctx.beginPath(); ctx.moveTo(cx, apexY); ctx.lineTo(tips[i][0], tips[i][1]); ctx.stroke() }
  // finial, pole, hook handle
  ctx.beginPath(); ctx.moveTo(cx, apexY); ctx.lineTo(cx, apexY - ry * 0.22); ctx.lineWidth = Math.max(1.6, R * 0.02); ctx.strokeStyle = C.pole; ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + R * 1.1); ctx.lineWidth = Math.max(1.8, R * 0.026); ctx.stroke()
  ctx.beginPath(); ctx.arc(cx - R * 0.12, cy + R * 1.1, R * 0.12, 0, Math.PI, false); ctx.stroke()
}

// Global full-screen "umbrella unfurls" celebration (canvas, delta-timed 60fps).
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
    const glow = warm ? '240,164,79' : '132,180,236'
    const spray = warm ? '198,214,238' : '216,232,255'
    // original amber family — two panel shades within it
    const C = warm
      ? { a: '#f5b168', b: '#d67f2f', rib: '#c9721f', pole: '#d9c4a6' }
      : { a: '#8fb8ea', b: '#4f83c8', rib: '#3a6db0', pole: '#cfdaec' }
    const bigR = warm ? 0.205 : 0.165
    const cyF = warm ? 0.37 : 0.40

    const DPR = Math.min(window.devicePixelRatio || 1, 2)
    function size(){ cv.width = Math.round(innerWidth * DPR); cv.height = Math.round(innerHeight * DPR); ctx.setTransform(DPR, 0, 0, DPR, 0, 0) }
    size(); window.addEventListener('resize', size)

    let raf, last = null, t = 0, alive = true
    let parts = [], rings = [], rain = [], splashes = [], sparked = false, rainAcc = 0

    function geo(){
      const W = innerWidth, H = innerHeight, R = Math.min(W, H) * bigR
      const yoff = -14 * easeOut(clamp01(t / 1.1))
      return { W, H, cx: W / 2, cy: H * cyF + yoff, R }
    }
    function domeTopY(g, R, ry, x){ const dx = (x - g.cx) / R; if (Math.abs(dx) > 1) return Infinity; return g.cy - ry * Math.sqrt(1 - dx * dx) }

    function spark(g, R){
      if (sparked) return
      sparked = true
      const N = 60
      for (let i = 0; i < N; i++){
        const frac = i / (N - 1), dir = frac < 0.5 ? -1 : 1
        const rimx = g.cx + (frac * 2 - 1) * R, rimy = g.cy
        const sp = 200 + Math.random() * 300
        parts.push({ x: rimx, y: rimy, vx: dir * (40 + Math.random() * 220), vy: -sp - Math.random() * 120, life: 1, r: 1.4 + Math.random() * 2.2 })
      }
      rings.push({ r: R * 0.7, life: 1 }); rings.push({ r: R * 0.3, life: 1, d: 0.12 })
    }

    function render(){
      const g = geo(), { W, H, cx, cy, R } = g
      const p = clamp01((t - 0.12) / 0.58)
      const open = easeOutBack(p)                 // overshoots slightly then settles → snap
      const ry = R * 0.66
      if (p > 0.5) spark(g, R)

      ctx.clearRect(0, 0, W, H)

      // ambient rain behind (two parallax layers)
      ctx.lineCap = 'round'
      for (const d of rain){
        ctx.strokeStyle = 'rgba(' + spray + ',' + (d.layer === 0 ? 0.16 : 0.30) + ')'
        ctx.lineWidth = d.layer === 0 ? 1 : 1.5
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len * 0.12, d.y - d.len); ctx.stroke()
      }

      // warm bloom + shock rings, additive so they glow
      ctx.globalCompositeOperation = 'lighter'
      const bloom = 0.10 + 0.20 * easeOut(clamp01((t - 0.28) / 0.5)) - 0.06 * clamp01((t - 1.4) / 1)
      const gr = ctx.createRadialGradient(cx, cy - ry * 0.2, 4, cx, cy - ry * 0.2, R * 3.4)
      gr.addColorStop(0, 'rgba(' + glow + ',' + Math.max(0, bloom) + ')'); gr.addColorStop(1, 'rgba(' + glow + ',0)')
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H)
      for (const rp of rings){ ctx.strokeStyle = 'rgba(' + glow + ',' + Math.max(0, rp.life) * 0.4 + ')'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy + ry * 0.1, rp.r, 0, Math.PI * 2); ctx.stroke() }
      ctx.globalCompositeOperation = 'source-over'

      for (const s of splashes){ ctx.fillStyle = 'rgba(' + spray + ',' + Math.max(0, s.life) + ')'; ctx.beginPath(); ctx.arc(s.x, s.y, 1.6, 0, Math.PI * 2); ctx.fill() }

      for (const q of parts){
        const a = Math.max(0, q.life)
        ctx.strokeStyle = 'rgba(' + spray + ',' + a * 0.5 + ')'; ctx.lineWidth = q.r * 0.9
        ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(q.x - q.vx * 0.025, q.y - q.vy * 0.025); ctx.stroke()
        ctx.fillStyle = 'rgba(' + spray + ',' + a + ')'; ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, Math.PI * 2); ctx.fill()
      }

      umbrella(ctx, cx, cy, R, open, C)
      return { g, R, ry }
    }

    function frame(ts){
      if (!alive) return
      if (last === null) last = ts
      const dt = Math.min((ts - last) / 1000, 0.05); last = ts; t += dt
      const W = innerWidth, H = innerHeight

      rainAcc += dt * W * 0.16
      while (rainAcc > 1){ rainAcc--; rain.push({ x: Math.random() * W, y: -40, len: 42 + Math.random() * 46, spd: 900 + Math.random() * 500, layer: Math.random() < 0.5 ? 0 : 1 }) }

      const { g, R, ry } = render()
      for (let i = rain.length - 1; i >= 0; i--){ const d = rain[i]; d.y += d.spd * dt * (d.layer === 0 ? 0.8 : 1)
        const ty = domeTopY(g, R, ry, d.x)
        if (ty !== Infinity && d.y >= ty && d.y < ty + 30){ for (let k = 0; k < 3; k++) splashes.push({ x: d.x + (Math.random() - .5) * 6, y: ty, life: 1 }); rain.splice(i, 1); continue }
        if (d.y > H + 40) rain.splice(i, 1)
      }
      for (let i = parts.length - 1; i >= 0; i--){ const q = parts[i]; q.vy += 560 * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.life -= dt * 0.52; if (q.life <= 0 || q.y > H + 20) parts.splice(i, 1) }
      for (let i = rings.length - 1; i >= 0; i--){ const rp = rings[i]; if (rp.d){ rp.d -= dt; if (rp.d > 0) continue } rp.r += 520 * dt; rp.life -= dt * 1.25; if (rp.life <= 0) rings.splice(i, 1) }
      for (let i = splashes.length - 1; i >= 0; i--){ const s = splashes[i]; s.y -= 20 * dt; s.life -= dt * 2.4; if (s.life <= 0) splashes.splice(i, 1) }

      raf = requestAnimationFrame(frame)
    }

    if (reduce){ t = 0.9; render() }
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

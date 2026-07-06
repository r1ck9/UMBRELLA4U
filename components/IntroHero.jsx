'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function IntroHero() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches
    let W, H, dpr, cx, cy, R, near = [], far = [], splashes = [], start = null, last = null, raf

    function mkDrop(layer, fromTop) {
      const slow = layer === 'far'
      return {
        x: Math.random() * W,
        y: fromTop ? -20 - Math.random() * H : Math.random() * H,
        s: slow ? 1.7 + Math.random() * 1.4 : 3.6 + Math.random() * 3.0,
        l: slow ? 6 + Math.random() * 8 : 11 + Math.random() * 11,
        a: slow ? 0.12 + Math.random() * 0.12 : 0.30 + Math.random() * 0.22
      }
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth; H = canvas.clientHeight
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = W / 2; cy = H * 0.40; R = Math.min(W * 0.32, H * 0.36, 270)
      far = []; near = []
      const nf = Math.round(W / 10), nn = Math.round(W / 8)
      for (let i = 0; i < nf; i++) far.push(mkDrop('far', false))
      for (let i = 0; i < nn; i++) near.push(mkDrop('near', false))
    }
    function easeBack(t) { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2) }
    function domeY(x, w, dh) { const dx = (x - cx) / w; if (Math.abs(dx) > 1) return Infinity; return cy - dh * Math.sqrt(1 - dx * dx) }

    function drawRainLayer(list, dt, collide, w, dh, bob) {
      for (const d of list) {
        d.y += d.s * dt
        if (collide && d.x > cx - w && d.x < cx + w) {
          const surf = domeY(d.x, w, dh) + bob
          if (d.y >= surf && d.y < cy + bob + 3) {
            if (!reduce) for (let k = 0; k < 2; k++)
              splashes.push({ x: d.x, y: surf, vx: ((d.x - cx) / w) * 1.7 + (Math.random() - 0.5) * 1.1, vy: -1.1 - Math.random() * 1.3, life: 1 })
            Object.assign(d, mkDrop(collide ? 'near' : 'far', true)); continue
          }
        }
        ctx.strokeStyle = `rgba(178,200,230,${d.a})`
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 1.6, d.y + d.l); ctx.stroke()
        if (d.y > H + 20) Object.assign(d, mkDrop(collide ? 'near' : 'far', true))
      }
    }

    function drawUmbrella(w, dh, k) {
      const scallops = 6, droop = 11 * k
      ctx.beginPath()
      ctx.moveTo(cx - w, cy)
      for (let i = 0; i < scallops; i++) {
        const x1 = cx - w + (2 * w) * ((i + 1) / scallops)
        const mid = cx - w + (2 * w) * ((i + 0.5) / scallops)
        ctx.quadraticCurveTo(mid, cy + droop, x1, cy)
      }
      ctx.ellipse(cx, cy, w, dh, 0, 0, Math.PI, true)
      ctx.closePath()
      const g = ctx.createLinearGradient(cx, cy - dh, cx, cy)
      g.addColorStop(0, '#f7b56d'); g.addColorStop(1, '#c9721f')
      ctx.fillStyle = g; ctx.fill()
      // sheen
      const sh = ctx.createLinearGradient(cx - w, cy - dh, cx + w, cy)
      sh.addColorStop(0, 'rgba(255,255,255,.18)'); sh.addColorStop(.5, 'rgba(255,255,255,0)')
      ctx.fillStyle = sh; ctx.fill()
      ctx.strokeStyle = 'rgba(60,30,0,.18)'; ctx.lineWidth = Math.max(k, 0.5)
      for (let i = 1; i < scallops; i++) {
        const x = cx - w + (2 * w) * (i / scallops)
        ctx.beginPath(); ctx.moveTo(cx, cy - dh); ctx.lineTo(x, cy); ctx.stroke()
      }
      ctx.beginPath(); ctx.moveTo(cx, cy - dh); ctx.lineTo(cx, cy - dh - 16)
      ctx.strokeStyle = '#eac08a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.stroke()
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + R * 0.98)
      ctx.strokeStyle = '#d9c4a6'; ctx.lineWidth = 3; ctx.stroke()
      ctx.beginPath(); ctx.arc(cx - 13, cy + R * 0.98, 13, 0, Math.PI, false); ctx.stroke()
    }

    function frame(ts) {
      if (!start) start = ts
      if (!last) last = ts
      const dt = Math.min((ts - last) / 16.667, 3); last = ts

      const openT = Math.min(Math.max((ts - start - 700) / 2400, 0), 1)
      const p = reduce ? 1 : easeBack(openT)
      const pd = Math.min(Math.max(p, 0), 1)
      const bob = reduce ? 0 : Math.sin((ts - start) / 1500) * 2 * pd
      const w = R * (0.06 + 0.94 * Math.max(p, 0.001))
      const dh = R * (0.74 - 0.12 * pd)
      ctx.clearRect(0, 0, W, H)

      // warm bloom behind the umbrella
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 2.8)
      rg.addColorStop(0, `rgba(240,164,79,${0.22 * pd})`)
      rg.addColorStop(1, 'rgba(240,164,79,0)')
      ctx.fillStyle = rg; ctx.fillRect(0, 0, W, H)

      ctx.lineWidth = 1.2
      drawRainLayer(far, dt, false, w, dh, bob)     // depth: faint rain behind
      ctx.save(); ctx.translate(0, bob); drawUmbrella(w, dh, pd); ctx.restore()
      drawRainLayer(near, dt, true, w, dh, bob)      // bright rain in front (deflects off canopy)

      // splashes
      for (let i = splashes.length - 1; i >= 0; i--) {
        const q = splashes[i]; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 0.15 * dt; q.life -= 0.032 * dt
        if (q.life <= 0) { splashes.splice(i, 1); continue }
        ctx.fillStyle = `rgba(205,222,242,${Math.max(0, q.life) * 0.6})`
        ctx.beginPath(); ctx.arc(q.x, q.y, 1.5, 0, Math.PI * 2); ctx.fill()
      }

      // cinematic vignette (texture / depth)
      const vg = ctx.createRadialGradient(cx, H * 0.42, Math.min(W, H) * 0.2, cx, H * 0.42, Math.max(W, H) * 0.78)
      vg.addColorStop(0, 'rgba(6,9,14,0)'); vg.addColorStop(1, 'rgba(5,8,13,0.55)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)

      if (!reduce) raf = requestAnimationFrame(frame)
    }

    resize(); window.addEventListener('resize', resize)
    if (reduce) { start = performance.now() - 4000; last = start; frame(performance.now()) }
    else raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return (
    <section className="introhero">
      <canvas ref={ref} className="introcanvas" aria-hidden="true" />
      <div className="inner">
        <div className="ih-brand">☂ Umbrella</div>
        <h1>A place to say what you actually feel.</h1>
        <p>An anonymous community where young people share what they&apos;re going through — and show up for each other. No real names. No pile-ons. No judgment.</p>
        <div className="cta">
          <Link className="btn prim" href="/signup">Create an account</Link>
          <Link className="btn ghost light" href="/feed">Look around first</Link>
        </div>
      </div>
    </section>
  )
}

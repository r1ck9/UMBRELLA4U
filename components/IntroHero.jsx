'use client'
import { useEffect, useRef } from 'react'
import Link from 'next/link'

export default function IntroHero() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current, ctx = canvas.getContext('2d')
    const reduce = window.matchMedia('(prefers-reduced-motion:reduce)').matches
    let W, H, DPR, raf

    function resize() {
      DPR = Math.min(window.devicePixelRatio || 1, 2)
      W = canvas.clientWidth; H = canvas.clientHeight
      canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR)
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0)
    }

    // ---- build the umbrella in model space (apex up) ----
    const S = 18, h = 0.60, R = 1.5
    const apex = { x: 0, y: h, z: 0 }
    const ring1 = [], ring2 = []
    for (let i = 0; i <= S; i++) {
      const a = i / S * Math.PI * 2, c = Math.cos(a), s = Math.sin(a)
      ring1.push({ x: c * R * 0.66, y: h * 0.42, z: s * R * 0.66 })
      const dip = (i % 2 ? -0.06 : 0.0) * R
      ring2.push({ x: c * R, y: dip, z: s * R })
    }
    const panels = []
    for (let i = 0; i < S; i++) {
      panels.push({ vs: [apex, ring1[i], ring1[i + 1]] })
      panels.push({ vs: [ring1[i], ring2[i], ring2[i + 1], ring1[i + 1]] })
    }
    const ribs = []
    for (let i = 0; i <= S; i++) ribs.push([apex, ring1[i], ring2[i]])
    const poleBot = -h * 2.9
    const pole = [{ x: 0, y: h * 0.10, z: 0 }, { x: 0, y: poleBot, z: 0 }]
    const handle = [{ x: 0, y: poleBot, z: 0 }, { x: -0.16, y: poleBot + 0.07, z: 0 }, { x: -0.24, y: poleBot + 0.20, z: 0 }, { x: -0.19, y: poleBot + 0.30, z: 0 }]
    const finial = [{ x: 0, y: h, z: 0 }, { x: 0, y: h * 1.16, z: 0 }]
    const motes = []
    for (let i = 0; i < 30; i++) motes.push({ x: (Math.random() * 2 - 1) * 2.4, y: (Math.random() * 2 - 1) * 1.6, z: (Math.random() * 2 - 1) * 2.4, p: Math.random() * 6.28 })

    const sub = (a, b) => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z })
    const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x })
    const norm = (v) => { const m = Math.hypot(v.x, v.y, v.z) || 1; return { x: v.x / m, y: v.y / m, z: v.z / m } }
    const clamp01 = (x) => x < 0 ? 0 : x > 1 ? 1 : x
    const L = norm({ x: -0.5, y: 0.72, z: 0.5 })
    const tilt = -0.46, camZ = 4.3, fov = 3.5

    function shade(n, under) {
      const nl = clamp01(n.x * L.x + n.y * L.y + n.z * L.z)
      let lum = 0.17 + 0.83 * nl
      if (under) lum *= 0.5
      const rim = Math.pow(1 - Math.abs(n.z), 3)
      const r = 26 + (92 - 26) * lum + rim * 150
      const g = 29 + (98 - 29) * lum + rim * 90
      const b = 35 + (110 - 35) * lum + rim * 44
      return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')'
    }

    let angle = 0, last = null, tt = 0

    function render() {
      const cx = W / 2, cy = H * 0.36, scale = Math.min(W, H) * 0.24
      const ca = Math.cos(angle), sa = Math.sin(angle), ct = Math.cos(tilt), st = Math.sin(tilt)
      const bob = Math.sin(tt * 0.8) * 0.05

      const tf = (p) => {
        const y1 = p.y * ct - p.z * st, z1 = p.y * st + p.z * ct, x1 = p.x
        const x2 = x1 * ca + z1 * sa, z2 = -x1 * sa + z1 * ca
        return { x: x2, y: y1 + bob, z: z2 }
      }
      const pr = (P) => { const f = fov / (camZ - P.z); return { x: cx + P.x * f * scale, y: cy - P.y * f * scale, z: P.z } }

      ctx.clearRect(0, 0, W, H)
      // warm key glow
      const glow = ctx.createRadialGradient(cx, cy - 40, 20, cx, cy - 40, Math.min(W, H) * 0.75)
      glow.addColorStop(0, 'rgba(240,164,79,.12)'); glow.addColorStop(1, 'rgba(240,164,79,0)')
      ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H)
      // contact shadow
      const base = pr(tf({ x: 0, y: poleBot, z: 0 }))
      const sh = ctx.createRadialGradient(base.x, base.y + 40, 4, base.x, base.y + 40, scale * 1.1)
      sh.addColorStop(0, 'rgba(0,0,0,.5)'); sh.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(base.x, base.y + 44, scale * 0.9, scale * 0.22, 0, 0, 6.29); ctx.fill()
      // dust motes
      for (const mo of motes) { const P = pr(tf(mo)); if (P.z < 0.4) { const tw = 0.10 + 0.10 * Math.sin(tt + mo.p); ctx.fillStyle = 'rgba(220,210,195,' + tw + ')'; ctx.beginPath(); ctx.arc(P.x, P.y, 1.3, 0, 6.29); ctx.fill() } }

      const list = []
      for (const panel of panels) {
        const tv = panel.vs.map(tf)
        let n = norm(cross(sub(tv[1], tv[0]), sub(tv[2], tv[0])))
        const under = n.z < 0; if (under) n = { x: -n.x, y: -n.y, z: -n.z }
        let zc = 0; for (const v of tv) zc += v.z; zc /= tv.length
        list.push({ z: zc, kind: 'fill', pts: tv.map(pr), color: shade(n, under) })
      }
      for (const rb of ribs) { const tvp = rb.map(tf); list.push({ z: (tvp[0].z + tvp[1].z + tvp[2].z) / 3 - 0.01, kind: 'rib', pts: tvp.map(pr) }) }
      { const tp = pole.map(tf); list.push({ z: (tp[0].z + tp[1].z) / 2, kind: 'pole', pts: tp.map(pr) }) }
      { const tp = handle.map(tf); let zc = 0; tp.forEach((p) => zc += p.z); list.push({ z: zc / tp.length, kind: 'handle', pts: tp.map(pr) }) }
      { const tp = finial.map(tf); list.push({ z: (tp[0].z + tp[1].z) / 2, kind: 'finial', pts: tp.map(pr) }) }
      list.sort((a, b) => a.z - b.z)

      for (const it of list) {
        const p = it.pts
        if (it.kind === 'fill') {
          ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let k = 1; k < p.length; k++) ctx.lineTo(p[k].x, p[k].y); ctx.closePath()
          ctx.fillStyle = it.color; ctx.fill()
        } else if (it.kind === 'rib') {
          ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let k = 1; k < p.length; k++) ctx.lineTo(p[k].x, p[k].y)
          ctx.strokeStyle = 'rgba(8,9,12,.5)'; ctx.lineWidth = 1.1; ctx.lineJoin = 'round'; ctx.stroke()
        } else if (it.kind === 'pole' || it.kind === 'handle') {
          ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); for (let k = 1; k < p.length; k++) ctx.lineTo(p[k].x, p[k].y)
          ctx.strokeStyle = it.kind === 'pole' ? '#4a4f57' : '#5a5049'; ctx.lineWidth = Math.max(1.4, scale * 0.011); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke()
        } else if (it.kind === 'finial') {
          ctx.beginPath(); ctx.moveTo(p[0].x, p[0].y); ctx.lineTo(p[1].x, p[1].y)
          ctx.strokeStyle = '#c9a06a'; ctx.lineWidth = Math.max(1.4, scale * 0.011); ctx.lineCap = 'round'; ctx.stroke()
        }
      }
      // vignette for depth
      const vg = ctx.createRadialGradient(W / 2, H * 0.4, Math.min(W, H) * 0.35, W / 2, H * 0.4, Math.max(W, H) * 0.78)
      vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.4)')
      ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H)
    }

    function loop(ts) { if (last === null) last = ts; const dt = Math.min((ts - last) / 1000, 0.05); last = ts; tt += dt; angle += dt * 0.34; render(); raf = requestAnimationFrame(loop) }

    resize(); window.addEventListener('resize', resize)
    if (reduce) { angle = 0.6; render() } else raf = requestAnimationFrame(loop)
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
          <Link className="btn prim" href="/signup">Create or log in to an account</Link>
          <Link className="btn ghost light" href="/feed">Look around first</Link>
        </div>
      </div>
    </section>
  )
}

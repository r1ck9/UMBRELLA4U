'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

// Per-day Views / Posts / Umbrellas, drawn as a small multi-line chart.
// Colors are the validated categorical slots 1–3 (blue / aqua / yellow); a
// legend plus direct end-labels satisfy the light-mode low-contrast relief.
const SERIES = [
  { key: 'views', label: 'Views', color: 'var(--s-views)' },
  { key: 'stories', label: 'Posts', color: 'var(--s-posts)' },
  { key: 'umbrellas', label: 'Umbrellas', color: 'var(--s-umb)' }
]
const RANGES = [7, 30, 90]
const W = 720, H = 280, PAD = { t: 16, r: 66, b: 34, l: 40 }
const PLOT_L = PAD.l, PLOT_R = W - PAD.r, PLOT_T = PAD.t, PLOT_B = H - PAD.b

export default function ActivityChart() {
  const [ok, setOk] = useState(null)   // is this viewer a moderator?
  const [days, setDays] = useState(30)
  const [rows, setRows] = useState(null)
  const [err, setErr] = useState('')
  const [hover, setHover] = useState(null) // index under the cursor
  const wrapRef = useRef(null)

  useEffect(() => { getMe().then((m) => setOk(m.isModerator)) }, [])

  useEffect(() => {
    if (!ok || !supabase) return
    setRows(null); setErr('')
    supabase.rpc('activity_by_day', { days }).then(({ data, error }) => {
      if (error) { setErr(error.message); return }
      setRows(data || [])
    })
  }, [ok, days])

  const geom = useMemo(() => {
    if (!rows || !rows.length) return null
    const n = rows.length
    const max = Math.max(1, ...rows.flatMap((r) => SERIES.map((s) => Number(r[s.key]) || 0)))
    // "nice" top: round up to 1/2/5 × 10^k
    const pow = Math.pow(10, Math.floor(Math.log10(max)))
    const niceTop = [1, 2, 5, 10].map((m) => m * pow).find((v) => v >= max) || max
    const x = (i) => n === 1 ? (PLOT_L + PLOT_R) / 2 : PLOT_L + (i / (n - 1)) * (PLOT_R - PLOT_L)
    const y = (v) => PLOT_B - (v / niceTop) * (PLOT_B - PLOT_T)
    const lines = SERIES.map((s) => ({
      ...s,
      pts: rows.map((r, i) => [x(i), y(Number(r[s.key]) || 0)]),
      last: Number(rows[n - 1][s.key]) || 0
    }))
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ v: Math.round(niceTop * f), yy: y(niceTop * f) }))
    const step = Math.max(1, Math.ceil(n / 6))
    const xTicks = rows.map((r, i) => ({ i, day: r.day, xx: x(i) })).filter((_, i) => i % step === 0 || i === n - 1)
    return { n, x, y, lines, yTicks, xTicks }
  }, [rows])

  function onMove(e) {
    if (!geom || !wrapRef.current) return
    const rect = wrapRef.current.getBoundingClientRect()
    const frac = (e.clientX - rect.left) / rect.width
    const lf = PLOT_L / W, rf = PLOT_R / W
    const t = (frac - lf) / (rf - lf)
    setHover(Math.max(0, Math.min(geom.n - 1, Math.round(t * (geom.n - 1)))))
  }
  const fmt = (d) => { const [, m, day] = d.split('-'); return `${+m}/${+day}` }

  if (!ok) return null

  return (
    <section className="activity">
      <div className="activity-head">
        <h3>Activity per day</h3>
        <div className="range-toggle" role="group" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r} className={'range-btn' + (days === r ? ' on' : '')}
              onClick={() => setDays(r)} aria-pressed={days === r}>{r}d</button>
          ))}
        </div>
      </div>

      <div className="legend">
        {SERIES.map((s) => (
          <span className="legend-item" key={s.key}>
            <span className="legend-swatch" style={{ background: s.color }} />{s.label}
          </span>
        ))}
      </div>

      {err && <p className="activity-note">Couldn’t load activity: {err}</p>}
      {!err && !rows && <p className="activity-note">Loading…</p>}
      {!err && rows && geom && (
        <div className="chart-wrap" ref={wrapRef}
          onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="chart-svg" preserveAspectRatio="none" role="img"
            aria-label="Per-day views, posts and umbrellas">
            {/* y gridlines + labels */}
            {geom.yTicks.map((t, i) => (
              <g key={i}>
                <line x1={PLOT_L} x2={PLOT_R} y1={t.yy} y2={t.yy} className="grid" />
                <text x={PLOT_L - 8} y={t.yy + 4} className="axis-lbl" textAnchor="end">{t.v}</text>
              </g>
            ))}
            {/* x date ticks */}
            {geom.xTicks.map((t) => (
              <text key={t.i} x={t.xx} y={H - 12} className="axis-lbl" textAnchor="middle">{fmt(t.day)}</text>
            ))}
            {/* crosshair */}
            {hover != null && (
              <line x1={geom.x(hover)} x2={geom.x(hover)} y1={PLOT_T} y2={PLOT_B} className="crosshair" />
            )}
            {/* series lines + end labels + hover dots */}
            {geom.lines.map((ln) => (
              <g key={ln.key}>
                <polyline points={ln.pts.map((p) => p.join(',')).join(' ')} fill="none"
                  stroke={ln.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                <circle cx={ln.pts[ln.pts.length - 1][0]} cy={ln.pts[ln.pts.length - 1][1]} r="3" fill={ln.color} />
                <text x={ln.pts[ln.pts.length - 1][0] + 6} y={ln.pts[ln.pts.length - 1][1] + 4}
                  className="end-lbl" style={{ fill: ln.color }}>{ln.last}</text>
                {hover != null && (
                  <circle cx={ln.pts[hover][0]} cy={ln.pts[hover][1]} r="3.5" fill={ln.color}
                    stroke="var(--panel)" strokeWidth="1.5" />
                )}
              </g>
            ))}
          </svg>
          {hover != null && (
            <div className="chart-tip" style={{ left: `${(geom.x(hover) / W) * 100}%` }}>
              <div className="tip-date">{fmt(rows[hover].day)}</div>
              {SERIES.map((s) => (
                <div className="tip-row" key={s.key}>
                  <span className="tip-dot" style={{ background: s.color }} />
                  <span className="tip-lbl">{s.label}</span>
                  <span className="tip-val">{Number(rows[hover][s.key]) || 0}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

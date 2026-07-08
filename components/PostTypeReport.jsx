'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

// Fixed color per intent (categorical slots 1–4) — color follows the entity,
// never its rank, so sorting bars by count doesn't repaint them. Every bar also
// carries a text label + count, which is the relief for the low-contrast slots.
const INTENTS = [
  { key: 'similar', label: '💬 Similar stories', color: 'var(--pt-1)' },
  { key: 'listen', label: '🫂 Just listen', color: 'var(--pt-2)' },
  { key: 'advice', label: '☂ Give advice', color: 'var(--pt-3)' },
  { key: 'resources', label: '📎 Resources', color: 'var(--pt-4)' }
]

export default function PostTypeReport() {
  const [ok, setOk] = useState(null)
  const [rows, setRows] = useState(null)
  const [days, setDays] = useState(1)
  const [err, setErr] = useState('')

  useEffect(() => { getMe().then((m) => setOk(m.isModerator)) }, [])

  useEffect(() => {
    if (!ok || !supabase) return
    supabase.rpc('posts_by_intent').then(({ data, error }) => {
      if (error) { setErr(error.message); return }
      const byKey = Object.fromEntries((data || []).map((r) => [r.intent, r]))
      if (data && data.length) setDays(data[0].days || 1)
      const merged = INTENTS.map((it) => ({
        ...it,
        total: Number(byKey[it.key]?.total ?? 0),
        avg: Number(byKey[it.key]?.avg_per_day ?? 0)
      })).sort((a, b) => b.total - a.total)
      setRows(merged)
    })
  }, [ok])

  if (!ok) return null

  const max = rows ? Math.max(1, ...rows.map((r) => r.total)) : 1
  const grand = rows ? rows.reduce((n, r) => n + r.total, 0) : 0

  return (
    <section className="ptr">
      <div className="ptr-head">
        <h3>Posts by type</h3>
        {rows && <span className="ptr-cap">{grand.toLocaleString()} posts · {days} day{days === 1 ? '' : 's'} since first post</span>}
      </div>
      {err && <p className="activity-note">Couldn’t load: {err}</p>}
      {!err && !rows && <p className="activity-note">Loading…</p>}
      {!err && rows && (
        <div className="ptr-rows">
          {rows.map((r) => (
            <div className="ptr-row" key={r.key}>
              <div className="ptr-label">{r.label}</div>
              <div className="ptr-track">
                <div className="ptr-fill" style={{ width: `${(r.total / max) * 100}%`, background: r.color }} />
              </div>
              <div className="ptr-val">{r.total.toLocaleString()}<span className="ptr-avg"> · {r.avg}/day</span></div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

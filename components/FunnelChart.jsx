'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import CountUpNumber from '@/components/CountUpNumber'

// The signup → first-post funnel. Shows where people drop off.
const STEPS = [
  { key: 'visit', label: 'Visited' },
  { key: 'stayed_30s', label: 'Stayed 30s+' },
  { key: 'click_signup', label: 'Clicked Sign Up' },
  { key: 'registered', label: 'Finished registration' },
  { key: 'click_create', label: 'Clicked Create Story' },
  { key: 'compose_start', label: 'Started typing' },
  { key: 'posted', label: 'Posted a story' }
]

export default function FunnelChart() {
  const [ok, setOk] = useState(null)
  const [counts, setCounts] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => { getMe().then((m) => setOk(m.isModerator)) }, [])
  useEffect(() => {
    if (!ok || !supabase) return
    supabase.rpc('funnel_counts').then(({ data, error }) => {
      if (error) { setErr(error.message); return }
      setCounts(Object.fromEntries((data || []).map((r) => [r.event, Number(r.visitors)])))
    })
  }, [ok])

  if (!ok) return null

  const rows = counts && STEPS.map((s) => ({ ...s, n: counts[s.key] || 0 }))
  const top = rows ? Math.max(1, rows[0].n) : 1
  // biggest single drop-off between consecutive steps
  let worst = -1, worstDrop = -1
  if (rows) rows.forEach((r, i) => {
    if (i === 0) return
    const drop = rows[i - 1].n - r.n
    if (drop > worstDrop) { worstDrop = drop; worst = i }
  })
  const abandoned = counts ? Math.max(0, (counts.compose_start || 0) - (counts.posted || 0)) : 0

  return (
    <section className="funnel">
      <div className="funnel-head">
        <h3>Where people drop off</h3>
        <span className="funnel-cap">signup → first post · distinct visitors</span>
      </div>
      {err && <p className="activity-note">Couldn’t load: {err}. Run funnel.sql, and note data collects going forward.</p>}
      {!err && !rows && <p className="activity-note">Loading…</p>}
      {!err && rows && (
        <div className="funnel-rows">
          {rows.map((r, i) => {
            const pctTop = Math.round((r.n / top) * 100)
            const conv = i === 0 ? 100 : (rows[i - 1].n ? Math.round((r.n / rows[i - 1].n) * 100) : 0)
            return (
              <div className={'funnel-row' + (i === worst && worstDrop > 0 ? ' worst' : '')} key={r.key}>
                <div className="fn-label">{r.label}</div>
                <div className="fn-track"><div className="fn-fill" style={{ width: `${pctTop}%` }} /></div>
                <div className="fn-val"><CountUpNumber value={r.n} />
                  {i > 0 && <span className="fn-conv"><CountUpNumber value={conv} />%{i === worst && worstDrop > 0 ? ' · biggest drop' : ''}</span>}
                </div>
              </div>
            )
          })}
          <p className="funnel-note">Started typing but never posted: <b><CountUpNumber value={abandoned} /></b></p>
        </div>
      )}
    </section>
  )
}

'use client'

import { useEffect, useState, Fragment } from 'react'
import { supabase } from '@/lib/supabase'

function excerpt(t = '') { return t.length > 88 ? t.slice(0, 88) + '...' : t }
const statusColor = { complete: 'var(--ink-1)', 'on track': 'var(--shelter)', behind: 'var(--ink-2)' }

function nextLabel(secs) {
  if (secs == null) return 'done'
  const n = Number(secs)
  if (n <= 0) return 'due now'
  const m = Math.round(n / 60)
  if (m < 60) return '~' + m + 'm'
  const h = Math.floor(m / 60)
  return '~' + h + 'h ' + (m % 60) + 'm'
}

function Sparkline({ data, range }) {
  const counts = (data || []).map((h) => Number(h.n) || 0)
  const max = Math.max(1, ...counts)
  const total = counts.reduce((a, b) => a + b, 0)
  const unit = range === 'week' ? 'day' : 'hour'
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: range === 'week' ? 6 : 2, height: 46 }}>
        {counts.map((c, i) => (
          <div key={i} title={`${c} in that ${unit}`}
            style={{ flex: 1, height: Math.max(2, (c / max) * 46), borderRadius: 2,
              background: i === counts.length - 1 ? 'var(--ink-1)' : 'var(--shelter)', opacity: c ? 1 : 0.35 }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '.7rem', color: 'var(--ink-3)' }}>
        <span>{range === 'week' ? '7d ago' : '24h ago'}</span>
        <span>{total} total</span>
        <span>now</span>
      </div>
    </div>
  )
}

const EMPTY = { allowed: false, summary: [], posts: [], hourly: [] }

async function authHeaders() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

async function fetchData(range) {
  const headers = await authHeaders()
  if (!headers) return EMPTY
  const res = await fetch(`/api/moderation/support?range=${encodeURIComponent(range)}`, { headers })
  if (!res.ok) return EMPTY
  const data = await res.json()
  return { allowed: true, summary: data.summary || [], posts: data.posts || [], hourly: data.hourly || [] }
}

export default function SupportReport() {
  const [s, setS] = useState({ loading: true, ...EMPTY })
  const [range, setRange] = useState('day')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (!supabase) { setS({ loading: false, ...EMPTY }); return }
    let alive = true
    const run = async () => { const d = await fetchData(range); if (alive) setS({ loading: false, ...d }) }
    run()
    const id = setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') run()
    }, 45000)
    return () => { alive = false; clearInterval(id) }
  }, [range])

  async function refresh() {
    setRefreshing(true)
    const d = await fetchData(range)
    setS((prev) => ({ ...prev, loading: false, ...d }))
    setRefreshing(false)
  }

  if (s.loading) return <p className="empty">Loading...</p>
  if (!s.allowed) return null

  const tab = (val, label) => (
    <button onClick={() => setRange(val)} style={{
      font: 'inherit', fontSize: '.78rem', fontWeight: 600, cursor: 'pointer', borderRadius: 999, padding: '4px 11px',
      border: '1px solid ' + (range === val ? 'var(--shelter)' : 'var(--line)'),
      background: range === val ? 'var(--shelter)' : 'transparent',
      color: range === val ? 'var(--on-accent)' : 'var(--ink-2)' }}>{label}</button>
  )

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', background: 'var(--card)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: '.72rem', fontWeight: 700, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
          Assisted umbrellas
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {tab('day', '24h')}
          {tab('week', '7d')}
          <button onClick={refresh} disabled={refreshing}
            style={{ font: 'inherit', fontSize: '.8rem', fontWeight: 600, cursor: 'pointer',
              border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink)',
              borderRadius: 999, padding: '4px 12px', opacity: refreshing ? 0.6 : 1 }}>
            {refreshing ? '...' : 'refresh'}
          </button>
        </div>
      </div>

      <Sparkline data={s.hourly} range={range} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, columnGap: 16, fontSize: '.92rem', marginTop: 16 }}>
        {s.summary.map((r, i) => {
          const isHead = /^, /.test(r.metric)
          return isHead ? (
            <div key={i} style={{ gridColumn: '1 / -1', marginTop: i ? 10 : 0, fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3)' }}>
              {r.metric.replace(/, /g, '').trim()}
            </div>
          ) : (
            <Fragment key={i}>
              <div style={{ color: 'var(--ink-2)' }}>{r.metric}</div>
              <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, textAlign: 'right' }}>{r.value}</div>
            </Fragment>
          )
        })}
      </div>

      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-3)', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              <th style={{ padding: '6px 8px' }}>Post</th>
              <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Assisted</th>
              <th style={{ padding: '6px 8px', width: 120 }}>Fill</th>
              <th style={{ padding: '6px 8px' }}>Real</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
              <th style={{ padding: '6px 8px' }}>Next</th>
            </tr>
          </thead>
          <tbody>
            {s.posts.map((p, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-2)' }}>
                <td style={{ padding: '8px' }}>
                  {excerpt(p.excerpt)}
                  <span style={{ color: 'var(--ink-3)' }}> · {p.category}{p.anonymous ? ' · anon' : ''}</span>
                </td>
                <td style={{ padding: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {p.assisted} / {p.target}
                </td>
                <td style={{ padding: '8px' }}>
                  <div style={{ background: 'var(--line-2)', borderRadius: 999, height: 7, overflow: 'hidden' }}>
                    <div style={{ width: Math.min(100, p.pct) + '%', height: '100%', background: statusColor[p.status] || 'var(--shelter)' }} />
                  </div>
                </td>
                <td style={{ padding: '8px', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3)' }}>{p.real}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: statusColor[p.status] || 'var(--shelter)' }}>{p.status}</span>
                </td>
                <td style={{ padding: '8px', whiteSpace: 'nowrap', color: 'var(--ink-3)', fontVariantNumeric: 'tabular-nums' }}>{nextLabel(p.nextSecs)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.posts.length === 0 && <p className="empty">No posts are being supported yet.</p>}
      </div>
    </div>
  )
}

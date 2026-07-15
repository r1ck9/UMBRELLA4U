'use client'
import { useEffect, useState, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

function excerpt(t = '') { return t.length > 88 ? t.slice(0, 88) + '…' : t }
const statusColor = { complete: '#2e9e6b', 'on track': '#3f6fa3', behind: '#d98329' }

export default function BotReport() {
  const [s, setS] = useState({ loading: true, isMod: false, summary: [], posts: [] })

  useEffect(() => {
    (async () => {
      if (!supabase) { setS({ loading: false, isMod: false, summary: [], posts: [] }); return }
      const me = await getMe()
      if (!me.isModerator) { setS({ loading: false, isMod: false, summary: [], posts: [] }); return }
      const [{ data: summary }, { data: posts }] = await Promise.all([
        supabase.rpc('bot_status'),
        supabase.rpc('bot_report_posts', { n: 30 }),
      ])
      setS({ loading: false, isMod: true, summary: summary || [], posts: posts || [] })
    })()
  }, [])

  if (s.loading) return <p className="empty">Loading…</p>
  if (!s.isMod) return null

  return (
    <div style={{ border: '1px solid var(--line,#ddd)', borderRadius: 14, padding: '16px 18px', background: 'var(--card,transparent)' }}>
      {/* summary: metric / value rows; section headers start with — */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 4, columnGap: 16, fontSize: '.92rem' }}>
        {s.summary.map((r, i) => {
          const isHead = /^—/.test(r.metric)
          return isHead ? (
            <div key={i} style={{ gridColumn: '1 / -1', marginTop: i ? 10 : 0, fontSize: '.72rem', fontWeight: 700,
              letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--ink-3,#777)' }}>
              {r.metric.replace(/—/g, '').trim()}
            </div>
          ) : (
            <Fragment key={i}>
              <div style={{ color: 'var(--ink-2,#555)' }}>{r.metric}</div>
              <div style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, textAlign: 'right' }}>{r.value}</div>
            </Fragment>
          )
        })}
      </div>

      {/* per-post fake-like breakdown */}
      <div style={{ marginTop: 16, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.88rem' }}>
          <thead>
            <tr style={{ textAlign: 'left', color: 'var(--ink-3,#888)', fontSize: '.72rem', textTransform: 'uppercase', letterSpacing: '.08em' }}>
              <th style={{ padding: '6px 8px' }}>Post</th>
              <th style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>Bot likes</th>
              <th style={{ padding: '6px 8px', width: 120 }}>Fill</th>
              <th style={{ padding: '6px 8px' }}>Real</th>
              <th style={{ padding: '6px 8px' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {s.posts.map((p, i) => (
              <tr key={i} style={{ borderTop: '1px solid var(--line-2,#eee)' }}>
                <td style={{ padding: '8px' }}>
                  {excerpt(p.post_excerpt)}
                  <span style={{ color: 'var(--ink-3,#999)' }}> · {p.cat}{p.is_anon ? ' · anon' : ''}</span>
                </td>
                <td style={{ padding: '8px', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                  {p.bot_likes} / {p.target_n}
                </td>
                <td style={{ padding: '8px' }}>
                  <div style={{ background: 'var(--line-2,#eee)', borderRadius: 999, height: 7, overflow: 'hidden' }}>
                    <div style={{ width: Math.min(100, p.pct) + '%', height: '100%', background: statusColor[p.drip_status] || '#3f6fa3' }} />
                  </div>
                </td>
                <td style={{ padding: '8px', fontVariantNumeric: 'tabular-nums', color: 'var(--ink-3,#888)' }}>{p.real_likes}</td>
                <td style={{ padding: '8px' }}>
                  <span style={{ fontSize: '.72rem', fontWeight: 700, color: statusColor[p.drip_status] || '#3f6fa3' }}>{p.drip_status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {s.posts.length === 0 && <p className="empty">No real posts are being boosted yet.</p>}
      </div>
    </div>
  )
}

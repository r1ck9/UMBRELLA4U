'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

// Moderator-only overview: totals, plus per-user averages and the activation gap.
export default function StatsPanel() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const me = await getMe()
      if (!me.isModerator) return
      const users = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      const stories = await supabase.from('stories').select('*', { count: 'exact', head: true }).eq('state', 'live')
      const umbs = await supabase.from('umbrellas').select('*', { count: 'exact', head: true })
      const v = await supabase.from('site_metrics').select('value').eq('key', 'views').maybeSingle()
      const eng = await supabase.rpc('engagement_stats')
      const e = eng.data?.[0] || null
      setStats({
        users: users.count ?? 0,
        stories: stories.count ?? 0,
        umbs: umbs.count ?? 0,
        views: v.data?.value ?? 0,
        eng
      })
    })()
  }, [])

  if (!stats) return null
  const totals = [
    { n: stats.views, l: 'Page views' },
    { n: stats.users, l: 'Registrations' },
    { n: stats.stories, l: 'Stories' },
    { n: stats.umbs, l: 'Umbrellas opened' }
  ]

  // per-user averages + activation gap, from the moderator-gated RPC
  const e = stats.eng
  const avg = (x) => (e && e.users ? Math.round((Number(x) / e.users) * 10) / 10 : 0)
  const pct = (x) => (e && e.users ? Math.round((Number(x) / e.users) * 100) : 0)
  const engCards = e && [
    { n: avg(e.stories), l: 'Avg posts / user' },
    { n: avg(e.umbrellas), l: 'Avg umbrellas / user' },
    { n: avg(e.replies), l: 'Avg replies / user' },
    { n: Number(e.never_posted), l: `Signed up, never posted (${pct(e.never_posted)}%)` }
  ]

  return (
    <>
      <div className="stats-grid">
        {totals.map((c) => (
          <div className="stat-card" key={c.l}>
            <div className="stat-n">{c.n.toLocaleString()}</div>
            <div className="stat-l">{c.l}</div>
          </div>
        ))}
      </div>
      {engCards && (
        <>
          <h4 className="stats-sub">Averages &amp; activation</h4>
          <div className="stats-grid">
            {engCards.map((c) => (
              <div className="stat-card" key={c.l}>
                <div className="stat-n">{c.n.toLocaleString()}</div>
                <div className="stat-l">{c.l}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}

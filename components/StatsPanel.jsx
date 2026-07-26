'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import { WEEKLY_PROMPT } from '@/lib/prompt'

// Moderator-only overview: totals, plus per-user averages and the activation gap.
export default function StatsPanel() {
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const me = await getMe()
      if (!me.isModerator) return
      const users = await supabase.from('profiles').select('id', { count: 'exact', head: true })
      const stories = await supabase.from('stories').select('*', { count: 'exact', head: true }).eq('state', 'live')
      const v = await supabase.from('site_metrics').select('value').eq('key', 'views').maybeSingle()
      const pa = await supabase.from('stories')
        .select('*', { count: 'exact', head: true }).eq('prompt_id', WEEKLY_PROMPT.key)
      const eng = await supabase.rpc('engagement_stats')
      const e = eng.data?.[0] || null
      const ret = await supabase.rpc('retention_stats')
      const r = ret.data?.[0] || null
      setStats({
        users: users.count ?? 0,
        stories: stories.count ?? 0,
        umbs: Number(e?.umbrellas ?? 0),   // from the definer RPC; umbrella rows are private
        views: v.data?.value ?? 0,
        promptAnswers: pa.count ?? 0,
        eng: e,
        ret: r
      })
    })()
  }, [])

  if (!stats) return null
  const totals = [
    { n: stats.views, l: 'Page views' },
    { n: stats.users, l: 'Registrations' },
    { n: stats.stories, l: 'Stories' },
    { n: stats.umbs, l: 'Umbrellas opened' },
    { n: stats.promptAnswers, l: 'Prompt answers (this week)' }
  ]

  // per-user averages + activation gap (computed in SQL by the RPC)
  const e = stats.eng
  const engCards = e && [
    { n: Number(e.avg_posts) || 0, l: 'Avg posts / user' },
    { n: Number(e.avg_umbrellas) || 0, l: 'Avg umbrellas / user' },
    { n: Number(e.avg_replies) || 0, l: 'Avg replies / user' },
    { n: Number(e.never_posted) || 0, l: `Signed up, never posted (${Number(e.never_pct) || 0}%)` }
  ]

  // day-after retention: how many came back the day after registering
  const r = stats.ret
  const retRate = r && Number(r.cohort) ? Math.round((Number(r.retained) / Number(r.cohort)) * 100) : 0
  const retCards = r && [
    { n: Number(r.active_today), l: 'Active users today' },
    { n: Number(r.retained), l: `Came back next day (${retRate}%)` }
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
      {retCards && (
        <>
          <h4 className="stats-sub">Active users &amp; retention</h4>
          <div className="stats-grid">
            {retCards.map((c) => (
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

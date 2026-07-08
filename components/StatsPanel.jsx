'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

// Moderator-only overview: registrations, views, stories, umbrellas.
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
      const m = await supabase.from('site_metrics').select('key,value').in('key', ['views', 'views_member'])
      const metric = Object.fromEntries((m.data ?? []).map((r) => [r.key, r.value]))
      const views = metric.views ?? 0
      const memberViews = metric.views_member ?? 0
      setStats({
        users: users.count ?? 0,
        stories: stories.count ?? 0,
        umbs: umbs.count ?? 0,
        views,
        memberViews,
        guestViews: Math.max(0, views - memberViews)
      })
    })()
  }, [])

  if (!stats) return null
  const cards = [
    { n: stats.views, l: 'Page views (all)' },
    { n: stats.guestViews, l: 'Views — guests' },
    { n: stats.memberViews, l: 'Views — members' },
    { n: stats.users, l: 'Registrations' },
    { n: stats.stories, l: 'Stories' },
    { n: stats.umbs, l: 'Umbrellas opened' }
  ]
  return (
    <div className="stats-grid">
      {cards.map((c) => (
        <div className="stat-card" key={c.l}>
          <div className="stat-n">{c.n.toLocaleString()}</div>
          <div className="stat-l">{c.l}</div>
        </div>
      ))}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// A live banner that makes the community feel alive. Uses cumulative totals
// (which only grow, never an awkward zero) and ticks up in real time as
// umbrellas open. "Today" only shows once there's something to show.
export default function CommunityPulse() {
  const [s, setS] = useState(null)
  const [pulse, setPulse] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let ch
    supabase.rpc('community_pulse').then(({ data }) => { if (data && data[0]) setS(data[0]) })
    ch = supabase.channel('community-pulse')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'umbrellas' }, () => {
        setS((p) => p ? { ...p, umbrellas: Number(p.umbrellas) + 1, umbrellas_today: Number(p.umbrellas_today) + 1 } : p)
        setPulse(true); setTimeout(() => setPulse(false), 900)
      })
      .subscribe()
    return () => { if (ch) supabase.removeChannel(ch) }
  }, [])

  if (!s) return null
  const items = [
    { ic: '☂', n: Number(s.umbrellas), l: 'umbrellas opened' },
    { ic: '💬', n: Number(s.stories), l: 'stories shared' },
    { ic: '🫂', n: Number(s.members), l: 'sheltering together' }
  ]
  const today = Number(s.umbrellas_today)

  return (
    <div className={'pulse' + (pulse ? ' beat' : '')}>
      {items.map((it) => (
        <div className="pulse-item" key={it.l}>
          <span className="pulse-ic" aria-hidden="true">{it.ic}</span>
          <b className="pulse-n">{it.n.toLocaleString()}</b>
          <span className="pulse-l">{it.l}</span>
        </div>
      ))}
      {today > 0 && <span className="pulse-today">🌧 {today.toLocaleString()} opened today</span>}
    </div>
  )
}

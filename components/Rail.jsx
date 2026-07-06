'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { DAILY_UMBRELLA_LIMIT } from '@/lib/config'
import { WEEKLY_PROMPT } from '@/lib/prompt'

export default function Rail() {
  const [stats, setStats] = useState({ stories: null, umbrellas: null })
  const [left, setLeft] = useState(null) // umbrellas left today; null = guest / unknown

  useEffect(() => {
    if (!supabase) return
    ;(async () => {
      const s = await supabase.from('stories').select('*', { count: 'exact', head: true }).eq('state', 'live')
      const u = await supabase.from('umbrellas').select('*', { count: 'exact', head: true })
      setStats({ stories: s.count ?? 0, umbrellas: u.count ?? 0 })

      const { data } = await supabase.auth.getUser()
      if (data.user) {
        const start = new Date(); start.setHours(0, 0, 0, 0)
        const t = await supabase.from('umbrellas')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', data.user.id).gte('created_at', start.toISOString())
        setLeft(Math.max(0, DAILY_UMBRELLA_LIMIT - (t.count ?? 0)))
      }
    })()
  }, [])

  return (
    <aside className="rail">
      <div className="panel">
        <h3>The community</h3>
        <div className="bigcount">
          <div className="n">{stats.umbrellas ?? '—'}</div>
          <div className="l">☂ umbrellas opened</div>
        </div>
        <div className="ministat"><b>{stats.stories ?? '—'}</b> stories shared</div>
      </div>

      <div className="panel quota">
        <h3>Your umbrellas today</h3>
        {left === null
          ? <p className="qmsg"><Link href="/login">Log in</Link> to open umbrellas.</p>
          : <p className="qbig"><b>{left}</b> of {DAILY_UMBRELLA_LIMIT} left</p>}
        <p className="qhint">You get {DAILY_UMBRELLA_LIMIT} a day — so each umbrella you open really means something.</p>
      </div>

      <div className="panel prompt">
        <h3>This week</h3>
        <p className="q">{WEEKLY_PROMPT.text}</p>
        <button className="btn ghost sm prompt-answer"
          onClick={() => window.dispatchEvent(new CustomEvent('umbrella:answer-prompt', { detail: WEEKLY_PROMPT }))}>
          ☂ Answer this
        </button>
      </div>

      <div className="panel">
        <h3>Need help now?</h3>
        <Link className="crisis" href="/resources">Resource hub &amp; crisis lines →</Link>
        <p className="safe">Peer support — not a substitute for professional counselling or crisis services.</p>
      </div>
    </aside>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import ReportsList from '@/components/ReportsList'
import ReplyQueue from '@/components/ReplyQueue'
import BotReport from '@/components/BotReport'
import StatsPanel from '@/components/StatsPanel'
import ActivityChart from '@/components/ActivityChart'
import PostTypeReport from '@/components/PostTypeReport'
import FunnelChart from '@/components/FunnelChart'

export default function ModerationGate() {
  const [state, setState] = useState({ loading: true, allowed: false })

  useEffect(() => {
    let alive = true

    ;(async () => {
      if (!supabase) {
        if (alive) setState({ loading: false, allowed: false })
        return
      }

      try {
        const me = await getMe()
        if (alive) setState({ loading: false, allowed: !!me.isModerator })
      } catch {
        if (alive) setState({ loading: false, allowed: false })
      }
    })()

    return () => { alive = false }
  }, [])

  if (state.loading) return <p className="empty">Checking access...</p>
  if (!state.allowed) return <p className="empty">This page is for moderators only.</p>

  return (
    <>
      <h2 className="feedhead">Moderation</h2>
      <StatsPanel />
      <ActivityChart />
      <FunnelChart />
      <PostTypeReport />
      <p className="sub" style={{ color: 'var(--ink-3)', margin: '18px 0 4px' }}>
        Bot activity, how the seeded accounts are boosting real posts toward ~50 umbrellas over 24h.
      </p>
      <BotReport />
      <p className="sub" style={{ color: 'var(--ink-3)', margin: '18px 0 4px' }}>
        New posts waiting for a reply. Type a note, it&apos;s posted as a member and lands in their inbox.
      </p>
      <ReplyQueue />
      <p className="sub" style={{ color: 'var(--ink-3)', margin: '18px 0 4px' }}>
        Posts people flagged for review. Take them down or dismiss.
      </p>
      <ReportsList />
    </>
  )
}

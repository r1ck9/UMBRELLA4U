'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

const ModerationDashboard = dynamic(() => import('@/components/ModerationDashboard'), {
  ssr: false,
  loading: () => <p className="empty">Loading dashboard...</p>,
})

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

  return <ModerationDashboard />
}

'use client'

import ReportsList from '@/components/ReportsList'
import ReplyQueue from '@/components/ReplyQueue'
import SupportReport from '@/components/SupportReport'
import StatsPanel from '@/components/StatsPanel'
import ActivityChart from '@/components/ActivityChart'
import PostTypeReport from '@/components/PostTypeReport'
import FunnelChart from '@/components/FunnelChart'

export default function ModerationDashboard() {
  return (
    <>
      <h2 className="feedhead">Moderation</h2>
      <StatsPanel />
      <ActivityChart />
      <FunnelChart />
      <PostTypeReport />
      <p className="sub" style={{ color: 'var(--ink-3)', margin: '18px 0 4px' }}>
        Support activity and post reach health for the moderation team.
      </p>
      <SupportReport />
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

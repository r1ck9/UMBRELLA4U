import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import ReportsList from '@/components/ReportsList'
import StatsPanel from '@/components/StatsPanel'
import ActivityChart from '@/components/ActivityChart'
import PostTypeReport from '@/components/PostTypeReport'

export default function Moderation() {
  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="moderation" />
        <main className="feed">
          <h2 className="feedhead">Moderation</h2>
          <StatsPanel />
          <ActivityChart />
          <PostTypeReport />
          <p className="sub" style={{ color: 'var(--ink-3)', margin: '18px 0 4px' }}>
            Posts people flagged for review. Take them down or dismiss.
          </p>
          <ReportsList />
        </main>
        <Rail />
      </div>
    </>
  )
}

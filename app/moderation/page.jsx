import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import ReportsList from '@/components/ReportsList'

export default function Moderation() {
  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="moderation" />
        <main className="feed">
          <h2 className="feedhead">Reports</h2>
          <p className="sub" style={{ color: 'var(--ink-3)', margin: '0 0 4px' }}>
            Posts people flagged for review. Take them down or dismiss.
          </p>
          <ReportsList />
        </main>
        <Rail />
      </div>
    </>
  )
}

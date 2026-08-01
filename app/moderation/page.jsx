import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import ModerationGate from '@/components/ModerationGate'

export default function Moderation() {
  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="moderation" />
        <main className="feed">
          <ModerationGate />
        </main>
        <Rail />
      </div>
    </>
  )
}

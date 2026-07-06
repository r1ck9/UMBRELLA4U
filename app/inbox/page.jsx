import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import InboxList from '@/components/InboxList'

export default function Inbox() {
  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="inbox" />
        <main className="feed">
          <h2 className="feedhead">Your inbox</h2>
          <p className="sub" style={{ color: 'var(--ink-3)', margin: '0 0 4px' }}>
            The umbrellas and words your stories received.
          </p>
          <InboxList />
        </main>
        <Rail />
      </div>
    </>
  )
}

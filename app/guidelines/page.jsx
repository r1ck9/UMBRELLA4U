import TopBar from '@/components/TopBar'
import { GUIDELINES } from '@/lib/guidelines'

export default function Guidelines() {
  return (
    <>
      <TopBar />
      <main className="container">
        <h1>Community guidelines</h1>
        <p className="sub" style={{ color: 'var(--ink-2)' }}>This place only works because the people in it keep it that way.</p>
        <ol className="rulelist">
          {GUIDELINES.map((r, i) => <li key={i}>{r.t}</li>)}
        </ol>
      </main>
    </>
  )
}

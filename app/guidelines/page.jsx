import TopBar from '@/components/TopBar'

export default function Guidelines() {
  return (
    <>
      <TopBar />
      <main className="container">
        <h1>Community guidelines</h1>
        <p className="sub" style={{ color: 'var(--ink-2)' }}>Umbrella only works because people keep it safe.</p>
        <ul className="rulelist">
          <li>🫂 Respect every identity, you&apos;ll meet people unlike you.</li>
          <li>💬 Criticize ideas, never people.</li>
          <li>🚫 No hate speech, personal attacks, or discrimination.</li>
          <li>🔒 No doxxing, never reveal anyone&apos;s real identity, including your own if it puts you at risk.</li>
          <li>☂ When someone shares their rain, respond how they asked to be met.</li>
        </ul>
      </main>
    </>
  )
}

import TopBar from '@/components/TopBar'

// Resource hub is readable by everyone (including guests).
// A curated few, crisis lines first, then trusted youth mental-health orgs.
export default function Resources() {
  return (
    <>
      <TopBar />
      <main className="container">
        <h1>Resource hub</h1>
        <p className="sub" style={{ color: 'var(--ink-2)' }}>
          Haven is peer support. These are the people who can actually help.
        </p>
        <div className="reslist">
          <a href="tel:988">☎ 988, Suicide Crisis Helpline<small>Call or text, anytime (Canada &amp; US)</small></a>
          <a href="sms:686868">💬 Kids Help Phone<small>Text CONNECT to 686868 · 1-800-668-6868 · confidential</small></a>
          <a href="https://jack.org" target="_blank" rel="noopener">Jack.org<small>Canadian youth mental health, education, peer leadership &amp; support</small></a>
          <a href="https://teenmentalhealth.org" target="_blank" rel="noopener">Teen Mental Health<small>Plain-language info on common conditions &amp; coping strategies</small></a>
          <a href="https://www.youngminds.org.uk" target="_blank" rel="noopener">YoungMinds<small>Guides on anxiety, depression, stress, school &amp; more</small></a>
          <a href="#">Your school counsellor<small>Ask the front office how to book some time</small></a>
        </div>
      </main>
    </>
  )
}

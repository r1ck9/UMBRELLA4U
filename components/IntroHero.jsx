import Link from 'next/link'
import InvisibleShelter from '@/components/InvisibleShelter'

export default function IntroHero() {
  return (
    <section className="introhero">
      <InvisibleShelter />
      <div className="inner">
        <div className="ih-brand">☂ Haven</div>
        <h1>A place to say what you actually feel.</h1>
        <p>An anonymous community where young people share what they&apos;re going through, and show up for each other. No real names. No pile-ons. No judgment.</p>
        <div className="cta">
          <Link className="btn prim" href="/signup">Create or log in to an account</Link>
          <Link className="btn ghost light" href="/feed">Look around first</Link>
        </div>
      </div>
      <div className="scroll-cue" aria-hidden="true"><span>Scroll</span><i>⌄</i></div>
    </section>
  )
}

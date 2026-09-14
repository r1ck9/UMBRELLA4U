import Link from 'next/link'
import InvisibleShelter from '@/components/InvisibleShelter'

export default function IntroHero() {
  return (
    <section className="introhero">
      <InvisibleShelter />
      <div className="inner">
        <div className="ih-brand">☂ Haven</div>
        <h1>Say the thing you’ve been sitting on.</h1>
        <p>An anonymous place for young people to post what’s actually going on. Nobody can reply, so nobody can pile on, and the only thing anyone can do is open an umbrella for you.</p>
        <div className="cta">
          <Link className="btn prim" href="/signup">Make an account</Link>
          <Link className="btn ghost light" href="/feed">Look around first</Link>
        </div>
      </div>
      <div className="scroll-cue" aria-hidden="true"><span>Scroll</span><i>⌄</i></div>
    </section>
  )
}

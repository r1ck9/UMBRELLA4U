import Link from 'next/link'
import IntroHero from '@/components/IntroHero'

const POINTS = [
  {
    t: 'Anonymous by default',
    d: 'You never need a real name. Your email logs you in and resets your password, and that’s all it does. A post can also be detached from your profile completely, so nobody can trace it back to the rest of you.'
  },
  {
    t: 'One way to respond',
    d: 'There’s no comment box at all. People open an umbrella, which means they’re standing with you, and they can leave a word with it if that’s what you asked for. Nobody gets to argue underneath your worst day.'
  },
  {
    t: 'A few umbrellas a day',
    d: 'You get a handful, and once they’re gone they’re gone until tomorrow, which is rather the point: whoever opened one for you spent something to do it.'
  }
]

export default function Landing() {
  return (
    <>
      <IntroHero />
      <section className="introabout">
        <h2>What this is</h2>
        <p className="lead">
          Haven is where you put the thing you’ve been carrying around all week. Someone reads it and opens
          an umbrella for you, that shows up in your inbox, and there the whole exchange ends.
        </p>
        <dl className="points">
          {POINTS.map((p) => (
            <div className="point" key={p.t}>
              <dt>{p.t}</dt>
              <dd>{p.d}</dd>
            </div>
          ))}
        </dl>
        <div className="cta">
          <Link className="btn prim" href="/signup">Make an account</Link>
          <Link className="btn ghost" href="/feed">Browse as a guest</Link>
        </div>
      </section>
      <footer className="site-footer">
        <div>☂ Haven is peer support. It’s not a crisis line, and it’s not a replacement for a counsellor.</div>
        <nav>
          <Link href="/welcome">How it works</Link>
          <Link href="/resources">Resources</Link>
          <Link href="/guidelines">Guidelines</Link>
          <Link href="/feedback">Feedback</Link>
          <Link href="/contact">Contact</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </>
  )
}

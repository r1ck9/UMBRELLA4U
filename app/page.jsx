import Link from 'next/link'
import IntroHero from '@/components/IntroHero'

export default function Landing() {
  return (
    <>
      <IntroHero />
      <section className="introabout">
        <h2>What Haven is</h2>
        <p className="lead">
          Umbrella is a space for young people to share what&apos;s really going on, the hard days,
          the small wins, the things you can&apos;t say out loud yet, and to feel less alone.
          It&apos;s built to be safe, honest, and kind.
        </p>
        <div className="cols">
          <div>
            <h3>Anonymous by default</h3>
            <p>No real name required. Share as much or as little as you want, or post with your identity fully hidden.</p>
          </div>
          <div>
            <h3>Support, not judgment</h3>
            <p>The only way to respond is to &ldquo;open an umbrella&rdquo;, a small signal that says <em>I&apos;m here with you.</em> No comment wars.</p>
          </div>
          <div>
            <h3>Every umbrella counts</h3>
            <p>You get a few to give each day, so choosing to send one actually means something to the person who receives it.</p>
          </div>
        </div>
        <p className="care-intro">🫂 We know some days are heavy. However you&apos;re feeling, you&apos;re welcome here, just be kind to yourself, and to everyone else.</p>
        <div className="cta">
          <Link className="btn prim" href="/signup">Create or log in to an account</Link>
          <Link className="btn ghost" href="/feed">Browse as a guest</Link>
        </div>
      </section>
      <footer className="site-footer">
        <div>☂ Haven, peer support, not a substitute for professional or crisis help.</div>
        <nav>
          <Link href="/welcome">How it works</Link>
          <Link href="/resources">Resources</Link>
          <Link href="/guidelines">Guidelines</Link>
          <Link href="/feedback">Feedback</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
      </footer>
    </>
  )
}

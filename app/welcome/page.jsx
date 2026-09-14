import Link from 'next/link'
import TopBar from '@/components/TopBar'
import ThemeChooser from '@/components/ThemeChooser'

export const metadata = { title: 'How Haven works' }

const STEPS = [
  { n: '1', t: 'Post something', d: 'Whatever you’re carrying right now. It doesn’t have to be your worst moment, or a whole story. One line is fine.' },
  { n: '2', t: 'Say how you want to be met', d: 'Just listen, advice, similar stories, or resources. People answer the way you picked. If you said just listen, nobody hands you advice.' },
  { n: '3', t: 'People open an umbrella', d: 'One each. That’s the only response there is, so there’s no thread building up underneath you while you’re asleep.' },
  { n: '4', t: 'It lands in your inbox', d: 'You see how many opened and any words people left, and you can send a thank-you back.' }
]

const SAFE = [
  { t: 'You’re anonymous', d: 'No real names. Your email logs you in and resets your password, and it’s never shown to anyone. You can also post so a story isn’t linked to your profile at all.' },
  { t: 'Bad posts get stopped', d: 'A word filter catches slurs and abuse, including the ones people try to disguise. An AI check screens for hate and harassment. The block happens in the database, so it can’t be worked around from the browser.' },
  { t: 'Report anything', d: 'Every post has a Report button, and reports go to a human moderator who can take the post down. If enough people mark something as not relevant, it sinks out of the feed on its own.' },
  { t: 'If it reads like a crisis', d: 'You get 988 and Kids Help Phone right away. Haven is peer support. It isn’t a counsellor and it isn’t a crisis line, and it shouldn’t be the only place you go.' },
  { t: 'You agree before every post', d: 'There’s a short checklist you confirm each time. Criticize ideas, not people. That’s most of it.' }
]

export default function Welcome() {
  return (
    <>
      <TopBar />
      <main className="container welcome">
        <p className="wl-eyebrow">Welcome to</p>
        <h1 className="wl-title">☂ Haven</h1>
        <p className="wl-eyebrow" style={{ marginTop: '2px', opacity: 0.8 }}>an Umbrella4U product</p>
        <p className="wl-lead">Here’s the whole thing, start to finish, and what we do to keep it safe.</p>

        <section className="wl-sec">
          <h2>How it works</h2>
          <ol className="wl-steps">
            {STEPS.map((s) => (
              <li className="wl-step" key={s.n}>
                <span className="wl-num" aria-hidden="true">{s.n}</span>
                <div><h3>{s.t}</h3><p>{s.d}</p></div>
              </li>
            ))}
          </ol>
        </section>

        <section className="wl-sec">
          <h2>Why you’re safe here</h2>
          <dl className="wl-safe">
            {SAFE.map((s) => (
              <div className="wl-card" key={s.t}>
                <dt>{s.t}</dt>
                <dd>{s.d}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="wl-sec">
          <h2>Make it yours</h2>
          <p className="wl-sub">Pick a colour. It applies everywhere, only you see it, and you can change it whenever in Settings.</p>
          <ThemeChooser />
        </section>

        <div className="wl-cta">
          <Link className="btn prim" href="/feed">Enter Haven ☂</Link>
          <Link className="btn ghost" href="/guidelines">Read the full guidelines</Link>
        </div>
      </main>
    </>
  )
}

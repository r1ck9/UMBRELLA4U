import Link from 'next/link'
import TopBar from '@/components/TopBar'
import ThemeChooser from '@/components/ThemeChooser'

export const metadata = { title: 'How Haven works' }

const STEPS = [
  { n: '1', t: 'Post something', d: 'Whatever you’re carrying right now, which doesn’t have to be your worst moment or a whole story. One line is genuinely fine.' },
  { n: '2', t: 'Say how you want to be met', d: 'Pick from just listen, advice, similar stories, or resources, and people answer the way you asked. If you said just listen, nobody hands you advice you didn’t want.' },
  { n: '3', t: 'People open an umbrella', d: 'One each, and it’s the only response the app allows, which means there’s never a thread building up underneath you while you’re asleep.' },
  { n: '4', t: 'It lands in your inbox', d: 'You’ll see how many people opened one and any words they left, and you can send a thank-you back to anyone who wrote something.' }
]

const SAFE = [
  { t: 'You’re anonymous', d: 'You never give a real name, and the email you sign up with only logs you in and resets your password, so it’s never shown to anyone. You can also post in a way that doesn’t link the story to your profile at all.' },
  { t: 'Bad posts get stopped', d: 'A word filter catches slurs and abuse, including the ones people try to disguise by spacing letters out, and an AI check screens for hate and harassment on top of that. The block itself lives in the database rather than the browser, so there’s no way round it from the client.' },
  { t: 'Report anything', d: 'Every post has a Report button, and what you send goes to a human moderator who can take the post down. If enough people mark something as not relevant, it quietly sinks out of the feed without anyone having to act.' },
  { t: 'If it reads like a crisis', d: 'You’ll get 988 and Kids Help Phone straight away. Haven is peer support and nothing more than that, so it shouldn’t be the only place you go when things are genuinely bad.' },
  { t: 'You agree before every post', d: 'There’s a short checklist you confirm each time you post, and it mostly comes down to criticising ideas rather than people.' }
]

export default function Welcome() {
  return (
    <>
      <TopBar />
      <main className="container welcome">
        <p className="wl-eyebrow">Welcome to</p>
        <h1 className="wl-title">☂ Haven</h1>
        <p className="wl-eyebrow" style={{ marginTop: '2px', opacity: 0.8 }}>an Umbrella4U product</p>
        <p className="wl-lead">Here’s the whole thing from start to finish, along with what we do to keep it safe.</p>

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
          <p className="wl-sub">Pick a colour and it applies everywhere, though only you ever see it. You can change your mind whenever you like in Settings.</p>
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

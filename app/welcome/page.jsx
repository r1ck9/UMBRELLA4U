import Link from 'next/link'
import TopBar from '@/components/TopBar'
import ThemeChooser from '@/components/ThemeChooser'

export const metadata = { title: 'How Umbrella works' }

const STEPS = [
  { n: '1', icon: '🌧', t: 'Share your weather', d: 'Post whatever you’re carrying — a hard day, a small win, a question. You never have to share your worst moment; just what’s true right now.' },
  { n: '2', icon: '🫂', t: 'Choose how to be met', d: 'Say what you need: just listen, some advice, similar stories, or resources. People respond the way you asked — no unwanted advice.' },
  { n: '3', icon: '☂', t: 'One umbrella each', d: 'Instead of endless comments, people open a single umbrella for you — one quiet act of “I’m standing with you.” No pile-ons, no threads, no arguing.' },
  { n: '4', icon: '📨', t: 'Check your inbox', d: 'When someone opens an umbrella (and leaves a word, if you asked for one), it shows up in your inbox. That’s the whole loop.' }
]

const SAFE = [
  { icon: '🕶️', t: 'You’re anonymous', d: 'No real names. Your email is only for logging in — it’s never shown to anyone. You can even post fully anonymously so a story isn’t linked to your profile at all.' },
  { icon: '🛟', t: 'Layers of moderation', d: 'A word filter blocks slurs and abuse (even hidden ones), an AI check screens for hate and harassment, and the community can quietly flag off-topic posts. Nothing is one person’s job alone.' },
  { icon: '🛑', t: 'Report anything', d: 'Every post has a Report button. Flagged posts go to a human moderator who can take them down. If enough people mark something as “not relevant,” it quietly sinks out of view.' },
  { icon: '📞', t: 'Real help when it’s heavy', d: 'If a post sounds like a crisis, Umbrella points to trained help right away (988, Kids Help Phone). Umbrella is peer support — a place to feel less alone — not a replacement for a counsellor or crisis line.' },
  { icon: '💛', t: 'Kindness is the rule', d: 'Before every post you agree to keep your words safe and kind. Criticize ideas, never people. This is a shelter, and everyone helps keep it one.' }
]

export default function Welcome() {
  return (
    <>
      <TopBar />
      <main className="container welcome">
        <p className="wl-eyebrow">Welcome to</p>
        <h1 className="wl-title">☂ Umbrella</h1>
        <p className="wl-lead">We can’t stop the rain — but we can hold out an umbrella for each other. Here’s how it works, and how we keep it safe.</p>

        <section className="wl-sec">
          <h2>How it works</h2>
          <div className="wl-steps">
            {STEPS.map((s) => (
              <div className="wl-step" key={s.n}>
                <span className="wl-ico" aria-hidden="true">{s.icon}</span>
                <div><h3>{s.t}</h3><p>{s.d}</p></div>
              </div>
            ))}
          </div>
        </section>

        <section className="wl-sec">
          <h2>Why you’re safe here</h2>
          <div className="wl-safe">
            {SAFE.map((s) => (
              <div className="wl-card" key={s.t}>
                <span className="wl-ico" aria-hidden="true">{s.icon}</span>
                <h3>{s.t}</h3>
                <p>{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="wl-sec">
          <h2>Make it yours</h2>
          <p className="wl-sub">Umbrella should feel like your space. Pick a color theme — it applies everywhere and you can change it anytime in Settings.</p>
          <ThemeChooser />
        </section>

        <div className="wl-cta">
          <Link className="btn prim" href="/feed">Enter Umbrella ☂</Link>
          <Link className="btn ghost" href="/guidelines">Read the full guidelines</Link>
        </div>
      </main>
    </>
  )
}

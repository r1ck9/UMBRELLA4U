import Link from 'next/link'
import GuidelinesButton from '@/components/GuidelinesButton'

const CATS = [
  { k: 'identity', n: 'Identity',      d: 'Who you are — gender, sexuality, culture', c: '#8b6fc9' },
  { k: 'school',   n: 'School life',   d: 'Classes, friends, pressure, fitting in',    c: '#4a7fd6' },
  { k: 'mind',     n: 'Mental health', d: "How you're really doing on the inside",      c: '#3f9d9d' },
  { k: 'culture',  n: 'Culture',       d: 'Heritage, language, being new, belonging',  c: '#e0655e' },
  { k: 'wins',     n: 'Small wins',    d: 'Little victories that deserve a cheer',      c: '#3f9d78' },
  { k: 'vent',     n: 'Venting',       d: 'Let it out — no fixing, just release',       c: '#8a8a86' }
]

export default function Nav({ active = 'all' }) {
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/feed" className={'navitem' + (active === 'all' ? ' on' : '')}>Home</Link>
      <Link href="/inbox" className={'navitem' + (active === 'inbox' ? ' on' : '')}>Inbox</Link>
      <Link href="/resources" className="navitem">Resource hub</Link>
      <GuidelinesButton className="navitem" />
      <div className="nav-sep" />
      <div className="nav-lbl">Weather by kind</div>
      {CATS.map((c) => (
        <Link key={c.k} href={`/feed?cat=${c.k}`} className={'navitem cat' + (active === c.k ? ' on' : '')}>
          <span className="dot" style={{ background: c.c }} />
          <span className="navtext"><b>{c.n}</b><em>{c.d}</em></span>
        </Link>
      ))}
    </nav>
  )
}

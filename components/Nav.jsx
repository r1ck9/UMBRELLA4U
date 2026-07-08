'use client'
import Link from 'next/link'
import GuidelinesButton from '@/components/GuidelinesButton'
import NavReports from '@/components/NavReports'
import TourButton from '@/components/TourButton'
import { CATEGORIES } from '@/lib/categories'

export default function Nav({ active = 'all' }) {
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/feed" className={'navitem' + (active === 'all' ? ' on' : '')}><span className="ni-ic" aria-hidden="true">🏠</span>Home</Link>
      <Link href="/inbox" className={'navitem' + (active === 'inbox' ? ' on' : '')}><span className="ni-ic" aria-hidden="true">📨</span>Inbox</Link>
      <NavReports active={active} />
      <Link href="/resources" className="navitem"><span className="ni-ic" aria-hidden="true">📎</span>Resources</Link>
      <Link href="/welcome" className="navitem"><span className="ni-ic" aria-hidden="true">☂</span>How it works</Link>
      <TourButton className="navitem" />
      <Link href="/settings" className="navitem"><span className="ni-ic" aria-hidden="true">⚙️</span>Settings</Link>
      <Link href="/feedback" className="navitem"><span className="ni-ic" aria-hidden="true">💬</span>Feedback</Link>
      <GuidelinesButton className="navitem" />
      <div className="nav-sep" />
      <div className="nav-lbl">Weather</div>
      {CATEGORIES.map((c) => (
        <Link key={c.key} href={`/feed?cat=${c.key}`} className={'navitem cat' + (active === c.key ? ' on' : '')} title={c.desc}>
          <span className="dot" style={{ background: c.color }} />{c.name}
        </Link>
      ))}
    </nav>
  )
}

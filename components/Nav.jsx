'use client'
import Link from 'next/link'
import GuidelinesButton from '@/components/GuidelinesButton'
import NavReports from '@/components/NavReports'
import TourButton from '@/components/TourButton'
import { CATEGORIES } from '@/lib/categories'

export default function Nav({ active = 'all' }) {
  return (
    <nav className="nav" aria-label="Main">
      <Link href="/feed" className={'navitem' + (active === 'all' ? ' on' : '')}>Home</Link>
      <Link href="/inbox" className={'navitem' + (active === 'inbox' ? ' on' : '')}>Inbox</Link>
      <NavReports active={active} />
      <Link href="/resources" className="navitem">Resource hub</Link>
      <Link href="/welcome" className="navitem">How it works</Link>
      <TourButton className="navitem" />
      <Link href="/settings" className="navitem">Settings</Link>
      <GuidelinesButton className="navitem" />
      <div className="nav-sep" />
      <div className="nav-lbl">Weather by kind</div>
      {CATEGORIES.map((c) => (
        <Link key={c.key} href={`/feed?cat=${c.key}`} className={'navitem cat' + (active === c.key ? ' on' : '')}>
          <span className="dot" style={{ background: c.color }} />
          <span className="navtext"><b>{c.name}</b><em>{c.desc}</em></span>
        </Link>
      ))}
    </nav>
  )
}

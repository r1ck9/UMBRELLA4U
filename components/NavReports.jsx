'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { getMe } from '@/lib/me'

// Only shows the Reports link if the current user is a moderator.
export default function NavReports({ active }) {
  const [isMod, setIsMod] = useState(false)
  useEffect(() => { getMe().then((m) => setIsMod(m.isModerator)) }, [])
  if (!isMod) return null
  return <Link href="/moderation" className={'navitem' + (active === 'moderation' ? ' on' : '')}><span className="ni-ic" aria-hidden="true">🛑</span>Reports</Link>
}

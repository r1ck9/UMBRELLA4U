'use client'
import { useState } from 'react'
import Link from 'next/link'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import { supabase } from '@/lib/supabase'

export default function Feedback() {
  const [text, setText] = useState('')
  const [sent, setSent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  async function submit() {
    if (!text.trim()) return
    if (!supabase) { setSent(true); return }
    setBusy(true); setErr('')
    const { data } = await supabase.auth.getUser()
    const { error } = await supabase.from('feedback').insert({ message: text.trim(), user_id: data.user?.id || null })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setSent(true)
  }

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          <h2 className="feedhead">Send feedback</h2>
          {sent ? (
            <div className="fb-thanks">
              <p>Got it, thank you. We read all of these.</p>
              <Link className="btn prim sm" href="/feed">Back to the feed</Link>
            </div>
          ) : (
            <>
              <p className="sub" style={{ color: 'var(--ink-2)', margin: '0 0 14px', lineHeight: 1.6 }}>
                Bugs, ideas, or something that felt off. It goes to the team, and you don&apos;t have to put your name on it.
              </p>
              <textarea className="fb-box" value={text} maxLength={1500}
                onChange={(e) => setText(e.target.value)}
                placeholder="What would make this better?" />
              {err && <p className="msg" style={{ color: 'var(--care)' }}>{err}</p>}
              <div className="row end" style={{ marginTop: 12 }}>
                <button className="btn prim" onClick={submit} disabled={!text.trim() || busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
              </div>
              <p className="sub" style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 14 }}>
                Nobody watches this box in real time. If something is urgent, use the <Link href="/resources">Resource hub</Link>.
              </p>
            </>
          )}
        </main>
        <Rail />
      </div>
    </>
  )
}

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
              <p>🫂 Thank you. Your feedback landed with us, and it genuinely helps make Umbrella better and safer.</p>
              <Link className="btn prim sm" href="/feed">Back to the feed</Link>
            </div>
          ) : (
            <>
              <p className="sub" style={{ color: 'var(--ink-2)', margin: '0 0 14px', lineHeight: 1.6 }}>
                Found a bug? Have an idea? Something feel off or unsafe? Tell us anything — it&apos;s read by the team, and you can share it without your name.
              </p>
              <textarea className="fb-box" value={text} maxLength={1500}
                onChange={(e) => setText(e.target.value)}
                placeholder="What's on your mind? What would make Umbrella better for you?" />
              {err && <p className="msg" style={{ color: 'var(--care)' }}>{err}</p>}
              <div className="row end" style={{ marginTop: 12 }}>
                <button className="btn prim" onClick={submit} disabled={!text.trim() || busy}>{busy ? 'Sending…' : 'Send feedback'}</button>
              </div>
              <p className="sub" style={{ color: 'var(--ink-3)', fontSize: 13, marginTop: 14 }}>
                If it&apos;s an emergency or you&apos;re in danger, please use the <Link href="/resources">Resource hub</Link> — this box isn&apos;t monitored in real time.
              </p>
            </>
          )}
        </main>
        <Rail />
      </div>
    </>
  )
}

'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase, isConfigured } from '@/lib/supabase'

export default function Forgot() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!isConfigured) { setMsg('Connect Supabase first, see README.md.'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset`
    })
    // Don't reveal whether an email is registered, always show the same message.
    if (error && !/rate|limit/i.test(error.message)) { setMsg(error.message); return }
    setSent(true)
  }

  return (
    <main className="auth">
      <h1>Reset your password</h1>
      {sent ? (
        <p className="msg">If there’s an account for that email, a reset link is on its way. Check spam if it doesn’t show up. ☂</p>
      ) : (
        <>
          <p className="sub">Enter your email and we’ll send you a link to set a new password.</p>
          <form onSubmit={submit}>
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <button className="btn prim" type="submit">Send reset link</button>
          </form>
        </>
      )}
      {msg && <p className="msg">{msg}</p>}
      <p className="alt">Remembered it? <Link href="/login">Log in</Link></p>
    </main>
  )
}

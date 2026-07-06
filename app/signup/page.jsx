'use client'
import { useState } from 'react'
import Link from 'next/link'
import { supabase, isConfigured } from '@/lib/supabase'

export default function Signup() {
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!isConfigured) { setMsg('Connect Supabase first — see README.md.'); return }
    const { error } = await supabase.auth.signUp({ email, password: pw })
    if (error) { setMsg(error.message); return }
    setMsg('Account created. Check your email to confirm, then log in. (For testing you can turn off email confirmation in Supabase → Authentication.)')
  }

  return (
    <main className="auth">
      <h1>Come in from the rain</h1>
      <p className="sub">Create an anonymous account. No real name — your email is only for logging in and password resets.</p>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email (a fresh one just for Umbrella is fine)" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
        <button className="btn prim" type="submit">Create account</button>
      </form>
      {msg && <p className="msg">{msg}</p>}
      <p className="alt">Already have an account? <Link href="/login">Log in</Link></p>
    </main>
  )
}

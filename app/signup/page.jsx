'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, isConfigured } from '@/lib/supabase'

export default function Signup() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!isConfigured) { setMsg('Connect Supabase first — see README.md.'); return }
    const { data, error } = await supabase.auth.signUp({
      email, password: pw,
      options: { emailRedirectTo: `${window.location.origin}/login` }
    })
    if (error) { setMsg(error.message); return }
    // If email confirmation is OFF, a session exists now → go straight to setup.
    if (data.session) { router.push('/onboarding'); return }
    setMsg('Account created. Check your email to confirm, then log in — we’ll walk you through setting up your profile.')
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

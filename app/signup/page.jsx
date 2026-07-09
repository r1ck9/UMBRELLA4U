'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, isConfigured } from '@/lib/supabase'
import { track } from '@/lib/analytics'

export default function Signup() {
  const router = useRouter()
  useEffect(() => { track('click_signup') }, [])
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [agree, setAgree] = useState(false)
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!agree) { setMsg('Please confirm you’re 13 or older and agree to the Terms and Privacy Policy.'); return }
    if (!isConfigured) { setMsg('Connect Supabase first — see README.md.'); return }
    const { data, error } = await supabase.auth.signUp({
      email, password: pw,
      options: { emailRedirectTo: `${window.location.origin}/login` }
    })
    if (error) { setMsg(error.message); return }
    // Existing account: Supabase returns a user with EMPTY identities (and sends
    // no new email) when the address is already registered. Tell them to log in.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setMsg('You already have an account with this email — no need to sign up again. Just log in below. ☂')
      return
    }
    // If email confirmation is OFF, a session exists now → go straight to setup.
    if (data.session) { router.push('/onboarding'); return }
    setMsg('Account created! We just emailed you a confirmation link — click it, then log in and we’ll set you up. Don’t see it? Check your spam / junk folder (and mark it “Not spam” so we always land in your inbox). It can take a minute to arrive.')
  }

  return (
    <main className="auth">
      <h1>Come in from the rain</h1>
      <p className="sub">Create an anonymous account. No real name — your email is only for logging in and password resets.</p>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email (a fresh one just for Umbrella is fine)" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
        <label className="auth-agree">
          <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
          <span>I&apos;m 13 or older, and I agree to the <Link href="/terms">Terms of Use</Link> and <Link href="/privacy">Privacy Policy</Link>.</span>
        </label>
        <button className="btn prim" type="submit" disabled={!agree}>Create account</button>
      </form>
      {msg && <p className="msg">{msg}</p>}
      <p className="alt">Already have an account? <Link href="/login">Log in</Link></p>
    </main>
  )
}

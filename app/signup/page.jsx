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
    if (!isConfigured) { setMsg('Connect Supabase first, see README.md.'); return }
    const { data, error } = await supabase.auth.signUp({
      email, password: pw,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
    })
    if (error) { setMsg(error.message); return }
    // Existing account: Supabase returns a user with EMPTY identities (and sends
    // no new email) when the address is already registered. Tell them to log in.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setMsg('You already have an account with this email. Just log in below. ☂')
      return
    }
    // If email confirmation is OFF, a session exists now → go straight to setup.
    if (data.session) { router.push('/onboarding'); return }
    setMsg('Account created. There’s a confirmation link in your email. Click it, then come back and log in. If it hasn’t shown up in a minute, look in spam or junk, and mark it Not Spam so we land properly next time.')
  }

  return (
    <main className="auth">
      <h1>Come in from the rain</h1>
      <p className="sub">Create an anonymous account. You don’t need a real name. The email logs you in and resets your password, and that’s all it does.</p>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email (a fresh one just for Haven is fine)" value={email} onChange={(e) => setEmail(e.target.value)} required />
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

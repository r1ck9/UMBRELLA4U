'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, isConfigured } from '@/lib/supabase'

// Where the email-confirmation link lands. Finalizes the confirmation no matter
// which email-link style Supabase sends, and — crucially — works even when the
// link is opened on a DIFFERENT device/browser than the one that signed up:
//   • token_hash + type  → verifyOtp()          (device-independent; preferred)
//   • code               → exchangeCodeForSession() (PKCE, same-device only)
//   • #access_token=...   → auto-handled by detectSessionInUrl on client init (implicit)
export default function ConfirmEmail() {
  const router = useRouter()
  const [status, setStatus] = useState('working') // working | ok | error
  const [msg, setMsg] = useState('Confirming your email…')
  const [email, setEmail] = useState('')
  const [resent, setResent] = useState(false)

  useEffect(() => {
    if (!isConfigured) { setStatus('error'); setMsg('Connect Supabase first — see README.md.'); return }
    ;(async () => {
      try {
        const url = new URL(window.location.href)
        const q = url.searchParams
        const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
        const errDesc = q.get('error_description') || hash.get('error_description')
        if (errDesc) throw new Error(decodeURIComponent(errDesc))

        const tokenHash = q.get('token_hash')
        const type = q.get('type') || 'signup'
        const code = q.get('code')

        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          // A different-device PKCE link can't be exchanged here (no verifier);
          // the email is still confirmed server-side, so fall through to login.
          if (error && !/code verifier|both auth code/i.test(error.message)) throw error
        }
        // (implicit hash tokens are consumed automatically at client init)

        const { data } = await supabase.auth.getSession()
        if (data.session) {
          setStatus('ok'); setMsg('Email confirmed — you’re in. Taking you to setup… ☂')
          setTimeout(() => router.replace('/onboarding'), 1200)
        } else {
          setStatus('ok'); setMsg('Email confirmed! Just log in and we’ll set you up. ☂')
          setTimeout(() => router.replace('/login'), 1800)
        }
      } catch (e) {
        setStatus('error')
        setMsg(/expired|invalid|already/i.test(e.message)
          ? 'This confirmation link has expired or was already used. Try logging in — or send yourself a fresh link below.'
          : (e.message || 'Something went wrong confirming your email.'))
      }
    })()
  }, [router])

  async function resend(e) {
    e.preventDefault()
    if (!email) return
    const { error } = await supabase.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
    })
    setResent(!error)
    if (error) setMsg(error.message)
  }

  return (
    <main className="auth">
      <h1>{status === 'error' ? 'Confirmation hiccup' : 'Confirming your email'}</h1>
      <p className="msg">{msg}</p>
      {status === 'error' && (
        <>
          {resent
            ? <p className="msg">Sent — check your inbox (and spam / junk). ☂</p>
            : <form onSubmit={resend}>
                <input type="email" placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <button className="btn prim" type="submit">Resend confirmation link</button>
              </form>}
          <p className="alt">Or <Link href="/login">log in</Link> if you’ve already confirmed.</p>
        </>
      )}
    </main>
  )
}

'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, isConfigured } from '@/lib/supabase'

// Where the password-reset link lands. Establishes the recovery session no
// matter which email-link style Supabase sends (and works cross-device via
// token_hash), then lets the user choose a new password.
export default function ResetPassword() {
  const router = useRouter()
  const [ready, setReady] = useState(false)   // recovery session established?
  const [status, setStatus] = useState('working') // working | form | error | done
  const [msg, setMsg] = useState('Opening your reset link…')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')

  useEffect(() => {
    if (!isConfigured) { setStatus('error'); setMsg('Connect Supabase first, see README.md.'); return }
    // A recovery link fires this event once the session is set (implicit flow).
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') { setReady(true); setStatus('form'); setMsg('') }
    })
    ;(async () => {
      try {
        const url = new URL(window.location.href)
        const q = url.searchParams
        const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
        const errDesc = q.get('error_description') || hash.get('error_description')
        if (errDesc) throw new Error(decodeURIComponent(errDesc))

        const tokenHash = q.get('token_hash')
        const code = q.get('code')
        if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
          if (error) throw error
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        }
        // (implicit hash tokens are consumed automatically at client init)

        const { data } = await supabase.auth.getSession()
        if (data.session) { setReady(true); setStatus('form'); setMsg('') }
        else { setStatus('error'); setMsg('This reset link has expired or was already used. Request a fresh one below.') }
      } catch (e) {
        setStatus('error')
        setMsg(/expired|invalid|already/i.test(e.message)
          ? 'This reset link has expired or was already used. Request a fresh one below.'
          : (e.message || 'Something went wrong opening your reset link.'))
      }
    })()
    return () => sub?.subscription?.unsubscribe()
  }, [])

  async function save(e) {
    e.preventDefault()
    if (pw.length < 8) { setMsg('Password must be at least 8 characters.'); return }
    if (pw !== pw2) { setMsg('Those two passwords don’t match.'); return }
    const { error } = await supabase.auth.updateUser({ password: pw })
    if (error) { setMsg(error.message); return }
    setStatus('done'); setMsg('Password updated, you’re logged in. Taking you in… ☂')
    setTimeout(() => router.replace('/feed'), 1200)
  }

  return (
    <main className="auth">
      <h1>Choose a new password</h1>
      {status === 'form' && ready && (
        <form onSubmit={save}>
          <input type="password" placeholder="New password (8+ characters)" value={pw} onChange={(e) => setPw(e.target.value)} minLength={8} required />
          <input type="password" placeholder="Confirm new password" value={pw2} onChange={(e) => setPw2(e.target.value)} minLength={8} required />
          <button className="btn prim" type="submit">Update password</button>
        </form>
      )}
      {msg && <p className="msg">{msg}</p>}
      {status === 'error' && <p className="alt"><Link href="/forgot">Request a new reset link</Link></p>}
    </main>
  )
}

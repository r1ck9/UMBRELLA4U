'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase, isConfigured } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [msg, setMsg] = useState('')

  async function submit(e) {
    e.preventDefault()
    if (!isConfigured) { setMsg('Connect Supabase first — see README.md.'); return }
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    if (error) { setMsg(error.message); return }
    router.push('/feed')
  }

  return (
    <main className="auth">
      <h1>Welcome back</h1>
      <form onSubmit={submit}>
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <button className="btn prim" type="submit">Log in</button>
      </form>
      {msg && <p className="msg">{msg}</p>}
      <p className="alt">New here? <Link href="/signup">Sign up</Link></p>
    </main>
  )
}

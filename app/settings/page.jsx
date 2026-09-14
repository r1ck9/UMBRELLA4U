'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import Nav from '@/components/Nav'
import Rail from '@/components/Rail'
import ThemeChooser from '@/components/ThemeChooser'
import { supabase } from '@/lib/supabase'

export default function Settings() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)
  const [prefs, setPrefs] = useState({ discoverable: true, notify_email: true })

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) { setLoading(false); return }
      setUser(data.user)
      const { data: prof } = await supabase.from('profiles').select('username,discoverable,notify_email').eq('id', data.user.id).single()
      if (prof) {
        setUsername(prof.username || '')
        setPrefs({ discoverable: prof.discoverable ?? true, notify_email: prof.notify_email ?? false })
      }
      setLoading(false)
    })()
  }, [])

  async function toggle(key) {
    const next = { ...prefs, [key]: !prefs[key] }
    setPrefs(next)
    await supabase.from('profiles').update({ [key]: next[key] }).eq('id', user.id)
  }

  async function logoutEverywhere() {
    await supabase.auth.signOut({ scope: 'global' })
    router.push('/')
  }

  if (loading) return (<><TopBar /><main className="container"><p className="empty">Loading…</p></main></>)
  if (!user) return (<><TopBar /><main className="container"><h1>Settings</h1><p className="sub">Log in to manage your settings.</p></main></>)

  return (
    <>
      <TopBar />
      <div className="shell">
        <Nav active="" />
        <main className="feed">
          <h2 className="feedhead">Settings</h2>

          <div className="set-group">
            <h3>Appearance</h3>
            <p className="set-hint">Pick a colour. It applies everywhere, and only you see it.</p>
            <ThemeChooser />
          </div>

          <div className="set-group">
            <h3>Privacy</h3>
            <label className="set-row">
              <span><b>Show me in search</b><em>Let others find your profile by name or tags. Your stories stay public either way.</em></span>
              <button className={'toggle' + (prefs.discoverable ? ' on' : '')} onClick={() => toggle('discoverable')} aria-pressed={prefs.discoverable}><span /></button>
            </label>
          </div>

          <div className="set-group">
            <h3>Notifications</h3>
            <label className="set-row">
              <span><b>Email me when someone opens an umbrella</b><em>Coming soon. For now this just saves your preference.</em></span>
              <button className={'toggle' + (prefs.notify_email ? ' on' : '')} onClick={() => toggle('notify_email')} aria-pressed={prefs.notify_email}><span /></button>
            </label>
          </div>

          <div className="set-group">
            <h3>Account</h3>
            <p className="set-line"><Link href={username ? `/u/${encodeURIComponent(username)}` : '/profile'}>Edit your profile →</Link></p>
            <p className="set-line"><Link href="/welcome">How Haven works &amp; why you’re safe →</Link></p>
            <button className="btn ghost sm" onClick={logoutEverywhere}>Log out of all devices</button>
          </div>
        </main>
        <Rail />
      </div>
    </>
  )
}

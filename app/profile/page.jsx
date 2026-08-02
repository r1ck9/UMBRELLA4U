'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import TopBar from '@/components/TopBar'
import { supabase } from '@/lib/supabase'

// Compatibility route for old bookmarks. Haven now has one profile page: /u/:username.
export default function ProfileRedirect() {
  const router = useRouter()

  useEffect(() => {
    if (!supabase) { router.replace('/login'); return }
    let active = true
    ;(async () => {
      const { data } = await supabase.auth.getUser()
      if (!active) return
      if (!data.user) { router.replace('/login'); return }

      const { data: profile } = await supabase.from('profiles')
        .select('username').eq('id', data.user.id).maybeSingle()
      if (!active) return
      if (profile?.username) router.replace(`/u/${encodeURIComponent(profile.username)}`)
      else router.replace('/onboarding')
    })()
    return () => { active = false }
  }, [router])

  return (
    <>
      <TopBar />
      <main className="container"><p className="empty">Opening your profile...</p></main>
    </>
  )
}

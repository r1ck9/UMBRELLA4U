'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

// Follow / unfollow another member. Hidden on your own profile and for
// anonymous authors (no targetId). Guests are sent to sign up on click.
export default function FollowButton({ targetId, onChange }) {
  const router = useRouter()
  const [state, setState] = useState('hidden') // hidden | follow | following | working

  useEffect(() => {
    if (!supabase || !targetId) return
    ;(async () => {
      const me = await getMe()
      if (me.userId === targetId) { setState('hidden'); return }
      if (!me.userId) { setState('follow'); return }
      const { data } = await supabase.rpc('is_following', { target: targetId })
      setState(data ? 'following' : 'follow')
    })()
  }, [targetId])

  async function toggle() {
    const me = await getMe()
    if (!me.userId) { router.push('/signup'); return }
    if (state === 'working') return
    const wasFollowing = state === 'following'
    setState('working')
    const { error } = wasFollowing
      ? await supabase.rpc('unfollow', { target: targetId })
      : await supabase.rpc('follow', { target: targetId })
    if (error) { setState(wasFollowing ? 'following' : 'follow'); return }
    setState(wasFollowing ? 'follow' : 'following')
    onChange && onChange(wasFollowing ? -1 : 1)
  }

  if (state === 'hidden') return null
  const on = state === 'following'
  return (
    <button className={'followbtn' + (on ? ' on' : '')} onClick={toggle} disabled={state === 'working'}>
      {on ? 'Following ✓' : '+ Follow'}
    </button>
  )
}

'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// Counts one visit per browser session (so a single person reloading doesn't inflate it).
export default function ViewCounter() {
  useEffect(() => {
    if (!supabase) return
    try {
      if (sessionStorage.getItem('umb_viewed')) return
      sessionStorage.setItem('umb_viewed', '1')
    } catch {}
    supabase.rpc('bump_view')
  }, [])
  return null
}

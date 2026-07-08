'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Counts one visit per browser session (so one person reloading or clicking
// around doesn't inflate the number). Mounted once in the root layout, so it
// counts a visit no matter which page someone lands on first.
export default function ViewCounter() {
  const pathname = usePathname()
  useEffect(() => {
    if (!supabase) return
    try {
      if (sessionStorage.getItem('umb_viewed')) return
      sessionStorage.setItem('umb_viewed', '1')
    } catch {}
    supabase.rpc('bump_view').then(({ error }) => {
      if (error) {
        // Don't leave the session flagged as counted if it didn't actually
        // land — so it retries on the next navigation instead of staying 0.
        try { sessionStorage.removeItem('umb_viewed') } catch {}
        console.warn('[views] bump_view failed — did you run supabase/site_metrics.sql?', error.message)
      }
    })
  }, [pathname])
  return null
}

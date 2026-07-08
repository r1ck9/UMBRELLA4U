'use client'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// Counts a view on EVERY page load and navigation — reloads and reopens all
// count, so the shown number keeps climbing. The first view of a browser
// session is flagged `fresh`, which also bumps the private honest counter
// (views_real) in the database.
export default function ViewCounter() {
  const pathname = usePathname()
  useEffect(() => {
    if (!supabase) return
    let fresh = true
    try {
      fresh = !sessionStorage.getItem('umb_viewed')
      sessionStorage.setItem('umb_viewed', '1')
    } catch {}
    supabase.rpc('bump_view', { fresh }).then(({ error }) => {
      if (error) console.warn('[views] bump_view failed — did you run supabase/site_metrics.sql + views_repeat.sql?', error.message)
    })
  }, [pathname])
  return null
}

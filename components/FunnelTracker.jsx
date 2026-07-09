'use client'
import { useEffect } from 'react'
import { track } from '@/lib/analytics'

// Fires the first two funnel steps: a visit, and "stayed longer than 30s".
export default function FunnelTracker() {
  useEffect(() => {
    track('visit')
    const t = setTimeout(() => track('stayed_30s'), 30000)
    return () => clearTimeout(t)
  }, [])
  return null
}

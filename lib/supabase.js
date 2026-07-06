import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// True once you've added your keys to .env.local
export const isConfigured = Boolean(url && anon)

// Browser client — persists the logged-in session. Only created in the browser,
// so importing this file from a server component is safe.
export const supabase =
  isConfigured && typeof window !== 'undefined' ? createClient(url, anon) : null

// Read-only client for server components (public reads; no session).
// cache: 'no-store' so the feed always shows the latest stories (Next.js
// otherwise caches the fetch and freezes the feed).
export function serverSupabase() {
  if (!isConfigured) return null
  return createClient(url, anon, {
    auth: { persistSession: false },
    global: { fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }) }
  })
}

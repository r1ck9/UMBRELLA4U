import { createClient } from '@supabase/supabase-js'

// SERVER-ONLY admin client. Uses the Supabase service_role key, which bypasses
// RLS and can read every user's email — so it must NEVER be exposed to the
// browser. The key is read from a non-public env var and this file is only
// imported by server-side API routes.
export function adminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

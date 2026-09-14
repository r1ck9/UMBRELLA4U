import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function authedSupabase(req) {
  const authorization = req.headers.get('authorization') || ''
  if (!url || !anon || !authorization) return null

  return createClient(url, anon, {
    auth: { persistSession: false },
    global: {
      headers: { Authorization: authorization },
      fetch: (input, init = {}) => fetch(input, { ...init, cache: 'no-store' }),
    },
  })
}

export async function requireModerator(req) {
  const client = authedSupabase(req)
  if (!client) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  const { data: userData } = await client.auth.getUser()
  const user = userData?.user
  if (!user) return { error: Response.json({ error: 'Unauthorized' }, { status: 401 }) }

  // am_i_moderator() keeps is_moderator hidden from the public API. Fall back
  // to reading the column only if the function doesn't exist yet. Any other
  // failure leaves isModerator false, so this fails closed.
  let isModerator = false
  const { data: isMod, error: rpcError } = await client.rpc('am_i_moderator')
  if (!rpcError) {
    isModerator = isMod === true
  } else {
    const { data: profile } = await client.from('profiles').select('is_moderator').eq('id', user.id).maybeSingle()
    isModerator = !!profile?.is_moderator
  }

  if (!isModerator) {
    return { error: Response.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { client, user }
}

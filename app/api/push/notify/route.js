import { adminSupabase } from '@/lib/supabaseAdmin'
import { sendWebPush } from '@/lib/webpush'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Sends a web push to one member's devices. Called by the Supabase DB trigger
// (see supabase/web_push.sql) when a real person opens an umbrella / leaves a
// word on that member's story. Protected by a shared secret so it can't be
// abused from outside.
export async function POST(req) {
  const secret = process.env.PUSH_SECRET
  let body
  try { body = await req.json() } catch { return Response.json({ error: 'bad_json' }, { status: 400 }) }
  if (!secret || body.secret !== secret) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { user_id, title, body: msg, url } = body
  if (!user_id) return Response.json({ error: 'no_user' }, { status: 400 })

  const sb = adminSupabase()
  if (!sb) return Response.json({ error: 'no_admin' }, { status: 500 })

  const { data: rows } = await sb.from('web_push_subs').select('endpoint,sub').eq('user_id', user_id)
  const res = await sendWebPush(rows || [], { title: title || 'Haven ☂', body: msg || '', url: url || '/inbox' })
  if (res.stale?.length) await sb.from('web_push_subs').delete().in('endpoint', res.stale)
  return Response.json({ ok: true, ...res })
}

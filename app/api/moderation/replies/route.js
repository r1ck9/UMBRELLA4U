import { requireModerator } from '@/lib/moderationServer'

export const runtime = 'nodejs'

export async function GET(req) {
  const { client, error } = await requireModerator(req)
  if (error) return error

  const { data } = await client.rpc('pending_reply_posts')
  return Response.json({ items: data || [] })
}

export async function POST(req) {
  const { client, error } = await requireModerator(req)
  if (error) return error

  let body = {}
  try { body = await req.json() } catch {}

  const sid = body.sid
  if (!sid) return Response.json({ error: 'Missing story id' }, { status: 400 })

  if (body.action === 'skip') {
    const { error: skipError } = await client.rpc('mark_replied', { sid })
    if (skipError) return Response.json({ error: skipError.message || 'Could not skip' }, { status: 400 })
    return Response.json({ ok: true })
  }

  const text = String(body.body || '').trim()
  if (!text) return Response.json({ error: 'Missing reply text' }, { status: 400 })

  const { error: replyError } = await client.rpc('reply_as_bot', { sid, body: text })
  if (replyError) return Response.json({ error: replyError.message || 'Could not send' }, { status: 400 })

  return Response.json({ ok: true })
}

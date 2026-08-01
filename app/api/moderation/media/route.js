import { requireModerator } from '@/lib/moderationServer'
import { adminSupabase } from '@/lib/supabaseAdmin'
import { sendPush } from '@/lib/push'
import { sendWebPush } from '@/lib/webpush'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { client, error } = await requireModerator(req)
  if (error) return error

  const { data, error: queryError } = await client.from('stories')
    .select('id,text,category,anonymous,created_at,giphy_id,photo_path,media_status')
    .eq('media_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)

  if (queryError) return Response.json({ error: queryError.message }, { status: 400 })
  return Response.json({ items: data || [] })
}

async function sendRejectionPush(userId) {
  const admin = adminSupabase()
  if (!admin || !userId) return

  const [{ data: webRows }, { data: deviceRows }] = await Promise.all([
    admin.from('web_push_subs').select('endpoint,sub').eq('user_id', userId),
    admin.from('device_tokens').select('token').eq('user_id', userId),
  ])
  const payload = {
    title: 'A Haven post update',
    body: "Your photo or GIF post wasn't approved, so it wasn't published.",
    url: '/inbox',
  }
  const [webResult, deviceResult] = await Promise.all([
    sendWebPush(webRows || [], payload),
    sendPush((deviceRows || []).map((row) => row.token), payload),
  ])
  if (webResult.stale?.length) await admin.from('web_push_subs').delete().in('endpoint', webResult.stale)
  if (deviceResult.stale?.length) await admin.from('device_tokens').delete().in('token', deviceResult.stale)
}

export async function POST(req) {
  const { client, error } = await requireModerator(req)
  if (error) return error

  let body = {}
  try { body = await req.json() } catch {}
  const storyId = typeof body.story_id === 'string' ? body.story_id : ''
  const decision = body.decision
  if (!storyId || !['approved', 'rejected'].includes(decision)) {
    return Response.json({ error: 'Invalid review decision.' }, { status: 400 })
  }

  const { data, error: reviewError } = await client.rpc('review_media_story', {
    p_story_id: storyId,
    p_decision: decision,
    p_reason: null,
  })
  if (reviewError) return Response.json({ error: reviewError.message }, { status: 400 })

  const result = Array.isArray(data) ? data[0] : data
  if (decision === 'rejected' && result?.recipient_id) {
    try { await sendRejectionPush(result.recipient_id) } catch (pushError) {
      console.error('media rejection push failed:', pushError?.message || pushError)
    }
  }
  return Response.json({ ok: true })
}

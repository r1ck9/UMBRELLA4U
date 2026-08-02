import { requireModerator } from '@/lib/moderationServer'
import { adminSupabase } from '@/lib/supabaseAdmin'
import { sendPush } from '@/lib/push'
import { sendWebPush } from '@/lib/webpush'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req) {
  const { client, error } = await requireModerator(req)
  if (error) return error

  const { data, error: queryError } = await client.from('profile_avatar_submissions')
    .select('id,user_id,photo_path,status,created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(100)
  if (queryError) return Response.json({ error: queryError.message }, { status: 400 })

  const userIds = [...new Set((data || []).map((item) => item.user_id))]
  const { data: profiles } = userIds.length
    ? await client.from('profiles').select('id,username,display_name').in('id', userIds)
    : { data: [] }
  const profileById = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]))

  const items = await Promise.all((data || []).map(async (item) => {
    const { data: signed } = await client.storage.from('avatars').createSignedUrl(item.photo_path, 10 * 60)
    const profile = profileById[item.user_id] || {}
    return {
      ...item,
      username: profile.username || '',
      display_name: profile.display_name || '',
      preview_url: signed?.signedUrl || '',
    }
  }))

  return Response.json({ items: items.filter((item) => item.preview_url) })
}

async function sendRejectionPush(userId) {
  const admin = adminSupabase()
  if (!admin || !userId) return
  const [{ data: webRows }, { data: deviceRows }] = await Promise.all([
    admin.from('web_push_subs').select('endpoint,sub').eq('user_id', userId),
    admin.from('device_tokens').select('token').eq('user_id', userId),
  ])
  const payload = {
    title: 'A Haven profile update',
    body: "Your profile photo wasn't approved. Your current profile picture has not changed.",
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
  const { user, error } = await requireModerator(req)
  if (error) return error

  let body = {}
  try { body = await req.json() } catch {}
  const submissionId = typeof body.submission_id === 'string' ? body.submission_id : ''
  const decision = body.decision
  if (!submissionId || !['approved', 'rejected'].includes(decision)) {
    return Response.json({ error: 'Invalid profile photo decision.' }, { status: 400 })
  }

  const admin = adminSupabase()
  if (!admin) return Response.json({ error: 'Profile photo moderation is unavailable.' }, { status: 503 })
  const { data, error: reviewError } = await admin.rpc('review_profile_avatar', {
    p_submission_id: submissionId,
    p_decision: decision,
    p_moderator_id: user.id,
  })
  if (reviewError) return Response.json({ error: reviewError.message }, { status: 400 })

  const result = Array.isArray(data) ? data[0] : data
  const remove = decision === 'rejected' ? result?.photo_path : result?.previous_photo_path
  if (remove) {
    const { error: removeError } = await admin.storage.from('avatars').remove([remove])
    if (removeError) console.error('old profile photo cleanup failed:', removeError.message)
  }
  if (decision === 'rejected' && result?.recipient_id) {
    try { await sendRejectionPush(result.recipient_id) } catch (pushError) {
      console.error('profile photo rejection push failed:', pushError?.message || pushError)
    }
  }

  return Response.json({ ok: true })
}

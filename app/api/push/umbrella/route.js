import { adminSupabase } from '@/lib/supabaseAdmin'
import { sendWebPush } from '@/lib/webpush'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function bearerToken(req) {
  const auth = req.headers.get('authorization') || ''
  const match = auth.match(/^Bearer\s+(.+)$/i)
  return match ? match[1] : ''
}

async function getStoryAuthor(sb, storyId) {
  const { data: story, error } = await sb.from('stories')
    .select('author_id')
    .eq('id', storyId)
    .maybeSingle()
  if (error) throw error
  if (story?.author_id) return story.author_id

  const { data: link, error: linkError } = await sb.from('story_authors')
    .select('author_id')
    .eq('story_id', storyId)
    .maybeSingle()
  if (linkError) throw linkError
  return link?.author_id || null
}

// Browser-safe replacement for the old Supabase pg_net trigger. The client
// calls this only after the umbrella insert succeeds; notification failures
// stay isolated from posting/opening umbrellas.
export async function POST(req) {
  const sb = adminSupabase()
  if (!sb) return Response.json({ error: 'no_admin' }, { status: 500 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'bad_json' }, { status: 400 }) }

  const storyId = body?.story_id
  if (!storyId || typeof storyId !== 'string') return Response.json({ error: 'no_story' }, { status: 400 })

  const token = bearerToken(req)
  if (!token) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const { data: auth, error: authError } = await sb.auth.getUser(token)
  if (authError || !auth?.user) return Response.json({ error: 'unauthorized' }, { status: 401 })

  const userId = auth.user.id
  const { data: umbrella, error: umbrellaError } = await sb.from('umbrellas')
    .select('id,note,created_at')
    .eq('story_id', storyId)
    .eq('user_id', userId)
    .maybeSingle()
  if (umbrellaError) return Response.json({ error: umbrellaError.message }, { status: 500 })
  if (!umbrella) return Response.json({ error: 'no_umbrella' }, { status: 404 })
  // Only notify for an umbrella opened in the last couple of minutes. Without
  // this, whoever opened one could call the route over and over and spam the
  // author's devices.
  if (Date.now() - new Date(umbrella.created_at).getTime() > 2 * 60 * 1000) {
    return Response.json({ ok: true, skipped: true, reason: 'not_recent' })
  }

  let authorId
  try {
    authorId = await getStoryAuthor(sb, storyId)
  } catch (e) {
    return Response.json({ error: e.message || 'story_lookup_failed' }, { status: 500 })
  }

  if (!authorId || authorId === userId) {
    return Response.json({ ok: true, skipped: true, reason: 'no_recipient' })
  }

  const { data: rows, error: subError } = await sb.from('web_push_subs')
    .select('endpoint,sub')
    .eq('user_id', authorId)
  if (subError) return Response.json({ error: subError.message }, { status: 500 })

  const res = await sendWebPush(rows || [], {
    title: 'Someone stood with you',
    body: umbrella.note ? 'They left you a word of support.' : 'Someone opened an umbrella on your story.',
    url: '/inbox'
  })
  if (res.stale?.length) await sb.from('web_push_subs').delete().in('endpoint', res.stale)
  return Response.json({ ok: true, ...res })
}

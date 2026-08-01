import { requireModerator } from '@/lib/moderationServer'

export const runtime = 'nodejs'

export async function GET(req) {
  const { client, error } = await requireModerator(req)
  if (error) return error

  const parsed = new URL(req.url)
  const range = parsed.searchParams.get('range') === 'week' ? 'week' : 'day'

  const [{ data: summary }, { data: posts }, { data: hourly }] = await Promise.all([
    client.rpc('bot_status'),
    client.rpc('bot_report_posts', { n: 30 }),
    client.rpc('bot_likes_series', { mode: range }),
  ])

  return Response.json({
    summary: summary || [],
    hourly: hourly || [],
    posts: (posts || []).map((p) => ({
      excerpt: p.post_excerpt,
      category: p.cat,
      anonymous: p.is_anon,
      assisted: p.bot_likes,
      target: p.target_n,
      pct: p.pct,
      real: p.real_likes,
      status: p.drip_status,
      nextSecs: p.next_secs,
    })),
  })
}

import { serverSupabase, isConfigured } from './supabase'
import { SAMPLE_STORIES } from './sampleData'
import { OFF_TOPIC_THRESHOLD } from './config'

// Posts the community has marked "not relevant here" enough times don't get
// removed — they just sink below everything else while they wait for review.
function sinkOffTopic(stories) {
  const fresh = [], sunk = []
  for (const s of stories) {
    ((s.off_topic_count ?? 0) >= OFF_TOPIC_THRESHOLD ? sunk : fresh).push(s)
  }
  return [...fresh, ...sunk]
}

// Feed ranking. Blends four signals the way most feeds do:
//   • recency   — new posts surface (and the very newest always get a floor)
//   • engagement — umbrellas + views push good posts up (saturating, so it
//                  can't be gamed by one runaway post)
//   • resurfacing — old posts nobody's seen get a random second chance
//   • randomness — a little jitter for discovery, so the feed isn't identical
// Re-shuffles per request, like a real feed.
function rankStories(list) {
  const now = Date.now()
  const newest = new Set(
    [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 3).map((s) => s.id)
  )
  const scored = list.map((s) => {
    const ageH = Math.max(0, (now - new Date(s.created_at).getTime()) / 3600000)
    const recency = 1 / Math.pow(ageH + 2, 0.55)                 // ~0.68 fresh, decays with age
    const eng = (s.umbrella_count || 0) * 3 + Math.log2((s.view_count || 0) + 1)
    const engNorm = eng / (eng + 6)                              // 0..1, saturating
    let score = 0.45 * recency + 0.35 * engNorm + 0.15 * Math.random()
    if (ageH > 168 && (s.view_count || 0) < 3 && Math.random() < 0.25) score += 0.5 // resurface neglected old posts
    if (newest.has(s.id)) score += 0.6                           // always float the very newest
    return { s, score }
  })
  scored.sort((a, b) => b.score - a.score)
  return scored.map((x) => x.s)
}

// Reads live stories for the feed. Falls back to sample data until Supabase is connected.
export async function getStories(category = null) {
  if (!isConfigured) {
    const s = category ? SAMPLE_STORIES.filter((x) => x.category === category) : SAMPLE_STORIES
    return { stories: s, live: false }
  }
  const sb = serverSupabase()
  let q = sb.from('stories').select('*').eq('state', 'live')
  if (category) q = q.eq('category', category)
  // pull a wide pool of recent posts, rank them, then take the top of the feed
  const { data, error } = await q.order('created_at', { ascending: false }).limit(300)
  if (error) {
    console.error('getStories error:', error.message)
    return { stories: SAMPLE_STORIES, live: false }
  }
  const ranked = sinkOffTopic(rankStories(data || [])).slice(0, 50)
  // attach each (non-anonymous) author's streak so cards can show a badge
  const ids = [...new Set(ranked.filter((s) => !s.anonymous && s.author_id).map((s) => s.author_id))]
  if (ids.length) {
    const { data: profs } = await sb.from('profiles').select('id,streak_count').in('id', ids)
    const byId = {}
    ;(profs || []).forEach((p) => { byId[p.id] = p.streak_count || 0 })
    ranked.forEach((s) => { s.author_streak = s.anonymous ? 0 : (byId[s.author_id] || 0) })
  }
  return { stories: ranked, live: true }
}

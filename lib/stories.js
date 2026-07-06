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

// Reads live stories for the feed. Falls back to sample data until Supabase is connected.
export async function getStories(category = null) {
  if (!isConfigured) {
    const s = category ? SAMPLE_STORIES.filter((x) => x.category === category) : SAMPLE_STORIES
    return { stories: s, live: false }
  }
  const sb = serverSupabase()
  let q = sb.from('stories').select('*').eq('state', 'live')
  if (category) q = q.eq('category', category)
  const { data, error } = await q.order('created_at', { ascending: false }).limit(50)
  if (error) {
    console.error('getStories error:', error.message)
    return { stories: SAMPLE_STORIES, live: false }
  }
  return { stories: sinkOffTopic(data), live: true }
}

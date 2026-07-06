import { serverSupabase, isConfigured } from './supabase'
import { SAMPLE_STORIES } from './sampleData'

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
  return { stories: data, live: true }
}

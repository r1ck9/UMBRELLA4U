import { supabase } from './supabase'

// Cached once per page load: the current user's id + whether they're a moderator.
let cache
export function getMe() {
  if (!supabase) return Promise.resolve({ userId: null, isModerator: false })
  if (!cache) {
    cache = (async () => {
      const { data } = await supabase.auth.getUser()
      const user = data.user
      if (!user) return { userId: null, isModerator: false }
      const { data: prof } = await supabase.from('profiles').select('is_moderator').eq('id', user.id).single()
      return { userId: user.id, isModerator: !!(prof && prof.is_moderator) }
    })()
  }
  return cache
}

// The current user's own story ids (including their anonymous posts), read from
// the private story_authors table (RLS returns only your own rows). Cached per
// page load. Used for "my stories" surfaces: inbox, the bell, the return
// banner, and marking your own cards.
let idsCache
export function getMyStoryIds() {
  if (!supabase) return Promise.resolve(new Set())
  if (!idsCache) {
    idsCache = (async () => {
      const { data } = await supabase.from('story_authors').select('story_id')
      return new Set((data || []).map((r) => r.story_id))
    })()
  }
  return idsCache
}

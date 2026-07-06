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

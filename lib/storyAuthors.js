export function withStoryAuthor(story, profile) {
  if (!profile || story.anonymous) return { ...story }
  return {
    ...story,
    author_avatar_url: profile.avatar_url || '',
    author_accent_color: profile.accent_color || '',
    author_streak: profile.streak_count || 0,
    author_posts: profile.post_count || 0,
    author_umbrellas_sent: profile.umbrellas_sent || 0,
  }
}

// Batch author profiles onto stories so a feed needs one profile request—not
// one request per card. Anonymous stories are deliberately excluded.
export async function attachStoryAuthors(client, stories = []) {
  const list = stories.map((story) => ({ ...story }))
  const ids = [...new Set(list
    .filter((story) => !story.anonymous && story.author_id)
    .map((story) => story.author_id))]
  if (!client || ids.length === 0) return list

  const { data, error } = await client.from('profiles')
    .select('id,avatar_url,accent_color,streak_count,post_count,umbrellas_sent')
    .in('id', ids)
  if (error) return list

  const profiles = new Map((data || []).map((profile) => [profile.id, profile]))
  return list.map((story) => withStoryAuthor(story, profiles.get(story.author_id)))
}

// Badges a member can earn. Each returns { icon, label } or null.
// Shown next to a member's name (feed cards + profiles).

// Streak, consecutive days a member shows up.
export function streakBadge(days) {
  if (days >= 100) return { icon: '🏆', label: '100-day shelter' }
  if (days >= 30) return { icon: '🌟', label: '30 days of showing up' }
  if (days >= 14) return { icon: '🌊', label: '2 weeks steady' }
  if (days >= 7) return { icon: '☂', label: 'a week of showing up' }
  if (days >= 3) return { icon: '🌱', label: '3-day streak' }
  return null
}

// Posting, stories a member has shared.
export function postBadge(posts) {
  if (posts >= 50) return { icon: '📖', label: '50 stories shared' }
  if (posts >= 10) return { icon: '📝', label: '10 stories shared' }
  if (posts >= 1) return { icon: '🖊️', label: 'shared their first story' }
  return null
}

// Umbrellas sent, each umbrella you open is a hug for someone. Rewards showing
// up for others.
export function umbrellaBadge(sent) {
  if (sent >= 100) return { icon: '👑', label: '100 umbrellas sent, a guardian' }
  if (sent >= 50) return { icon: '💞', label: '50 umbrellas sent, a shelter' }
  if (sent >= 10) return { icon: '🫂', label: '10 umbrellas sent, a friend' }
  return null
}

// Every badge a member has earned, highest-meaning first. Used wherever we show
// a member's badges together (profile card, story cards).
export function earnedBadges({ streak = 0, posts = 0, umbrellasSent = 0 } = {}) {
  return [
    umbrellaBadge(umbrellasSent),
    streakBadge(streak),
    postBadge(posts)
  ].filter(Boolean)
}

// The days at which we show a little celebration moment.
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365]

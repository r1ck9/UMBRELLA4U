// Streak badge tiers. Shown next to a member's name once they hit a milestone.
export function streakBadge(days) {
  if (days >= 100) return { icon: '🏆', label: '100-day shelter' }
  if (days >= 30) return { icon: '🌟', label: '30 days of showing up' }
  if (days >= 14) return { icon: '🌊', label: '2 weeks steady' }
  if (days >= 7) return { icon: '☂', label: 'a week of showing up' }
  if (days >= 3) return { icon: '🌱', label: '3-day streak' }
  return null
}

// The days at which we show a little celebration moment.
export const STREAK_MILESTONES = [3, 7, 14, 30, 60, 100, 365]

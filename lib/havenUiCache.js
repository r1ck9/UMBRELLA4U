const EMPTY_TOP_BAR = {
  ready: false,
  userId: null,
  email: null,
  avatar: null,
  unread: 0,
}

const EMPTY_RAIL = {
  statsReady: false,
  userReady: false,
  userId: null,
  stats: { stories: null, umbrellas: null, sunny: null },
  umbrellasLeft: null,
  postsLeft: null,
  streak: null,
}

// These snapshots live only for the current browser tab's JavaScript session.
// They survive client-side route changes, but never persist across reloads or
// leave the device. Every remount still refreshes them from Supabase.
let topBarCache = { ...EMPTY_TOP_BAR }
let railCache = { ...EMPTY_RAIL, stats: { ...EMPTY_RAIL.stats } }

export function getTopBarUiCache() {
  return topBarCache
}

export function updateTopBarUiCache(patch) {
  topBarCache = { ...topBarCache, ...patch }
  return topBarCache
}

export function getRailUiCache() {
  return railCache
}

export function updateRailUiCache(patch) {
  railCache = {
    ...railCache,
    ...patch,
    stats: patch.stats ? { ...railCache.stats, ...patch.stats } : railCache.stats,
  }
  return railCache
}

export function clearHavenUserUiCache() {
  topBarCache = { ...EMPTY_TOP_BAR }
  railCache = {
    ...railCache,
    userReady: false,
    userId: null,
    umbrellasLeft: null,
    postsLeft: null,
    streak: null,
  }
}

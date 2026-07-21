// The one timezone the whole app treats as "a day," for daily limits and
// streaks. MUST match supabase/day_boundary_tz.sql. When Umbrella grows past
// one region, move to per-user timezones on both sides.
export const APP_TZ = 'America/Vancouver'

// ISO instant of the most recent midnight in APP_TZ, works no matter what
// timezone the visitor's browser/device is actually set to.
export function startOfDayISO(tz = APP_TZ) {
  const now = new Date()
  // same instant re-expressed as APP_TZ wall-clock, then read back in the
  // browser's local zone → its epoch encodes the APP_TZ wall clock
  const wall = new Date(now.toLocaleString('en-US', { timeZone: tz }))
  const offset = now.getTime() - wall.getTime()   // browser-local vs APP_TZ (ms)
  const midnight = new Date(wall)
  midnight.setHours(0, 0, 0, 0)                    // APP_TZ midnight, in wall terms
  const at = new Date(midnight.getTime() + offset)
  at.setMilliseconds(0)
  return at.toISOString()
}

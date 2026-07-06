-- Reset all umbrellas (for testing). Run in Supabase SQL Editor.
-- Deletes every umbrella and zeroes the per-story counts, which also
-- clears the "one umbrella each" and daily-limit state.

delete from umbrellas;
update stories set umbrella_count = 0;

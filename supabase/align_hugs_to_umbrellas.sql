-- An umbrella is a hug: set every story's hug_count to match its umbrella_count.
-- Run after the umbrella totals are set (e.g. seed_100_and_total3000.sql), since
-- that changed umbrella_count. Safe to re-run.
update stories set hug_count = umbrella_count where hug_count is distinct from umbrella_count;

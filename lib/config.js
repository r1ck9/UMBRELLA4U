// How many umbrellas each person can open per day.
// NOTE: this is also enforced in the database — keep it in sync with
// supabase/daily_limit.sql (the "5" there).
export const DAILY_UMBRELLA_LIMIT = 5

// How many DIFFERENT members must mark a post "not relevant here" before it
// sinks to the bottom of the feed and shows up in the moderator queue.
// Keep in sync with supabase/relevance.sql.
export const OFF_TOPIC_THRESHOLD = 3

// How many stories each person can post per day.
// NOTE: also enforced in the database — keep in sync with supabase/story_limit.sql.
export const DAILY_STORY_LIMIT = 5

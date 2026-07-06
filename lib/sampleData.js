// Shown when Supabase isn't connected yet, so `npm run dev` works immediately.
// Shape matches the `stories` table in supabase/schema.sql.
export const SAMPLE_STORIES = [
  { id: 's1', author_name: 'quiet_tide', anonymous: false,
    text: "Tried out for the boys' volleyball team today. Half the guys laughed. I still went.",
    intent: 'listen', category: 'school', content_warning: false, umbrella_count: 41, created_at: '2026-07-03T10:00:00Z' },
  { id: 's2', author_name: 'paperboats', anonymous: false,
    text: "How do you tell your friends something about yourself when you're scared it changes everything?",
    intent: 'advice', category: 'identity', content_warning: true, umbrella_count: 18, created_at: '2026-07-04T09:00:00Z' },
  { id: 's3', author_name: 'northwind', anonymous: false,
    text: "Wore the pink hoodie I've been too scared to wear. Nobody said anything. The fear was louder than anyone else.",
    intent: 'similar', category: 'wins', content_warning: false, umbrella_count: 63, created_at: '2026-07-04T12:00:00Z' },
  { id: 's4', author_name: null, anonymous: true,
    text: "Everyone thinks I'm the strong one. I'm so tired of being the strong one. Just needed to put that somewhere.",
    intent: 'listen', category: 'mind', content_warning: true, umbrella_count: 88, created_at: '2026-07-04T20:00:00Z' }
]

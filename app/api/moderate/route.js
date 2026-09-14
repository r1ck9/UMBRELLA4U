import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// Only signed-in members may call this. Otherwise it's a free, unmetered
// proxy to our OpenAI key for anyone on the internet.
const MAX_CHARS = 5000
async function signedInUser(req) {
  const match = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!match || !url || !anon) return null
  const sb = createClient(url, anon, { auth: { persistSession: false } })
  const { data } = await sb.auth.getUser(match[1])
  return data?.user || null
}

// Free AI content moderation via OpenAI's moderation endpoint (omni-moderation-latest).
// Runs server-side so the key is never exposed to the browser. No-ops (allows the
// post) until OPENAI_API_KEY is set — the DB keyword trigger + reporting still guard.
//
// IMPORTANT: we deliberately do NOT block self-harm / sadness. Someone sharing their
// own dark feelings needs support, not rejection (the crisis overlay handles that).
// We only block content that harms OTHER people.
const BLOCK_CATEGORIES = [
  'hate',
  'hate/threatening',
  'harassment',
  'harassment/threatening',
  'sexual/minors'
]

const DOX_PROMPT = `You are a safety filter for an anonymous peer-support app for youth. Decide if the message reveals PERSONAL IDENTIFYING INFORMATION that could identify a real person — the author or someone else.

Flag (dox: true) if it contains:
- a real person's full name together with identifying details (their school, town, team, workplace)
- a home or street address
- a phone number or personal email presented as someone's contact
- social-media handles or profile links meant to identify or reach a specific person ("add me on snap @...", "I'm @... on insta")

Do NOT flag (dox: false):
- first names alone, or feelings, or general struggles
- broad locations like a country or city ("Canada", "Vancouver")
- crisis hotline numbers or public resource links
- anything that doesn't actually pin down a specific real individual

Respond ONLY with JSON: {"dox": true} or {"dox": false}.`

export async function POST(req) {
  if (!(await signedInUser(req))) return Response.json({ error: 'unauthorized' }, { status: 401 })

  let text = ''
  try { ({ text } = await req.json()) } catch {}
  if (typeof text !== 'string') text = ''
  if (text.length > MAX_CHARS) return Response.json({ allowed: false, reason: 'too_long', configured: true }, { status: 413 })
  if (!text || !text.trim()) return Response.json({ allowed: true, configured: false })

  const key = process.env.OPENAI_API_KEY
  if (!key) return Response.json({ allowed: true, configured: false })

  try {
    const r = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text })
    })
    const data = await r.json()
    const result = data && data.results && data.results[0]
    if (!result) {
      console.error('moderation: unexpected OpenAI response', r.status, JSON.stringify(data).slice(0, 300))
      return Response.json({ allowed: true, configured: true, error: true })
    }

    const cats = result.categories || {}
    const hit = BLOCK_CATEGORIES.find((c) => cats[c])
    if (hit) return Response.json({ allowed: false, reason: hit, configured: true })

    // Second pass: doxxing / personal-identifying info (categories can't catch this).
    // A tiny, cheap LLM call. Fails open on any error.
    try {
      const dr = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gpt-4o-mini', temperature: 0, response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: DOX_PROMPT },
            { role: 'user', content: text }
          ]
        })
      })
      const dj = await dr.json()
      const content = dj && dj.choices && dj.choices[0] && dj.choices[0].message && dj.choices[0].message.content
      if (content) {
        const parsed = JSON.parse(content)
        if (parsed && parsed.dox === true) return Response.json({ allowed: false, reason: 'doxxing', configured: true })
      }
    } catch (e) { /* fail open — reminders + humans catch the rest */ }

    return Response.json({ allowed: true, reason: '', configured: true })
  } catch (e) {
    // Fail open: if moderation errors, don't block the user. The DB keyword trigger
    // and the report queue are the backstops.
    console.error('moderation error:', e && e.message)
    return Response.json({ allowed: true, configured: true, error: true })
  }
}

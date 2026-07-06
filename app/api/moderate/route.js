export const runtime = 'nodejs'

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

export async function POST(req) {
  let text = ''
  try { ({ text } = await req.json()) } catch {}
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
    return Response.json({ allowed: !hit, reason: hit || '', configured: true })
  } catch (e) {
    // Fail open: if moderation errors, don't block the user. The DB keyword trigger
    // and the report queue are the backstops.
    console.error('moderation error:', e && e.message)
    return Response.json({ allowed: true, configured: true, error: true })
  }
}

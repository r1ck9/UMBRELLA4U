import { adminSupabase } from '@/lib/supabaseAdmin'
import { WEEKLY_PROMPT } from '@/lib/prompt'

export const dynamic = 'force-dynamic'

// Daily notification job. Vercel Cron calls this once a day (see vercel.json)
// and includes "Authorization: Bearer $CRON_SECRET" automatically when the
// CRON_SECRET env var is set. Each member gets AT MOST ONE email per run, by
// priority:
//   1. digest      — new umbrellas arrived on your stories (being seen)
//   2. prompt       — a new weekly prompt just went up (a reason to come back)
//   3. welcome-back — no activity for 2+ weeks (at most once every 30 days)
// Plus: alert the moderator email about new reports.
const FROM = process.env.NOTIFY_FROM || 'Umbrella <hello@yourdomain.com>'
const MOD_EMAIL = process.env.MODERATOR_ALERT_EMAIL || 'ricky.chenruiqi@gmail.com'
const SITE = process.env.SITE_URL || 'https://umbrella.app'

const DAY = 24 * 3600 * 1000
const DIGEST_GAP = 20 * 3600 * 1000   // never more than ~once a day
const INACTIVE = 14 * DAY             // "no activity for 2 straight weeks"
const REENGAGE_COOLDOWN = 30 * DAY    // welcome-back at most once a month

async function sendEmail(to, subject, html) {
  const key = process.env.RESEND_API_KEY
  if (!key) return { skipped: true }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to, subject, html })
  })
  return res.ok ? { ok: true } : { ok: false, status: res.status }
}

const shell = (body) =>
  `<div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a1a">
     <div style="font-family:Georgia,serif;font-size:20px;font-weight:bold;color:#3f6fa3;margin-bottom:14px">☂ Umbrella</div>
     ${body}
     <p style="font-size:12px;color:#8a8a86;margin-top:22px">You get these because notifications are on. Turn them off anytime in Settings.</p>
   </div>`

const btn = (href, label, color = '#3f6fa3') =>
  `<a href="${href}" style="display:inline-block;background:${color};color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:bold;font-size:14px">${label}</a>`

const digestHtml = (n) => shell(
  `<p style="font-size:15px;line-height:1.6">Someone stood with you. You have <b>${n}</b> new umbrella${n === '1' ? '' : 's'} waiting on your stories. 🫂</p>
   ${btn(`${SITE}/inbox`, 'Open your inbox ☂')}`)

const promptHtml = (text) => shell(
  `<p style="font-size:15px;line-height:1.6">This week’s prompt is up:</p>
   <p style="font-size:16px;line-height:1.5;font-family:Georgia,serif;color:#1a1a1a;border-left:3px solid #3f6fa3;padding-left:12px;margin:12px 0">${text}</p>
   <p style="font-size:15px;line-height:1.6">Share your answer — someone out there feels the same.</p>
   ${btn(`${SITE}/feed`, 'Answer this week’s prompt ☂')}`)

const reengageHtml = () => shell(
  `<p style="font-size:15px;line-height:1.6">It’s been a little while. However your weather is lately, there’s still a place for you here, and people who’ll stand with you.</p>
   ${btn(`${SITE}/feed`, 'Come back in ☂')}`)

const reportHtml = (n) => shell(
  `<p style="font-size:15px;line-height:1.6"><b>${n}</b> new report${n === 1 ? '' : 's'} need review on Umbrella.</p>
   ${btn(`${SITE}/moderation`, 'Open the moderation queue 🛑', '#c0392b')}`)

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  const url = new URL(request.url)
  const ok = !secret ||
    request.headers.get('authorization') === `Bearer ${secret}` ||
    url.searchParams.get('secret') === secret
  if (!ok) return new Response('unauthorized', { status: 401 })
  const sb = adminSupabase()
  if (!sb) return Response.json({ error: 'admin not configured (missing SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 })

  const now = Date.now()
  const out = { digests: 0, prompts: 0, reengaged: 0, reports: 0 }

  // Has the weekly prompt changed since we last announced it?
  const { data: setting } = await sb.from('app_settings').select('value').eq('key', 'last_prompt_key').maybeSingle()
  const promptChanged = (setting?.value ?? null) !== WEEKLY_PROMPT.key

  // emails keyed by user id
  const { data: usersData } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailById = {}
  ;(usersData?.users || []).forEach((u) => { if (u.email) emailById[u.id] = u.email })

  const { data: profiles } = await sb.from('profiles')
    .select('id,last_notified_at,last_active_date,last_reengaged_at,created_at')
    .eq('notify_email', true)

  for (const p of (profiles || [])) {
    const email = emailById[p.id]
    if (!email) continue
    let sent = false

    // 1) DIGEST — new umbrellas on my stories since the last digest
    const sinceDigest = p.last_notified_at ? new Date(p.last_notified_at).getTime() : 0
    if (now - sinceDigest >= DIGEST_GAP) {
      const { data: mine } = await sb.from('story_authors').select('story_id').eq('author_id', p.id)
      const ids = (mine || []).map((s) => s.story_id)
      let count = 0
      if (ids.length) {
        const { count: c } = await sb.from('umbrellas')
          .select('*', { count: 'exact', head: true })
          .in('story_id', ids).neq('user_id', p.id)
          .gt('created_at', new Date(sinceDigest).toISOString())
        count = c || 0
      }
      if (count > 0) {
        await sendEmail(email, `You have ${count > 50 ? '50+' : count} new umbrella${count === 1 ? '' : 's'} ☂`, digestHtml(count > 50 ? '50+' : String(count)))
        await sb.from('profiles').update({ last_notified_at: new Date(now).toISOString() }).eq('id', p.id)
        out.digests++; sent = true
      }
    }

    // 2) NEW WEEKLY PROMPT — a gentle reason to come back
    if (!sent && promptChanged) {
      await sendEmail(email, 'A new weekly prompt is up ☂', promptHtml(WEEKLY_PROMPT.text))
      await sb.from('profiles').update({ last_notified_at: new Date(now).toISOString() }).eq('id', p.id)
      out.prompts++; sent = true
    }

    // 3) WELCOME BACK — no activity for 2+ weeks, at most once every 30 days
    if (!sent) {
      const created = p.created_at ? new Date(p.created_at).getTime() : 0
      const lastActive = p.last_active_date ? new Date(p.last_active_date + 'T00:00:00Z').getTime() : 0
      const inactiveFor = lastActive ? now - lastActive : (created ? now - created : 0)
      const accountAge = created ? now - created : 0
      const reeng = p.last_reengaged_at ? new Date(p.last_reengaged_at).getTime() : 0
      const reengageOk = !reeng || now - reeng >= REENGAGE_COOLDOWN
      if (accountAge >= INACTIVE && inactiveFor >= INACTIVE && reengageOk) {
        await sendEmail(email, 'It’s been a while ☂', reengageHtml())
        await sb.from('profiles').update({
          last_reengaged_at: new Date(now).toISOString(),
          last_notified_at: new Date(now).toISOString()
        }).eq('id', p.id)
        out.reengaged++; sent = true
      }
    }
  }

  // Mark this prompt as announced so we don't email about it again.
  if (promptChanged) {
    await sb.from('app_settings').upsert({ key: 'last_prompt_key', value: WEEKLY_PROMPT.key })
  }

  // moderator report alerts
  const { data: marker } = await sb.from('site_metrics').select('value').eq('key', 'last_report_alert').maybeSingle()
  const lastReport = marker?.value ? Number(marker.value) : 0
  const { data: reps } = await sb.from('reports').select('id')
    .eq('status', 'open').gt('created_at', new Date(lastReport).toISOString())
  if ((reps || []).length) {
    await sendEmail(MOD_EMAIL, `🛑 ${reps.length} new report${reps.length === 1 ? '' : 's'} on Umbrella`, reportHtml(reps.length))
    await sb.from('site_metrics').upsert({ key: 'last_report_alert', value: now })
    out.reports = reps.length
  }

  return Response.json({ ok: true, ...out })
}

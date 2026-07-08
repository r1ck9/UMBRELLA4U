import { adminSupabase } from '@/lib/supabaseAdmin'

export const dynamic = 'force-dynamic'

// Daily notification job. Vercel Cron calls this once a day (see vercel.json)
// and includes "Authorization: Bearer $CRON_SECRET" automatically when the
// CRON_SECRET env var is set. It:
//   1. emails each member a digest if new umbrellas arrived since we last
//      emailed them (at most ~once per day, so no spam)
//   2. re-engages members we haven't emailed in 14+ days
//   3. alerts the moderator email about new reports
const FROM = process.env.NOTIFY_FROM || 'Umbrella <hello@yourdomain.com>'
const MOD_EMAIL = process.env.MODERATOR_ALERT_EMAIL || 'ricky.chenruiqi@gmail.com'
const SITE = process.env.SITE_URL || 'https://umbrella.app'

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

const digestHtml = (n) => shell(
  `<p style="font-size:15px;line-height:1.6">Someone stood with you. You have <b>${n}</b> new umbrella${n === '1' ? '' : 's'} waiting on your stories. 🫂</p>
   <a href="${SITE}/inbox" style="display:inline-block;background:#3f6fa3;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:bold;font-size:14px">Open your inbox ☂</a>`)

const reengageHtml = () => shell(
  `<p style="font-size:15px;line-height:1.6">It’s been a little while. However your weather is lately, there’s still a place for you here, and people who’ll stand with you.</p>
   <a href="${SITE}/feed" style="display:inline-block;background:#3f6fa3;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:bold;font-size:14px">Come back in ☂</a>`)

const reportHtml = (n) => shell(
  `<p style="font-size:15px;line-height:1.6"><b>${n}</b> new report${n === 1 ? '' : 's'} need review on Umbrella.</p>
   <a href="${SITE}/moderation" style="display:inline-block;background:#c0392b;color:#fff;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:bold;font-size:14px">Open the moderation queue 🛑</a>`)

export async function GET(request) {
  const secret = process.env.CRON_SECRET
  if (secret && request.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('unauthorized', { status: 401 })
  }
  const sb = adminSupabase()
  if (!sb) return Response.json({ error: 'admin not configured (missing SUPABASE_SERVICE_ROLE_KEY)' }, { status: 500 })

  const now = Date.now()
  const out = { digests: 0, reengaged: 0, reports: 0 }

  // emails keyed by user id
  const { data: usersData } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const emailById = {}
  ;(usersData?.users || []).forEach((u) => { if (u.email) emailById[u.id] = u.email })

  const { data: profiles } = await sb.from('profiles').select('id,last_notified_at').eq('notify_email', true)
  for (const p of (profiles || [])) {
    const email = emailById[p.id]
    if (!email) continue
    const since = p.last_notified_at ? new Date(p.last_notified_at).getTime() : 0
    if (now - since < 20 * 3600 * 1000) continue // never more than ~once a day

    const { data: mine } = await sb.from('stories').select('id').eq('author_id', p.id)
    const ids = (mine || []).map((s) => s.id)
    let count = 0
    if (ids.length) {
      const { count: c } = await sb.from('umbrellas')
        .select('*', { count: 'exact', head: true })
        .in('story_id', ids).neq('user_id', p.id)
        .gt('created_at', new Date(since).toISOString())
      count = c || 0
    }

    if (count > 0) {
      await sendEmail(email, `You have ${count > 50 ? '50+' : count} new umbrella${count === 1 ? '' : 's'} ☂`, digestHtml(count > 50 ? '50+' : String(count)))
      await sb.from('profiles').update({ last_notified_at: new Date(now).toISOString() }).eq('id', p.id)
      out.digests++
    } else if (since > 0 && now - since > 14 * 24 * 3600 * 1000) {
      await sendEmail(email, 'It’s been a while ☂', reengageHtml())
      await sb.from('profiles').update({ last_notified_at: new Date(now).toISOString() }).eq('id', p.id)
      out.reengaged++
    }
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

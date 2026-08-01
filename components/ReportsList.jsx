'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'
import { OFF_TOPIC_THRESHOLD } from '@/lib/config'
import { giphyImageUrl } from '@/lib/giphy'

export default function ReportsList() {
  const [state, setState] = useState({ loading: true, isMod: false, items: [], flagged: [] })

  async function load() {
    if (!supabase) { setState({ loading: false, isMod: false, items: [], flagged: [] }); return }
    const me = await getMe()
    if (!me.isModerator) { setState({ loading: false, isMod: false, items: [], flagged: [] }); return }

    // Explicit reports (someone hit "Report")
    const { data: reports } = await supabase.from('reports')
      .select('id,target_id,reason,created_at')
      .eq('status', 'open').eq('target_type', 'story')
      .order('created_at', { ascending: false })

    const ids = [...new Set((reports || []).map((r) => r.target_id))]
    const byId = {}
    if (ids.length) {
      const { data: stories } = await supabase.from('stories').select('id,text,category,anonymous,giphy_id').in('id', ids)
      ;(stories || []).forEach((s) => { byId[s.id] = s })
    }
    const grouped = {}
    ;(reports || []).forEach((r) => { (grouped[r.target_id] = grouped[r.target_id] || []).push(r) })
    const items = Object.keys(grouped)
      .map((sid) => ({ story: byId[sid], count: grouped[sid].length }))
      .filter((it) => it.story) // skip already-deleted stories

    // Community-flagged (enough members marked "not relevant here")
    const { data: flagged } = await supabase.from('stories')
      .select('id,text,category,anonymous,off_topic_count,giphy_id')
      .eq('state', 'live').gte('off_topic_count', OFF_TOPIC_THRESHOLD)
      .order('off_topic_count', { ascending: false })

    setState({ loading: false, isMod: true, items, flagged: flagged || [] })
  }

  useEffect(() => { load() }, [])

  async function takedown(story) {
    if (!window.confirm('Take this story down for everyone?')) return
    await supabase.from('stories').delete().eq('id', story.id)
    await supabase.from('reports').update({ status: 'actioned' }).eq('target_id', story.id).eq('status', 'open')
    load()
  }
  async function dismissReport(story) {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('target_id', story.id).eq('status', 'open')
    load()
  }
  async function keepFlagged(story) {
    // Clear the community marks so the post returns to normal ranking.
    await supabase.rpc('dismiss_relevance', { sid: story.id })
    load()
  }

  if (state.loading) return <p className="empty">Loading…</p>
  if (!state.isMod) return <p className="empty">This page is for moderators only.</p>
  if (state.items.length === 0 && state.flagged.length === 0)
    return <p className="empty">Nothing to review. 🌤️ All clear.</p>

  return (
    <div className="inbox-list">
      {state.items.map((it, i) => (
        <div className="ibx new" key={'r' + i}>
          <div className="ibx-orig">
            <div className="l">🛑 {it.count} report{it.count !== 1 ? 's' : ''} · {it.story.category}{it.story.anonymous ? ' · anonymous' : ''}</div>
            <p>&ldquo;{it.story.text}&rdquo;</p>
            {giphyImageUrl(it.story.giphy_id) && <img className="mod-giphy" src={giphyImageUrl(it.story.giphy_id)} alt="Reported story GIF" />}
          </div>
          <div className="row end" style={{ gap: 10 }}>
            <button className="btn ghost sm" onClick={() => dismissReport(it.story)}>Dismiss</button>
            <button className="btn prim sm" onClick={() => takedown(it.story)}>🛑 Take down</button>
          </div>
        </div>
      ))}

      {state.flagged.length > 0 && (
        <p className="sub" style={{ color: 'var(--ink-3)', margin: '18px 0 2px', fontWeight: 600 }}>
          Marked &ldquo;not relevant&rdquo; by the community
        </p>
      )}
      {state.flagged.map((s, i) => (
        <div className="ibx new" key={'f' + i}>
          <div className="ibx-orig">
            <div className="l">👥 {s.off_topic_count} members marked off-topic · {s.category}{s.anonymous ? ' · anonymous' : ''}</div>
            <p>&ldquo;{s.text}&rdquo;</p>
            {giphyImageUrl(s.giphy_id) && <img className="mod-giphy" src={giphyImageUrl(s.giphy_id)} alt="Flagged story GIF" />}
          </div>
          <div className="row end" style={{ gap: 10 }}>
            <button className="btn ghost sm" onClick={() => keepFlagged(s)}>Keep it</button>
            <button className="btn prim sm" onClick={() => takedown(s)}>🛑 Take down</button>
          </div>
        </div>
      ))}
    </div>
  )
}

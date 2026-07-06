'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getMe } from '@/lib/me'

export default function ReportsList() {
  const [state, setState] = useState({ loading: true, isMod: false, items: [] })

  async function load() {
    if (!supabase) { setState({ loading: false, isMod: false, items: [] }); return }
    const me = await getMe()
    if (!me.isModerator) { setState({ loading: false, isMod: false, items: [] }); return }

    const { data: reports } = await supabase.from('reports')
      .select('id,target_id,reason,created_at')
      .eq('status', 'open').eq('target_type', 'story')
      .order('created_at', { ascending: false })

    const ids = [...new Set((reports || []).map((r) => r.target_id))]
    const byId = {}
    if (ids.length) {
      const { data: stories } = await supabase.from('stories').select('id,text,category,anonymous').in('id', ids)
      ;(stories || []).forEach((s) => { byId[s.id] = s })
    }
    const grouped = {}
    ;(reports || []).forEach((r) => { (grouped[r.target_id] = grouped[r.target_id] || []).push(r) })
    const items = Object.keys(grouped)
      .map((sid) => ({ story: byId[sid], count: grouped[sid].length }))
      .filter((it) => it.story) // skip already-deleted stories
    setState({ loading: false, isMod: true, items })
  }

  useEffect(() => { load() }, [])

  async function takedown(item) {
    if (!window.confirm('Take this story down for everyone and resolve its reports?')) return
    await supabase.from('stories').delete().eq('id', item.story.id)
    await supabase.from('reports').update({ status: 'actioned' }).eq('target_id', item.story.id).eq('status', 'open')
    load()
  }
  async function dismiss(item) {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('target_id', item.story.id).eq('status', 'open')
    load()
  }

  if (state.loading) return <p className="empty">Loading…</p>
  if (!state.isMod) return <p className="empty">This page is for moderators only.</p>
  if (state.items.length === 0) return <p className="empty">No open reports. 🌤️ All clear.</p>

  return (
    <div className="inbox-list">
      {state.items.map((it, i) => (
        <div className="ibx new" key={i}>
          <div className="ibx-orig">
            <div className="l">● {it.count} report{it.count !== 1 ? 's' : ''} · {it.story.category}{it.story.anonymous ? ' · anonymous' : ''}</div>
            <p>&ldquo;{it.story.text}&rdquo;</p>
          </div>
          <div className="row end" style={{ gap: 10 }}>
            <button className="btn ghost sm" onClick={() => dismiss(it)}>Dismiss</button>
            <button className="btn prim sm" onClick={() => takedown(it)}>🛑 Take down</button>
          </div>
        </div>
      ))}
    </div>
  )
}

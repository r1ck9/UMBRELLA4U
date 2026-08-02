'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function ago(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

async function authHeaders() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function AvatarReviewQueue() {
  const [state, setState] = useState({ loading: true, allowed: true, items: [] })
  const [busy, setBusy] = useState(null)

  useEffect(() => {
    ;(async () => {
      const headers = await authHeaders()
      if (!headers) { setState({ loading: false, allowed: false, items: [] }); return }
      const response = await fetch('/api/moderation/avatars', { headers, cache: 'no-store' })
      if (!response.ok) { setState({ loading: false, allowed: false, items: [] }); return }
      const body = await response.json()
      setState({ loading: false, allowed: true, items: body.items || [] })
    })()
  }, [])

  async function decide(submissionId, decision) {
    const label = decision === 'approved' ? 'Approve this profile photo?' : 'Deny this profile photo?'
    if (!window.confirm(label)) return
    setBusy(submissionId)
    const headers = await authHeaders()
    const response = headers ? await fetch('/api/moderation/avatars', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ submission_id: submissionId, decision }),
    }) : null
    setBusy(null)
    if (!response?.ok) {
      const body = await response?.json().catch(() => ({}))
      alert(body?.error || 'Could not save that decision.')
      return
    }
    setState((current) => ({
      ...current,
      items: current.items.filter((item) => item.id !== submissionId),
    }))
  }

  if (state.loading) return <p className="empty">Loading profile photo queue...</p>
  if (!state.allowed) return null
  if (!state.items.length) return <p className="empty">No profile photos waiting for review.</p>

  return (
    <div className="media-review-list avatar-review-list">
      {state.items.map((item) => (
        <article className="media-review-card avatar-review-card" key={item.id}>
          <div className="media-review-meta">Profile photo · {ago(item.created_at)}</div>
          <p>{item.display_name || item.username || 'Haven member'}{item.username ? ` · @${item.username}` : ''}</p>
          <img className="media-review-image avatar-review-image" src={item.preview_url}
            alt="Profile photo awaiting moderator review" />
          <div className="media-review-actions">
            <button type="button" className="btn ghost sm" disabled={busy === item.id}
              onClick={() => decide(item.id, 'rejected')}>Deny</button>
            <button type="button" className="btn prim sm" disabled={busy === item.id}
              onClick={() => decide(item.id, 'approved')}>
              {busy === item.id ? 'Saving...' : 'Approve photo'}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

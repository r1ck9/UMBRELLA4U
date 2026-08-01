'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { giphyImageUrl } from '@/lib/giphy'
import StoryPhoto from '@/components/StoryPhoto'
import GiphyAttribution from '@/components/GiphyAttribution'

function ago(iso) {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

async function authHeaders() {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  const token = data?.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : null
}

export default function MediaReviewQueue() {
  const [state, setState] = useState({ loading: true, allowed: true, items: [] })
  const [busy, setBusy] = useState(null)

  async function load() {
    const headers = await authHeaders()
    if (!headers) { setState({ loading: false, allowed: false, items: [] }); return }
    const response = await fetch('/api/moderation/media', { headers, cache: 'no-store' })
    if (!response.ok) { setState({ loading: false, allowed: false, items: [] }); return }
    const body = await response.json()
    setState({ loading: false, allowed: true, items: body.items || [] })
  }

  useEffect(() => { load() }, [])

  async function decide(storyId, decision) {
    const verb = decision === 'approved' ? 'publish' : 'deny'
    if (!window.confirm(`${verb === 'publish' ? 'Approve and publish' : 'Deny'} this media post?`)) return
    setBusy(storyId)
    const headers = await authHeaders()
    const response = headers ? await fetch('/api/moderation/media', {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ story_id: storyId, decision }),
    }) : null
    setBusy(null)
    if (!response?.ok) {
      const body = await response?.json().catch(() => ({}))
      alert(body?.error || 'Could not save that decision.')
      return
    }
    setState((current) => ({ ...current, items: current.items.filter((item) => item.id !== storyId) }))
  }

  if (state.loading) return <p className="empty">Loading media review queue…</p>
  if (!state.allowed) return null
  if (!state.items.length) return <p className="empty">No photos or GIFs waiting for review.</p>

  return (
    <div className="media-review-list">
      {state.items.map((story) => (
        <article className="media-review-card" key={story.id}>
          <div className="media-review-meta">
            {story.photo_path ? '📷 Photo' : 'GIF'} · {story.category}
            {story.anonymous ? ' · anonymous' : ''} · {ago(story.created_at)}
          </div>
          <p>{story.text}</p>
          {story.photo_path ? (
            <StoryPhoto path={story.photo_path} className="media-review-image" alt="Uploaded photo awaiting moderator review" />
          ) : (
            <figure className="media-review-giphy">
              <img src={giphyImageUrl(story.giphy_id)} alt="GIF awaiting moderator review" />
              <figcaption><GiphyAttribution className="giphy-attribution-card" /></figcaption>
            </figure>
          )}
          <div className="media-review-actions">
            <button type="button" className="btn ghost sm" disabled={busy === story.id}
              onClick={() => decide(story.id, 'rejected')}>Deny</button>
            <button type="button" className="btn prim sm" disabled={busy === story.id}
              onClick={() => decide(story.id, 'approved')}>
              {busy === story.id ? 'Saving…' : 'Approve & publish'}
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'
import { giphyImageUrl, GIPHY_ID_PATTERN } from '@/lib/giphy'
import GiphyAttribution from '@/components/GiphyAttribution'

const API_KEY = process.env.NEXT_PUBLIC_GIPHY_API_KEY
const RESULT_LIMIT = 18

function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function safeResult(item) {
  const id = String(item?.id || '')
  const preview = item?.images?.fixed_width_small?.webp
    || item?.images?.fixed_width_small?.url
    || item?.images?.fixed_width?.webp
    || item?.images?.fixed_width?.url
  if (!GIPHY_ID_PATTERN.test(id) || String(item?.rating || '').toLowerCase() !== 'g' || !preview) return null
  return { id, preview }
}

export default function GiphyPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestRef = useRef(null)

  async function load(term = '') {
    if (!API_KEY) {
      setError('GIPHY needs to be connected before GIFs can be searched.')
      return
    }
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    setLoading(true)
    setError('')
    try {
      const search = term.trim()
      const endpoint = search ? 'search' : 'trending'
      const params = new URLSearchParams({
        api_key: API_KEY,
        limit: String(RESULT_LIMIT),
        rating: 'g',
        bundle: 'messaging_non_clips',
        remove_low_contrast: 'true',
      })
      if (search) params.set('q', search.slice(0, 50))
      else params.set('offset', String(Math.floor(Math.random() * 120)))
      const pageLanguage = document.documentElement.lang?.split('-')[0]
      if (search && pageLanguage) params.set('lang', pageLanguage)
      const response = await fetch(`https://api.giphy.com/v1/gifs/${endpoint}?${params}`, { signal: controller.signal })
      if (!response.ok) throw new Error('GIPHY search is unavailable right now.')
      const payload = await response.json()
      const safe = shuffle((payload?.data || []).map(safeResult).filter(Boolean))
      setItems(safe)
      if (!safe.length) setError(search ? 'No safe GIFs found. Try another search.' : 'No safe GIFs are available right now.')
    } catch (err) {
      if (err?.name !== 'AbortError') setError(err?.message || 'GIPHY search is unavailable right now.')
    } finally {
      if (requestRef.current === controller) setLoading(false)
    }
  }

  useEffect(() => () => requestRef.current?.abort(), [])

  function showPicker() {
    setOpen(true)
    if (!items.length && !loading) void load('')
  }

  function search(e) {
    e.preventDefault()
    void load(query)
  }

  if (value) {
    return (
      <div className="giphy-selected">
        <img src={giphyImageUrl(value)} alt="Selected GIPHY GIF" />
        <div className="giphy-selected-actions">
          <GiphyAttribution className="giphy-attribution-selected" />
          <button type="button" onClick={showPicker}>Change</button>
          <button type="button" onClick={() => { onChange(null); setOpen(false) }}>Remove</button>
        </div>
        {open && renderPanel()}
      </div>
    )
  }

  function renderPanel() {
    return (
      <div className="giphy-panel">
        <div className="giphy-head">
          <b>Choose a safe GIF</b>
          <button type="button" className="giphy-close" onClick={() => setOpen(false)} aria-label="Close GIF picker">✕</button>
        </div>
        <form className="giphy-search" onSubmit={search}>
          <input value={query} onChange={(e) => setQuery(e.target.value)} maxLength={50}
            placeholder="Search reactions, feelings, animals…" aria-label="Search GIPHY" />
          <button type="submit" disabled={loading}>{loading ? 'Searching…' : 'Search'}</button>
        </form>
        <p className="giphy-safety">Only G-rated results are shown.</p>
        {error && <p className="giphy-error">{error}</p>}
        <div className="giphy-grid" aria-live="polite" aria-busy={loading}>
          {items.map((gif) => (
            <button type="button" key={gif.id} onClick={() => { onChange(gif.id); setOpen(false) }} aria-label="Attach this GIF">
              <img src={gif.preview} alt="" loading="lazy" decoding="async" />
            </button>
          ))}
        </div>
        <GiphyAttribution className="giphy-attribution-picker" />
      </div>
    )
  }

  return (
    <div className="giphy-add">
      <button type="button" className="giphy-toggle" onClick={open ? () => setOpen(false) : showPicker}>GIF · Add from GIPHY</button>
      {open && renderPanel()}
    </div>
  )
}

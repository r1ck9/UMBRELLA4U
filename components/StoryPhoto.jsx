'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function StoryPhoto({ path, alt = 'Photo attached to this story', className = '' }) {
  const [url, setUrl] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let active = true
    setUrl('')
    setFailed(false)
    if (!supabase || !path) return () => { active = false }

    supabase.storage.from('story-media').createSignedUrl(path, 15 * 60)
      .then(({ data, error }) => {
        if (!active) return
        if (error || !data?.signedUrl) setFailed(true)
        else setUrl(data.signedUrl)
      })
    return () => { active = false }
  }, [path])

  if (!path) return null
  if (failed) return <div className={'story-photo-unavailable ' + className}>Photo unavailable</div>
  if (!url) return <div className={'story-photo-loading ' + className} aria-label="Loading photo" />
  return <img className={className} src={url} alt={alt} loading="lazy" decoding="async" />
}

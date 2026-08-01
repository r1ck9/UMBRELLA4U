'use client'

import { useRef, useState } from 'react'
import { prepareStoryPhoto } from '@/lib/photoUpload'

export default function PhotoPicker({ value, onChange }) {
  const uploadRef = useRef(null)
  const cameraRef = useRef(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function choose(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const prepared = await prepareStoryPhoto(file)
      const previewUrl = URL.createObjectURL(prepared.blob)
      onChange({ ...prepared, previewUrl })
    } catch (e) {
      setError(e.message || 'That photo could not be added.')
    } finally {
      setBusy(false)
    }
  }

  function remove() {
    if (value?.previewUrl) URL.revokeObjectURL(value.previewUrl)
    onChange(null)
  }

  if (value) {
    return (
      <div className="photo-selected">
        <img src={value.previewUrl} alt="Selected photo preview" />
        <div className="photo-selected-actions">
          <span>Photo ready · location metadata removed</span>
          <button type="button" onClick={remove}>Remove</button>
        </div>
      </div>
    )
  }

  return (
    <div className="photo-add">
      <input ref={uploadRef} className="photo-file-input" type="file"
        accept="image/jpeg,image/png,image/webp" onChange={choose} />
      <input ref={cameraRef} className="photo-file-input" type="file"
        accept="image/jpeg,image/png,image/webp" capture="environment" onChange={choose} />
      <div className="photo-actions">
        <button type="button" className="photo-toggle" disabled={busy}
          onClick={() => uploadRef.current?.click()}>{busy ? 'Preparing…' : 'Photo · Upload'}</button>
        <button type="button" className="photo-toggle" disabled={busy}
          onClick={() => cameraRef.current?.click()}>Camera · Take photo</button>
      </div>
      {error && <p className="photo-error">{error}</p>}
    </div>
  )
}

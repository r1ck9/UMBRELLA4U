'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { prepareProfilePhoto } from '@/lib/photoUpload'

export default function ProfilePhotoPicker({ userId }) {
  const uploadRef = useRef(null)
  const cameraRef = useRef(null)
  const [selected, setSelected] = useState(null)
  const [pending, setPending] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    if (!supabase || !userId) { setLoading(false); return () => { active = false } }

    ;(async () => {
      const { data } = await supabase.from('profile_avatar_submissions')
        .select('id,photo_path,status,created_at')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .maybeSingle()
      if (!active) return

      if (data?.photo_path) {
        const { data: signed } = await supabase.storage.from('avatars')
          .createSignedUrl(data.photo_path, 15 * 60)
        if (active) setPending({ ...data, previewUrl: signed?.signedUrl || '' })
      }
      if (active) setLoading(false)
    })()

    return () => { active = false }
  }, [userId])

  useEffect(() => () => {
    if (selected?.previewUrl) URL.revokeObjectURL(selected.previewUrl)
  }, [selected])

  async function choose(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setBusy(true)
    setError('')
    try {
      const prepared = await prepareProfilePhoto(file)
      if (selected?.previewUrl) URL.revokeObjectURL(selected.previewUrl)
      setSelected({ ...prepared, previewUrl: URL.createObjectURL(prepared.blob) })
    } catch (e) {
      setError(e.message || 'That photo could not be added.')
    } finally {
      setBusy(false)
    }
  }

  function clearSelected() {
    if (selected?.previewUrl) URL.revokeObjectURL(selected.previewUrl)
    setSelected(null)
    setError('')
  }

  async function submit() {
    if (!supabase || !selected || !userId || busy) return
    setBusy(true)
    setError('')
    const photoPath = `${userId}/${crypto.randomUUID()}.${selected.ext}`

    const { data: submission, error: insertError } = await supabase
      .from('profile_avatar_submissions')
      .insert({ user_id: userId, photo_path: photoPath })
      .select('id,photo_path,status,created_at')
      .single()

    if (insertError) {
      setBusy(false)
      setError(/pending/i.test(insertError.message)
        ? 'You already have a profile photo waiting for review.'
        : insertError.message)
      return
    }

    const { error: uploadError } = await supabase.storage.from('avatars')
      .upload(photoPath, selected.blob, {
        cacheControl: '3600',
        contentType: selected.contentType,
        upsert: false,
      })

    if (uploadError) {
      await supabase.from('profile_avatar_submissions').delete().eq('id', submission.id)
      setBusy(false)
      setError(uploadError.message || 'The photo could not be uploaded.')
      return
    }

    const { data: signed } = await supabase.storage.from('avatars')
      .createSignedUrl(photoPath, 15 * 60)
    setPending({ ...submission, previewUrl: signed?.signedUrl || '' })
    setSelected(null)
    setBusy(false)
  }

  async function withdraw() {
    if (!supabase || !pending || busy) return
    setBusy(true)
    setError('')
    const { error: storageError } = await supabase.storage.from('avatars').remove([pending.photo_path])
    if (storageError) {
      setBusy(false)
      setError(storageError.message || 'The pending photo could not be removed.')
      return
    }
    const { error: rowError } = await supabase.from('profile_avatar_submissions')
      .delete().eq('id', pending.id).eq('status', 'pending')
    setBusy(false)
    if (rowError) { setError(rowError.message); return }
    setPending(null)
  }

  if (loading) return <p className="avatar-photo-status">Checking for pending photos...</p>

  if (pending) {
    return (
      <div className="avatar-photo-pending">
        {pending.previewUrl
          ? <img src={pending.previewUrl} alt="Your profile photo awaiting moderator review" />
          : <div className="avatar-photo-placeholder">Photo awaiting review</div>}
        <div>
          <strong>Waiting for moderator review</strong>
          <p>Your current profile picture stays visible until this photo is approved.</p>
          <button type="button" className="up-btn" disabled={busy} onClick={withdraw}>
            {busy ? 'Removing...' : 'Remove submission'}
          </button>
        </div>
        {error && <p className="photo-error" role="alert">{error}</p>}
      </div>
    )
  }

  return (
    <div className="avatar-photo-picker">
      <input ref={uploadRef} className="photo-file-input" type="file"
        accept="image/jpeg,image/png,image/webp" onChange={choose} />
      <input ref={cameraRef} className="photo-file-input" type="file"
        accept="image/jpeg,image/png,image/webp" capture="user" onChange={choose} />

      {selected ? (
        <div className="avatar-photo-selected">
          <img src={selected.previewUrl} alt="Selected profile photo preview" />
          <div>
            <strong>Ready to submit</strong>
            <p>Square crop ready. Location and camera metadata were removed.</p>
            <div className="avatar-photo-actions">
              <button type="button" className="up-btn" disabled={busy} onClick={clearSelected}>Choose another</button>
              <button type="button" className="btn prim sm" disabled={busy} onClick={submit}>
                {busy ? 'Uploading...' : 'Submit for review'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="avatar-photo-actions">
          <button type="button" className="up-btn" disabled={busy}
            onClick={() => uploadRef.current?.click()}>{busy ? 'Preparing...' : 'Upload photo'}</button>
          <button type="button" className="up-btn" disabled={busy}
            onClick={() => cameraRef.current?.click()}>Take photo</button>
        </div>
      )}
      <p className="avatar-photo-status">Photos are checked by a moderator before becoming your profile picture.</p>
      {error && <p className="photo-error" role="alert">{error}</p>}
    </div>
  )
}

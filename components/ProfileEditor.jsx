'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BANNERS, bannerStyle } from '@/lib/banners'
import EmojiPicker from '@/components/EmojiPicker'
import { PROFILE_ACCENTS, accentName, accentStyle, normalizeAccent } from '@/lib/palette'

const BIO_EXAMPLES = [
  'Volleyball, playlists on repeat, and still figuring it out.',
  'Art kid. Overthinker. Trying to be kinder to myself.',
  'Loves rainy days, bad puns, and my dog. Here to listen.',
  'Just a teen navigating school, friends, and everything in between.',
  'Books over parties. Anxiety is loud, but so is my hope.',
]

const STATUS_EXAMPLES = [
  'Heavy but managing',
  'Better than yesterday',
  'Slowly growing',
  'Riding the waves',
  'Tired but hopeful',
]

const pick = (items) => items[Math.floor(Math.random() * items.length)]

export default function ProfileEditor({ profile, userId, onChange }) {
  const [saveState, setSaveState] = useState('idle')
  const [saveError, setSaveError] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [placeholders] = useState(() => ({ bio: pick(BIO_EXAMPLES), status: pick(STATUS_EXAMPLES) }))
  const saveRevision = useRef(0)

  function set(key, value) {
    saveRevision.current += 1
    onChange(key, value)
    setSaveError('')
    setSaveState('pending')
  }

  function addTag() {
    const tag = tagInput.trim().replace(/^#/, '').slice(0, 20)
    const tags = profile.tags || []
    if (tag && !tags.includes(tag) && tags.length < 8) set('tags', [...tags, tag])
    setTagInput('')
  }

  function removeTag(tag) {
    set('tags', (profile.tags || []).filter((item) => item !== tag))
  }

  useEffect(() => {
    if (!supabase || !userId || saveState !== 'pending') return
    const revision = saveRevision.current
    const update = {
      display_name: profile.display_name || '',
      pronouns: profile.pronouns || '',
      status_weather: profile.status_weather || '',
      about_me: profile.about_me || '',
      accent_color: normalizeAccent(profile.accent_color),
      avatar_url: profile.avatar_url || '',
      banner_theme: profile.banner_theme || 'rain',
      tags: profile.tags || [],
    }
    const timer = setTimeout(async () => {
      setSaveState('saving')
      const { data, error } = await supabase.from('profiles')
        .update(update).eq('id', userId).select('id').maybeSingle()
      if (revision !== saveRevision.current) return
      if (error || !data) {
        const message = error?.message || 'Your profile could not be saved. Please try again.'
        setSaveError(/blocked_content/i.test(message)
          ? "Some of your profile text isn't allowed. Please remove any hurtful or unsafe words."
          : message)
        setSaveState('error')
        return
      }
      setSaveError('')
      setSaveState('saved')
    }, 500)
    return () => clearTimeout(timer)
  }, [profile, saveState, userId])

  return (
    <div className="pf-edit" id="profile-editor">
      <div className="pf-edit-head">
        <h3>Edit profile</h3>
        <span className={'profile-autosave ' + saveState} aria-live="polite">
          {saveState === 'pending' || saveState === 'saving'
            ? 'Saving...'
            : saveState === 'saved'
              ? 'Saved automatically'
              : saveState === 'error' ? "Couldn't save" : 'Changes save automatically'}
        </span>
      </div>
      <div className="pform">
        <label>Avatar emoji
          <EmojiPicker value={profile.avatar_url || ''} accent={profile.accent_color}
            onSelect={(emoji) => set('avatar_url', 'emoji:' + emoji)} />
        </label>
        <p className="up-note">To use a photo instead, close the editor and tap your profile picture.</p>

        <label>Display name
          <input value={profile.display_name || ''} maxLength={30}
            onChange={(event) => set('display_name', event.target.value)} placeholder={profile.username} />
        </label>
        <label>Pronouns
          <input value={profile.pronouns || ''} maxLength={30}
            onChange={(event) => set('pronouns', event.target.value)} placeholder="they/them (optional)" />
        </label>
        <label>Today&apos;s weather (status)
          <input value={profile.status_weather || ''} maxLength={60}
            onChange={(event) => set('status_weather', event.target.value)} placeholder={placeholders.status} />
        </label>
        <label>About me
          <textarea value={profile.about_me || ''} maxLength={300}
            onChange={(event) => set('about_me', event.target.value)} placeholder={`e.g. ${placeholders.bio}`} />
        </label>
        <p className="privacy-note">Do not put your real name, school, or address here. Combining identifying details can reveal who you are.</p>
        <label>Accent color
          <div className="swatches">
            {PROFILE_ACCENTS.map((color) => (
              <button key={color} type="button" title={accentName(color)}
                className={'sw' + (normalizeAccent(profile.accent_color) === color ? ' on' : '')}
                style={accentStyle(color)} onClick={() => set('accent_color', color)} aria-label={accentName(color)} />
            ))}
          </div>
        </label>
        <label>Banner
          <div className="swatches bnset">
            {BANNERS.map((banner) => (
              <button key={banner.key} type="button" title={banner.name}
                className={'sw bn' + ((profile.banner_theme || 'rain') === banner.key ? ' on' : '')}
                style={bannerStyle(banner.key)} onClick={() => set('banner_theme', banner.key)} aria-label={banner.name} />
            ))}
          </div>
        </label>
        <label>Interests / tags
          <div className="tag-edit">
            {(profile.tags || []).map((tag) => (
              <button key={tag} type="button" className="tag rm" onClick={() => removeTag(tag)}>{tag} x</button>
            ))}
            {(profile.tags || []).length < 8 && (
              <input className="tag-input" value={tagInput} maxLength={20}
                onChange={(event) => setTagInput(event.target.value)}
                onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); addTag() } }}
                onBlur={addTag} placeholder="+ add a tag (Enter)" />
            )}
          </div>
        </label>
        {saveError && <p className="profile-save-error" role="alert">{saveError}</p>}
      </div>
    </div>
  )
}

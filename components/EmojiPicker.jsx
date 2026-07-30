'use client'
import { useState } from 'react'
import { EMOJI_GROUPS } from '@/lib/emojis'
import { accentStyle } from '@/lib/palette'

// Avatar-emoji chooser. Shows the current pick; tap it to open a scrollable
// grid of the full set. `value` is the stored "emoji:X" string.
export default function EmojiPicker({ value, accent, onSelect }) {
  const [open, setOpen] = useState(false)
  const current = value?.startsWith('emoji:') ? value.slice(6) : null

  return (
    <div className="emoji-pick">
      <div className="emoji-row">
        <button type="button" className="emoji-current" style={accentStyle(accent)}
          onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Choose your emoji">
          {current || '☂'}
        </button>
        <span className="emoji-hint">{open ? 'Pick one below' : 'Tap to choose any emoji'}</span>
      </div>

      {open && (
        <div className="emoji-panel">
          {EMOJI_GROUPS.map((g) => (
            <div key={g.name} className="emoji-group">
              <div className="emoji-gname">{g.name}</div>
              <div className="emoji-grid">
                {g.emojis.map((e) => (
                  <button type="button" key={e} className={'emoji-cell' + (current === e ? ' on' : '')}
                    onClick={() => { onSelect(e); setOpen(false) }}>{e}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

'use client'
import { useEffect, useState } from 'react'
import { GUIDELINES } from '@/lib/guidelines'

// Mounted once globally (in layout). Opens when anything dispatches
// window event "umbrella:guidelines", so any button can pop it up.
export default function GuidelinesModal() {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const onOpen = () => setOpen(true)
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('umbrella:guidelines', onOpen)
    window.addEventListener('keydown', onKey)
    return () => { window.removeEventListener('umbrella:guidelines', onOpen); window.removeEventListener('keydown', onKey) }
  }, [])
  if (!open) return null
  return (
    <div className="modal-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}>
      <div className="modal-box" role="dialog" aria-label="Community guidelines">
        <h2>Community guidelines</h2>
        <p className="ms-sub">This place only works because the people in it keep it that way.</p>
        <ol className="rulelist">
          {GUIDELINES.map((r, i) => <li key={i}>{r.t}</li>)}
        </ol>
        <button className="btn prim" onClick={() => setOpen(false)}>Got it</button>
      </div>
    </div>
  )
}

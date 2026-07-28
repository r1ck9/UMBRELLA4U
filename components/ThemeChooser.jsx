'use client'
import { useEffect, useState } from 'react'
import { THEMES, THEME_KEY } from '@/lib/themes'

// Live color-theme picker. Applies instantly and remembers the choice.
export default function ThemeChooser() {
  const [cur, setCur] = useState('ink')

  useEffect(() => {
    try {
      const saved = localStorage.getItem(THEME_KEY)
      if (THEMES.some((theme) => theme.key === saved)) setCur(saved)
      else if (saved) localStorage.removeItem(THEME_KEY)
    } catch {}
  }, [])

  function choose(key) {
    setCur(key)
    try {
      if (key === 'ink') {
        localStorage.removeItem(THEME_KEY)
        document.documentElement.removeAttribute('data-ui-theme')
      } else {
        localStorage.setItem(THEME_KEY, key)
        document.documentElement.setAttribute('data-ui-theme', key)
      }
    } catch {}
  }

  return (
    <div className="theme-choose">
      {THEMES.map((t) => (
        <button key={t.key} type="button" className={'theme-card' + (cur === t.key ? ' on' : '')}
          onClick={() => choose(t.key)} aria-pressed={cur === t.key}>
          <span className="tc-swatch" style={{ background: t.accent }}>{cur === t.key ? '✓' : ''}</span>
          <span className="tc-meta"><b>{t.name}</b><em>{t.note}</em></span>
        </button>
      ))}
    </div>
  )
}

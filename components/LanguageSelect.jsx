'use client'

import { useEffect, useState } from 'react'

const LANGUAGES = [
  ['en', 'English'],
  ['fr', 'Français'],
  ['zh-CN', '中文'],
  ['es', 'Español'],
  ['ar', 'العربية'],
  ['hi', 'हिन्दी'],
  ['pa', 'ਪੰਜਾਬੀ'],
  ['ko', '한국어'],
  ['ja', '日本語'],
  ['fa', 'فارسی'],
  ['tl', 'Filipino'],
]

function currentLanguage() {
  if (typeof window === 'undefined') return 'en'
  return localStorage.getItem('umbrella_language') || 'en'
}

export default function LanguageSelect() {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    setLang(currentLanguage())
    window.UmbrellaI18n?.init?.()
  }, [])

  function changeLanguage(next) {
    setLang(next)
    localStorage.setItem('umbrella_language', next)
    window.UmbrellaI18n?.setLanguage?.(next)
  }

  return (
    <div className="language-wrap notranslate">
      <select
        className="language-select"
        data-language-select
        value={lang}
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label="Choose language"
      >
        {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
    </div>
  )
}

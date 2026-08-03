'use client'

import { useEffect, useState } from 'react'
import CustomSelect from '@/components/CustomSelect'

const LANGUAGES = [
  ['en', 'English', 'EN'],
  ['fr', 'Français', 'FR'],
  ['zh-CN', '中文', '中文'],
  ['es', 'Español', 'ES'],
  ['ar', 'العربية', 'AR'],
  ['hi', 'हिन्दी', 'HI'],
  ['pa', 'ਪੰਜਾਬੀ', 'PA'],
  ['ko', '한국어', 'KO'],
  ['ja', '日本語', 'JA'],
  ['fa', 'فارسی', 'FA'],
  ['tl', 'Filipino', 'TL'],
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
    const syncLanguage = (event) => setLang(event.detail?.language || currentLanguage())
    window.addEventListener('umbrella:languagechange', syncLanguage)
    return () => window.removeEventListener('umbrella:languagechange', syncLanguage)
  }, [])

  function changeLanguage(next) {
    setLang(next)
    localStorage.setItem('umbrella_language', next)
    window.UmbrellaI18n?.setLanguage?.(next)
  }

  return (
    <div className="language-wrap notranslate">
      <CustomSelect
        className="language-select-control"
        menuClassName="notranslate language-select-menu"
        options={LANGUAGES.map(([value, label, shortLabel]) => ({ value, label, shortLabel }))}
        value={lang}
        onChange={changeLanguage}
        ariaLabel="Choose language"
        align="end"
      />
    </div>
  )
}

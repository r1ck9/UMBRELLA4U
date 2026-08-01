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

function setTranslateCookie(lang) {
  const host = window.location.hostname
  const base = lang === 'en' ? '' : `/en/${lang}`
  const maxAge = lang === 'en' ? 'Max-Age=0' : 'Max-Age=31536000'
  document.cookie = `googtrans=${base}; Path=/; ${maxAge}; SameSite=Lax`
  if (host.includes('.')) {
    document.cookie = `googtrans=${base}; Path=/; Domain=.${host}; ${maxAge}; SameSite=Lax`
  }
}

function currentLanguage() {
  if (typeof document === 'undefined') return 'en'
  const match = document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/)
  return match?.[1] || localStorage.getItem('umbrella_language') || 'en'
}

export default function LanguageSelect() {
  const [lang, setLang] = useState('en')

  useEffect(() => {
    setLang(currentLanguage())

    if (!window.googleTranslateElementInit) {
      window.googleTranslateElementInit = function googleTranslateElementInit() {
        if (!window.google?.translate?.TranslateElement) return
        new window.google.translate.TranslateElement({
          pageLanguage: 'en',
          includedLanguages: LANGUAGES.map(([code]) => code).join(','),
          autoDisplay: false,
        }, 'google_translate_element')
      }
    }

    if (!document.querySelector('script[data-umbrella-translate]')) {
      const script = document.createElement('script')
      script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit'
      script.async = true
      script.dataset.umbrellaTranslate = 'true'
      document.body.appendChild(script)
    } else if (window.google?.translate?.TranslateElement) {
      window.googleTranslateElementInit()
    }
  }, [])

  function changeLanguage(next) {
    setLang(next)
    localStorage.setItem('umbrella_language', next)
    setTranslateCookie(next)

    const combo = document.querySelector('.goog-te-combo')
    if (combo && next !== 'en') {
      combo.value = next
      combo.dispatchEvent(new Event('change'))
      return
    }

    window.location.reload()
  }

  return (
    <div className="language-wrap">
      <select
        className="language-select"
        value={lang}
        onChange={(e) => changeLanguage(e.target.value)}
        aria-label="Choose language"
      >
        {LANGUAGES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
      </select>
      <div id="google_translate_element" aria-hidden="true" />
    </div>
  )
}

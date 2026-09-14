import './globals.css'
import { Fraunces, Nunito_Sans } from 'next/font/google'
import PageTransition from '@/components/PageTransition'
import Rain from '@/components/Rain'
import GuidelinesModal from '@/components/GuidelinesModal'
import UmbrellaBurst from '@/components/UmbrellaBurst'
import ViewCounter from '@/components/ViewCounter'
import FunnelTracker from '@/components/FunnelTracker'
import PushRegistrar from '@/components/PushRegistrar'
import { Analytics } from '@vercel/analytics/next'

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap'
})

const nunitoSans = Nunito_Sans({
  subsets: ['latin'],
  variable: '--font-nunito-sans',
  adjustFontFallback: false,
  display: 'swap'
})

export const metadata = {
  title: 'Haven · come in from the rain',
  description: "An anonymous place for young people to post what’s actually going on, and be met by someone who gets it.",
  icons: {
    icon: [
      { url: '/icon-192.png?v=20260813', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png?v=20260813', type: 'image/png', sizes: '512x512' }
    ],
    apple: '/apple-touch-icon.png?v=20260813',
    shortcut: '/icon-192.png?v=20260813'
  }
}

// Ensure phones render at device width so the responsive top-bar rules apply
// (some in-app browsers, e.g. Instagram, otherwise render at a wider default).
export const viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunitoSans.variable}`}>
      <head>
        <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png?v=20260813" />
        <link rel="shortcut icon" href="/icon-192.png?v=20260813" />
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#76509a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260813" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('umbrella_theme');if(t==='dusk')document.documentElement.setAttribute('data-ui-theme',t);else if(t)localStorage.removeItem('umbrella_theme')}catch(e){}" }} />
        <script src="/local-i18n.js" defer />
      </head>
      <body><Rain /><ViewCounter /><FunnelTracker /><PushRegistrar /><PageTransition>{children}</PageTransition><GuidelinesModal /><UmbrellaBurst /><Analytics /></body>
    </html>
  )
}

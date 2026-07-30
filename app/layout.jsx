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
  title: 'Haven, come in from the rain',
  description: "An anonymous space to share what you're carrying, and to know someone will stand with you."
}

// Ensure phones render at device width so the responsive top-bar rules apply
// (some in-app browsers, e.g. Instagram, otherwise render at a wider default).
export const viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${nunitoSans.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#76509a" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('umbrella_theme');if(t==='dusk')document.documentElement.setAttribute('data-ui-theme',t);else if(t)localStorage.removeItem('umbrella_theme')}catch(e){}" }} />
      </head>
      <body><Rain /><ViewCounter /><FunnelTracker /><PushRegistrar /><PageTransition>{children}</PageTransition><GuidelinesModal /><UmbrellaBurst /><Analytics /></body>
    </html>
  )
}

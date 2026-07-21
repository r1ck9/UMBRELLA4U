import './globals.css'
import Rain from '@/components/Rain'
import GuidelinesModal from '@/components/GuidelinesModal'
import UmbrellaBurst from '@/components/UmbrellaBurst'
import ViewCounter from '@/components/ViewCounter'
import FunnelTracker from '@/components/FunnelTracker'
import PushRegistrar from '@/components/PushRegistrar'
import { Analytics } from '@vercel/analytics/next'

export const metadata = {
  title: 'Haven, come in from the rain',
  description: "An anonymous space to share what you're carrying, and to know someone will stand with you."
}

// Ensure phones render at device width so the responsive top-bar rules apply
// (some in-app browsers, e.g. Instagram, otherwise render at a wider default).
export const viewport = { width: 'device-width', initialScale: 1 }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{var t=localStorage.getItem('umbrella_theme');if(t)document.documentElement.setAttribute('data-ui-theme',t)}catch(e){}" }} />
      </head>
      <body><Rain /><ViewCounter /><FunnelTracker /><PushRegistrar />{children}<GuidelinesModal /><UmbrellaBurst /><Analytics /></body>
    </html>
  )
}

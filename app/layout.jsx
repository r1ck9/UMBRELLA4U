import './globals.css'
import Rain from '@/components/Rain'
import GuidelinesModal from '@/components/GuidelinesModal'
import UmbrellaBurst from '@/components/UmbrellaBurst'

export const metadata = {
  title: 'Umbrella — come in from the rain',
  description: "An anonymous space to share what you're carrying — and to know someone will stand with you."
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body><Rain />{children}<GuidelinesModal /><UmbrellaBurst /></body>
    </html>
  )
}

'use client'
import { usePathname, useRouter } from 'next/navigation'

// Replays the feed tour. If already on the feed, fire the event; otherwise
// navigate to the feed with ?tour=1 so it starts on arrival.
export default function TourButton({ className }) {
  const pathname = usePathname()
  const router = useRouter()
  function go() {
    if (pathname === '/feed') window.dispatchEvent(new CustomEvent('umbrella:start-tour'))
    else router.push('/feed?tour=1')
  }
  return <button className={className} onClick={go}>Take a tour</button>
}

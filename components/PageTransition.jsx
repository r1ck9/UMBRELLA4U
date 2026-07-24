'use client'
import { usePathname } from 'next/navigation'

// Replays a fade-up whenever the route changes. The key remounts the subtree on
// navigation (Next already remounts pages on nav, so this adds no extra churn),
// which restarts the CSS animation. Cross-document loads use the View
// Transitions API in globals.css instead.
export default function PageTransition({ children }) {
  const pathname = usePathname()
  return <div key={pathname} className="route-fade">{children}</div>
}

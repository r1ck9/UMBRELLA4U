'use client'

// A nav item that pops up the guidelines modal instead of navigating.
export default function GuidelinesButton({ className }) {
  return (
    <button type="button" className={className}
      onClick={() => window.dispatchEvent(new Event('umbrella:guidelines'))}>
      Community guidelines
    </button>
  )
}

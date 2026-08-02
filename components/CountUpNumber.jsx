'use client'

import { useEffect, useMemo, useRef } from 'react'

function fractionDigits(value, maximumFractionDigits) {
  if (typeof maximumFractionDigits === 'number') return maximumFractionDigits
  if (Number.isInteger(value)) return 0
  const decimals = String(value).split('.')[1]?.length || 0
  return Math.min(2, decimals)
}

// Animates text directly so large feeds do not re-render every card on every frame.
export default function CountUpNumber({
  value,
  duration = 480,
  className,
  minimumFractionDigits = 0,
  maximumFractionDigits,
  initialValue,
}) {
  const target = Number.isFinite(Number(value)) ? Number(value) : 0
  const initial = Number.isFinite(Number(initialValue)) ? Number(initialValue) : 0
  const digits = fractionDigits(target, maximumFractionDigits)
  const formatter = useMemo(() => new Intl.NumberFormat(undefined, {
    minimumFractionDigits: Math.min(minimumFractionDigits, digits),
    maximumFractionDigits: digits,
  }), [digits, minimumFractionDigits])
  const elementRef = useRef(null)
  const displayedRef = useRef(initial)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return
    const from = displayedRef.current
    const difference = target - from
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (!difference || reducedMotion) {
      displayedRef.current = target
      element.textContent = formatter.format(target)
      return
    }

    let frame
    let started
    const tick = (now) => {
      if (started === undefined) started = now
      const progress = Math.min(1, (now - started) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      const next = from + difference * eased
      const rounded = digits ? Number(next.toFixed(digits)) : Math.round(next)
      displayedRef.current = rounded
      element.textContent = formatter.format(rounded)
      if (progress < 1) frame = requestAnimationFrame(tick)
      else displayedRef.current = target
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [digits, duration, formatter, target])

  return (
    <span ref={elementRef} className={className} aria-label={formatter.format(target)}>
      {formatter.format(displayedRef.current)}
    </span>
  )
}

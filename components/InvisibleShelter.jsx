'use client'

import { useEffect, useRef } from 'react'

const TAU = Math.PI * 2

const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const smoothstep = (value) => {
  const t = clamp(value)
  return t * t * (3 - 2 * t)
}

export default function InvisibleShelter() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let width = 0
    let height = 0
    let dpr = 1
    let animationFrame
    let lastTime = 0
    let elapsed = 0
    let rain = []

    // A seeded random function keeps the composition stable after resizing.
    let seed = 41027
    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 4294967296
    }

    const people = Array.from({ length: 12 }, (_, index) => {
      const angle = random() * TAU
      const radius = Math.sqrt(random()) * 0.68
      const startAngle = random() * TAU

      return {
        targetX: Math.cos(angle) * radius,
        targetY: Math.sin(angle) * radius * 0.68 + 0.08,
        startX: Math.cos(startAngle) * (1.3 + random() * 0.45),
        startY: Math.sin(startAngle) * (1.1 + random() * 0.35),
        size: 1.8 + random() * 2.4,
        delay: index * 0.42 + random() * 0.25,
        phase: random() * TAU,
      }
    })

    function getShelter() {
      const mobile = width < 760
      const radiusX = mobile
        ? Math.min(width * 0.36, 190)
        : Math.min(width * 0.225, 285)
      const radiusY = mobile
        ? Math.min(height * 0.17, 125)
        : Math.min(height * 0.255, 220)

      return {
        mobile,
        x: mobile ? width * 0.5 : width * 0.76,
        y: mobile ? height * 0.31 : height * 0.51,
        radiusX,
        radiusY,
      }
    }

    function createDrop(fromTop = false) {
      return {
        x: random() * width,
        y: fromTop ? -40 - random() * height * 0.3 : random() * height,
        velocityX: -8 + random() * 16,
        velocityY: 320 + random() * 360,
        length: 14 + random() * 30,
        opacity: 0.07 + random() * 0.18,
        width: 0.65 + random() * 0.75,
      }
    }

    function resetRain() {
      seed = 41027
      const count = Math.min(190, Math.max(80, Math.floor((width * height) / 7600)))
      rain = Array.from({ length: count }, () => createDrop(false))
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = canvas.clientWidth
      height = canvas.clientHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      resetRain()
    }

    function drawBackground(shelter, time) {
      const coolX = width * 0.47 + Math.sin(time * 0.08) * width * 0.1
      const coolY = height * 0.28 + Math.cos(time * 0.06) * height * 0.07
      const ambient = ctx.createRadialGradient(
        coolX,
        coolY,
        0,
        coolX,
        coolY,
        Math.max(width, height) * 0.68,
      )
      ambient.addColorStop(0, 'rgba(115, 150, 205, 0.11)')
      ambient.addColorStop(1, 'rgba(115, 150, 205, 0)')
      ctx.fillStyle = ambient
      ctx.fillRect(0, 0, width, height)

      const warmGlow = ctx.createRadialGradient(
        shelter.x,
        shelter.y,
        0,
        shelter.x,
        shelter.y,
        shelter.radiusX * 1.85,
      )
      warmGlow.addColorStop(0, 'rgba(244, 174, 91, 0.18)')
      warmGlow.addColorStop(0.48, 'rgba(222, 145, 71, 0.065)')
      warmGlow.addColorStop(1, 'rgba(222, 145, 71, 0)')
      ctx.fillStyle = warmGlow
      ctx.fillRect(0, 0, width, height)
    }

    function updateAndDrawRain(shelter, delta) {
      ctx.lineCap = 'round'

      for (const drop of rain) {
        const previousX = drop.x
        const previousY = drop.y
        const normalizedX = (drop.x - shelter.x) / shelter.radiusX
        const normalizedY = (drop.y - shelter.y) / shelter.radiusY
        const distance = Math.hypot(normalizedX, normalizedY)

        // Rain is pushed sideways as it reaches the invisible boundary.
        if (distance < 1.28 && drop.y < shelter.y + shelter.radiusY * 0.92) {
          const boundaryStrength = 1 - clamp((distance - 0.86) / 0.42)
          const side = normalizedX === 0 ? (drop.velocityX < 0 ? -1 : 1) : Math.sign(normalizedX)
          drop.velocityX += side * boundaryStrength * 760 * delta
          drop.velocityY -= boundaryStrength * 145 * delta
        }

        drop.velocityX *= Math.pow(0.987, delta * 60)
        drop.x += drop.velocityX * delta
        drop.y += drop.velocityY * delta

        const nextNormalizedX = (drop.x - shelter.x) / shelter.radiusX
        const nextNormalizedY = (drop.y - shelter.y) / shelter.radiusY
        const nextDistance = Math.hypot(nextNormalizedX, nextNormalizedY)
        const fadeAtEdge = clamp((nextDistance - 0.88) / 0.2)

        if (fadeAtEdge > 0.015) {
          ctx.strokeStyle = `rgba(184, 207, 238, ${drop.opacity * fadeAtEdge})`
          ctx.lineWidth = drop.width
          ctx.beginPath()
          ctx.moveTo(drop.x, drop.y)
          ctx.lineTo(
            previousX - drop.velocityX * 0.015 - 1.4,
            previousY - drop.length,
          )
          ctx.stroke()
        }

        if (
          drop.y > height + drop.length + 30 ||
          drop.x < -100 ||
          drop.x > width + 100
        ) {
          Object.assign(drop, createDrop(true))
        }
      }
    }

    function drawShelter(shelter, time) {
      // A soft pool of light gives the protected space a visual floor.
      const floorY = shelter.y + shelter.radiusY * 0.72
      const floorGlow = ctx.createRadialGradient(
        shelter.x,
        floorY,
        0,
        shelter.x,
        floorY,
        shelter.radiusX * 1.05,
      )
      floorGlow.addColorStop(0, 'rgba(246, 186, 112, 0.15)')
      floorGlow.addColorStop(0.55, 'rgba(246, 186, 112, 0.045)')
      floorGlow.addColorStop(1, 'rgba(246, 186, 112, 0)')
      ctx.fillStyle = floorGlow
      ctx.beginPath()
      ctx.ellipse(
        shelter.x,
        floorY,
        shelter.radiusX * 1.04,
        shelter.radiusY * 0.28,
        0,
        0,
        TAU,
      )
      ctx.fill()

      // The shelter is only suggested by a dim upper rim, never drawn as an umbrella.
      const pulse = 0.5 + Math.sin(time * 0.7) * 0.5
      ctx.save()
      ctx.strokeStyle = `rgba(246, 190, 119, ${0.11 + pulse * 0.045})`
      ctx.lineWidth = 1.2
      ctx.shadowColor = 'rgba(246, 176, 92, 0.35)'
      ctx.shadowBlur = 18 + pulse * 8
      ctx.beginPath()
      ctx.ellipse(
        shelter.x,
        shelter.y,
        shelter.radiusX,
        shelter.radiusY,
        0,
        Math.PI * 1.04,
        Math.PI * 1.96,
      )
      ctx.stroke()
      ctx.restore()

      for (const person of people) {
        const arrival = smoothstep((time - person.delay) / 3.3)
        const x = shelter.x + (
          person.startX + (person.targetX - person.startX) * arrival
        ) * shelter.radiusX
        const y = shelter.y + (
          person.startY + (person.targetY - person.startY) * arrival
        ) * shelter.radiusY
        const shimmer = 0.68 + Math.sin(time * 1.35 + person.phase) * 0.22
        const visibility = clamp((time - person.delay) / 0.65)
        const haloRadius = person.size * (4.5 + shimmer)

        const halo = ctx.createRadialGradient(x, y, 0, x, y, haloRadius)
        halo.addColorStop(0, `rgba(255, 219, 164, ${0.42 * visibility})`)
        halo.addColorStop(1, 'rgba(255, 198, 118, 0)')
        ctx.fillStyle = halo
        ctx.beginPath()
        ctx.arc(x, y, haloRadius, 0, TAU)
        ctx.fill()

        ctx.fillStyle = `rgba(255, 229, 188, ${(0.72 + shimmer * 0.18) * visibility})`
        ctx.beginPath()
        ctx.arc(x, y, person.size, 0, TAU)
        ctx.fill()
      }
    }

    function drawVignette() {
      const vignette = ctx.createRadialGradient(
        width * 0.52,
        height * 0.42,
        Math.min(width, height) * 0.24,
        width * 0.52,
        height * 0.42,
        Math.max(width, height) * 0.82,
      )
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)')
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.42)')
      ctx.fillStyle = vignette
      ctx.fillRect(0, 0, width, height)
    }

    function render(time, delta = 0) {
      const shelter = getShelter()
      ctx.clearRect(0, 0, width, height)
      drawBackground(shelter, time)
      updateAndDrawRain(shelter, delta)
      drawShelter(shelter, time)
      drawVignette()
    }

    function animate(timestamp) {
      if (!lastTime) lastTime = timestamp
      const delta = Math.min((timestamp - lastTime) / 1000, 0.04)
      lastTime = timestamp
      elapsed += delta
      render(elapsed, delta)
      animationFrame = window.requestAnimationFrame(animate)
    }

    resize()
    window.addEventListener('resize', resize)

    if (reducedMotion) {
      elapsed = 10
      render(elapsed, 0)
    } else {
      animationFrame = window.requestAnimationFrame(animate)
    }

    return () => {
      window.cancelAnimationFrame(animationFrame)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="introcanvas" aria-hidden="true" />
}

export const PALETTE = Object.freeze({
  plum: '#24182f',
  violet: '#76509a',
  lilac: '#c49aea',
  lavender: '#d8b6f4',
  cloud: '#faf7ff',
})

export const PROFILE_ACCENT_OPTIONS = Object.freeze([
  { name: 'Crimson', color: '#c94b5f' },
  { name: 'Cherry', color: '#b43f68' },
  { name: 'Coral', color: '#e66a52' },
  { name: 'Orange', color: '#e58a3d' },
  { name: 'Gold', color: '#d4a72c' },
  { name: 'Sunshine', color: '#e2c63e' },
  { name: 'Lime', color: '#83b547' },
  { name: 'Leaf', color: '#3b9b63' },
  { name: 'Emerald', color: '#269782' },
  { name: 'Teal', color: '#278e9a' },
  { name: 'Cyan', color: '#3198bd' },
  { name: 'Sky', color: '#4b8fd6' },
  { name: 'Blue', color: '#5271c7' },
  { name: 'Indigo', color: '#5f58b8' },
  { name: 'Violet', color: PALETTE.violet },
  { name: 'Plum', color: PALETTE.plum },
  { name: 'Orchid', color: '#9b5ab3' },
  { name: 'Magenta', color: '#bd559d' },
  { name: 'Pink', color: '#d66791' },
  { name: 'Lilac', color: PALETTE.lilac },
  { name: 'Lavender', color: PALETTE.lavender },
  { name: 'Cloud', color: PALETTE.cloud },
])

export const PROFILE_ACCENTS = Object.freeze(PROFILE_ACCENT_OPTIONS.map(({ color }) => color))

const ACCENT_RGB = PROFILE_ACCENTS.map((color) => ({
  color,
  rgb: [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16)),
}))

export function normalizeAccent(value) {
  const color = String(value || '').trim().toLowerCase()
  if (PROFILE_ACCENTS.includes(color)) return color
  if (!/^#[0-9a-f]{6}$/.test(color)) return PALETTE.violet
  const source = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16))
  let closest = PALETTE.violet
  let distance = Infinity
  for (const { color: candidate, rgb: target } of ACCENT_RGB) {
    const next = source.reduce((sum, channel, index) => sum + (channel - target[index]) ** 2, 0)
    if (next < distance) {
      closest = candidate
      distance = next
    }
  }
  return closest
}

export function accentStyle(value) {
  const background = normalizeAccent(value)
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(background.slice(index, index + 2), 16))
  const darkText = (r * .299 + g * .587 + b * .114) > 155
  return {
    background,
    color: darkText ? PALETTE.plum : PALETTE.cloud,
    boxShadow: background === PALETTE.cloud ? `inset 0 0 0 1px ${PALETTE.violet}` : undefined,
  }
}

export function profileAccentStyle(value) {
  const accent = normalizeAccent(value)
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(accent.slice(index, index + 2), 16))
  const brightness = r * .299 + g * .587 + b * .114
  const accentInk = brightness > 155
    ? `rgb(${Math.round(r * .55)} ${Math.round(g * .55)} ${Math.round(b * .55)})`
    : accent
  return {
    '--profile-accent': accent,
    '--profile-accent-ink': accentInk,
    '--profile-on-accent': brightness > 155 ? PALETTE.plum : PALETTE.cloud,
  }
}

export function accentName(value) {
  const color = normalizeAccent(value)
  return PROFILE_ACCENT_OPTIONS.find((option) => option.color === color)?.name || 'Accent colour'
}

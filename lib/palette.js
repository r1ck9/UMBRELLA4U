export const PALETTE = Object.freeze({
  plum: '#24182f',
  violet: '#76509a',
  lilac: '#c49aea',
  lavender: '#d8b6f4',
  cloud: '#faf7ff',
})

export const PROFILE_ACCENTS = [
  PALETTE.violet,
  PALETTE.plum,
  PALETTE.lilac,
  PALETTE.lavender,
  PALETTE.cloud,
]

const RGB = Object.fromEntries(Object.entries(PALETTE).map(([key, value]) => [
  key,
  [1, 3, 5].map((index) => parseInt(value.slice(index, index + 2), 16)),
]))

export function normalizeAccent(value) {
  const color = String(value || '').trim().toLowerCase()
  if (PROFILE_ACCENTS.includes(color)) return color
  if (!/^#[0-9a-f]{6}$/.test(color)) return PALETTE.violet
  const source = [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16))
  let closest = 'violet'
  let distance = Infinity
  for (const [key, target] of Object.entries(RGB)) {
    const next = source.reduce((sum, channel, index) => sum + (channel - target[index]) ** 2, 0)
    if (next < distance) {
      closest = key
      distance = next
    }
  }
  return PALETTE[closest]
}

export function accentStyle(value) {
  const background = normalizeAccent(value)
  const darkText = background === PALETTE.lilac || background === PALETTE.lavender || background === PALETTE.cloud
  return {
    background,
    color: darkText ? PALETTE.plum : PALETTE.cloud,
    boxShadow: background === PALETTE.cloud ? `inset 0 0 0 1px ${PALETTE.violet}` : undefined,
  }
}

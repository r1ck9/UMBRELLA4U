// Built-in profile banner themes (weather/rain motifs). No uploads needed.
// Stored on profiles.banner_theme as the key; rendered via bannerStyle(key).
import { PALETTE } from './palette'

export const BANNERS = [
  { key: 'rain',  name: 'Rain',  css: `linear-gradient(120deg,${PALETTE.violet},${PALETTE.plum})` },
  { key: 'dusk',  name: 'Dusk',  css: `linear-gradient(120deg,${PALETTE.lilac},${PALETTE.plum})` },
  { key: 'storm', name: 'Storm', css: `linear-gradient(120deg,${PALETTE.plum},${PALETTE.violet})` },
  { key: 'calm',  name: 'Calm',  css: `linear-gradient(120deg,${PALETTE.lavender},${PALETTE.violet})` },
  { key: 'dawn',  name: 'Dawn',  css: `linear-gradient(120deg,${PALETTE.cloud},${PALETTE.lilac})` },
  { key: 'moss',  name: 'Mist',  css: `linear-gradient(120deg,${PALETTE.lilac},${PALETTE.violet})` }
]

export function bannerStyle(key) {
  const b = BANNERS.find((x) => x.key === key) || BANNERS[0]
  return { background: b.css }
}

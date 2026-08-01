// Built-in profile banner themes (weather/rain motifs). No uploads needed.
// Stored on profiles.banner_theme as the key; rendered via bannerStyle(key).
import { PALETTE } from './palette'

export const BANNERS = [
  { key: 'rain',  name: 'Rain',  css: `linear-gradient(120deg,${PALETTE.violet},${PALETTE.plum})` },
  { key: 'dusk',  name: 'Dusk',  css: `linear-gradient(120deg,${PALETTE.lilac},${PALETTE.plum})` },
  { key: 'storm', name: 'Storm', css: `linear-gradient(120deg,${PALETTE.plum},${PALETTE.violet})` },
  { key: 'calm',  name: 'Calm',  css: `linear-gradient(120deg,${PALETTE.lavender},${PALETTE.violet})` },
  { key: 'dawn',  name: 'Dawn',  css: `linear-gradient(120deg,${PALETTE.cloud},${PALETTE.lilac})` },
  { key: 'moss',  name: 'Mist',  css: `linear-gradient(120deg,${PALETTE.lilac},${PALETTE.violet})` },
  { key: 'cherry', name: 'Cherry', css: 'linear-gradient(120deg,#b43f68,#ef6b58)' },
  { key: 'sunset', name: 'Sunset', css: 'linear-gradient(120deg,#ef7546,#d85f9e)' },
  { key: 'sunshine', name: 'Sunshine', css: 'linear-gradient(120deg,#f2d24d,#ed8f3d)' },
  { key: 'citrus', name: 'Citrus', css: 'linear-gradient(120deg,#d8cf43,#70bd4e)' },
  { key: 'meadow', name: 'Meadow', css: 'linear-gradient(120deg,#43b66a,#9bd34f)' },
  { key: 'forest', name: 'Forest', css: 'linear-gradient(120deg,#1f775c,#45a884)' },
  { key: 'lagoon', name: 'Lagoon', css: 'linear-gradient(120deg,#1f948e,#45b8c7)' },
  { key: 'sky', name: 'Sky', css: 'linear-gradient(120deg,#56b4dc,#557dd1)' },
  { key: 'ocean', name: 'Ocean', css: 'linear-gradient(120deg,#3469b8,#303d88)' },
  { key: 'aurora', name: 'Aurora', css: 'linear-gradient(120deg,#34b980,#3aa8c9 48%,#8b5cc4)' },
  { key: 'candy', name: 'Cotton candy', css: 'linear-gradient(120deg,#e77aac,#7aa9ef)' },
  { key: 'prism', name: 'Full rainbow', css: 'linear-gradient(105deg,#d94c5f,#ed8b3f,#e2c63e,#42a767,#369bb8,#596ac2,#a457ad)' }
]

export function bannerStyle(key) {
  const b = BANNERS.find((x) => x.key === key) || BANNERS[0]
  return { background: b.css }
}

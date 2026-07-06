// Built-in profile banner themes (weather/rain motifs). No uploads needed.
// Stored on profiles.banner_theme as the key; rendered via bannerStyle(key).
export const BANNERS = [
  { key: 'rain',  name: 'Rain',  css: 'linear-gradient(120deg,#3f6fa3,#26344e)' },
  { key: 'dusk',  name: 'Dusk',  css: 'linear-gradient(120deg,#c8506a,#3b2a52)' },
  { key: 'storm', name: 'Storm', css: 'linear-gradient(120deg,#4a5568,#1c2230)' },
  { key: 'calm',  name: 'Calm',  css: 'linear-gradient(120deg,#3f9d9d,#25506a)' },
  { key: 'dawn',  name: 'Dawn',  css: 'linear-gradient(120deg,#e8913c,#a44e73)' },
  { key: 'moss',  name: 'Moss',  css: 'linear-gradient(120deg,#3f9d78,#274d43)' }
]

export function bannerStyle(key) {
  const b = BANNERS.find((x) => x.key === key) || BANNERS[0]
  return { background: b.css }
}

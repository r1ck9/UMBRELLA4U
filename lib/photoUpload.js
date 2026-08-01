const INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const MAX_INPUT_BYTES = 20 * 1024 * 1024
const MAX_EDGE = 1800

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That photo could not be opened.')) }
    img.src = url
  })
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

// Re-drawing the selected image strips EXIF metadata (including GPS) before
// anything leaves the device, while also keeping uploads fast on mobile.
export async function prepareStoryPhoto(file) {
  if (!file || !INPUT_TYPES.has(file.type)) {
    throw new Error('Choose a JPEG, PNG, or WebP photo.')
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new Error('That photo is too large. Choose one under 20 MB.')
  }

  const image = await loadImage(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.max(1, Math.round(image.naturalWidth * scale))
  const height = Math.max(1, Math.round(image.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('This browser could not prepare the photo.')
  context.fillStyle = '#fff'
  context.fillRect(0, 0, width, height)
  context.drawImage(image, 0, 0, width, height)

  let blob = await canvasBlob(canvas, 'image/webp', 0.84)
  let ext = 'webp'
  if (!blob || blob.type !== 'image/webp') {
    blob = await canvasBlob(canvas, 'image/jpeg', 0.86)
    ext = 'jpg'
  }
  if (!blob) throw new Error('This browser could not prepare the photo.')
  if (blob.size > 5 * 1024 * 1024) {
    throw new Error('That photo is still too large after resizing. Try a smaller one.')
  }

  return { blob, ext, contentType: blob.type, width, height }
}

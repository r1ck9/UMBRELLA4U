export const GIPHY_ID_PATTERN = /^[A-Za-z0-9_-]{1,80}$/

export function giphyImageUrl(id) {
  return GIPHY_ID_PATTERN.test(id || '')
    ? `https://media.giphy.com/media/${id}/giphy.gif`
    : ''
}

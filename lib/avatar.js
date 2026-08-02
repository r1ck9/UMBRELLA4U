const CUSTOM_AVATAR = /^avatar:([0-9a-f-]{36})\/([0-9a-f-]{36}\.(?:webp|jpg))$/i

export function avatarImageUrl(value = '') {
  const match = value.match(CUSTOM_AVATAR)
  if (match) {
    return `/api/avatar/${encodeURIComponent(match[1])}/${encodeURIComponent(match[2])}`
  }
  return /^https?:\/\//i.test(value) ? value : ''
}

export function avatarStyle(value, fallbackStyle) {
  const imageUrl = avatarImageUrl(value)
  return imageUrl ? { backgroundImage: `url(${imageUrl})` } : fallbackStyle
}

// The shared nine-point post-weather scale. Existing five-point values are
// migrated to the even-numbered positions so old posts keep their meaning.
export const POST_WEATHERS = Object.freeze([
  { v: 0, e: '⛈️', l: 'Heavy rain', need: 50 },
  { v: 1, e: '🌧️', l: 'Steady rain', need: 43 },
  { v: 2, e: '🌧️', l: 'Rain', need: 35 },
  { v: 3, e: '🌦️', l: 'Light rain', need: 29 },
  { v: 4, e: '☁️', l: 'Cloudy', need: 22 },
  { v: 5, e: '🌥️', l: 'Brightening', need: 17 },
  { v: 6, e: '⛅', l: 'Partly sunny', need: 12 },
  { v: 7, e: '🌤️', l: 'Mostly sunny', need: 10 },
  { v: 8, e: '☀️', l: 'Sunny', need: 8 },
])

export const WEATHER_MAX = POST_WEATHERS.length - 1
export const DEFAULT_WEATHER = 4

export function weatherTarget(value, fallback = 50) {
  const index = Number(value)
  return Number.isInteger(index) && index >= 0 && index <= WEATHER_MAX
    ? POST_WEATHERS[index].need
    : fallback
}

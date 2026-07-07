// User-selectable color themes. 'ink' is the default (no attribute set, so it
// keeps the auto light/dark accent). The rest map to :root[data-ui-theme="…"]
// rules in globals.css.
export const THEMES = [
  { key: 'ink',    name: 'Ink',    accent: '#3f6fa3', note: 'Calm editorial blue · default' },
  { key: 'rose',   name: 'Rose',   accent: '#c8506a', note: 'Warm and gentle' },
  { key: 'forest', name: 'Forest', accent: '#3f9d78', note: 'Grounded green' },
  { key: 'dusk',   name: 'Dusk',   accent: '#8b6fc9', note: 'Soft twilight purple' },
  { key: 'amber',  name: 'Amber',  accent: '#e0894a', note: 'Warm sunset' },
  { key: 'teal',   name: 'Teal',   accent: '#3f9d9d', note: 'Cool and clear' }
]
export const THEME_KEY = 'umbrella_theme'

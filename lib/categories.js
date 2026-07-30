import { PALETTE } from './palette'

// Shared category list, used by the sidebar nav AND the composer picker,
// so the names, descriptions, and colors always stay in sync.
export const CATEGORIES = [
  { key: 'identity', name: 'Identity',      desc: 'Who you are, gender, sexuality, culture', color: PALETTE.violet },
  { key: 'school',   name: 'School life',   desc: 'Classes, friends, pressure, fitting in',    color: PALETTE.lilac },
  { key: 'mind',     name: 'Mental health', desc: "How you're really doing on the inside",      color: PALETTE.lavender },
  { key: 'culture',  name: 'Culture',       desc: 'Heritage, language, being new, belonging',  color: PALETTE.plum },
  { key: 'wins',     name: 'Small wins',    desc: 'Little victories that deserve a cheer',      color: PALETTE.lilac },
  { key: 'vent',     name: 'Venting',       desc: 'Let it out, no fixing, just release',       color: PALETTE.violet }
]

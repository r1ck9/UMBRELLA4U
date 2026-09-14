// Hand-drawn stickers behind the feed, matching the org pages.
//
// Purely decorative: the layer is fixed behind the page (below .topbar and
// .shell), aria-hidden, and ignores the pointer, so it can never sit on top of
// a post or a control. Stickers only appear in the side gutters and the empty
// space under the nav (see .fd in globals.css). Outlines use --deco-ink, which
// follows the theme, so they read in both light and dark mode.

const SHAPES = {
  star: ['0 0 100 100',
    <path className="ink" d="M50 8 L61 36 L91 38 L67 57 L75 87 L50 70 L25 87 L33 57 L9 38 L39 36 Z" fill="#ffc94d" />],
  sparkle: ['0 0 100 100',
    <path className="ink" d="M50 6 C54 34 66 46 94 50 C66 54 54 66 50 94 C46 66 34 54 6 50 C34 46 46 34 50 6 Z" fill="#ffffff" />],
  heart: ['0 0 100 100',
    <path className="ink" d="M50 88 C18 64 8 46 14 30 C20 14 42 12 50 30 C58 12 80 14 86 30 C92 46 82 64 50 88 Z" fill="#f49ac1" />],
  cloud: ['0 0 140 90',
    <path className="ink" d="M30 78 C12 78 6 62 16 52 C10 36 28 24 42 32 C48 14 76 10 86 28 C100 20 120 30 116 48 C132 50 134 76 114 78 Z" fill="#e3d3f7" />],
  drop: ['0 0 60 80',
    <>
      <path className="ink" d="M30 6 C40 26 52 40 52 54 C52 68 42 76 30 76 C18 76 8 68 8 54 C8 40 20 26 30 6 Z" fill="#9cc9ef" />
      <path d="M20 54 C20 62 24 66 30 67" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
    </>],
  flower: ['0 0 100 100',
    <g className="ink">
      {[[50, 24], [76, 44], [66, 74], [34, 74], [24, 44]].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="17" fill="#cdefd8" />
      ))}
      <circle cx="50" cy="52" r="14" fill="#ffc94d" />
    </g>],
  moon: ['0 0 100 100',
    <path className="ink" d="M64 10 C38 16 22 40 26 64 C30 86 52 96 74 90 C58 84 46 68 46 50 C46 32 54 18 64 10 Z" fill="#ffe39a" />],
  umbrella: ['0 0 100 100',
    <>
      <path className="ink" d="M8 52 C10 20 90 20 92 52 C82 45 72 45 64 52 C56 45 44 45 36 52 C28 45 18 45 8 52 Z" fill="#c49aea" />
      <path className="ink" d="M50 52 L50 82 C50 92 36 92 36 83" fill="none" />
      <path className="ink" d="M50 26 L50 16" fill="none" />
    </>],
  squiggle: ['0 0 160 40',
    <path className="squig" d="M6 26 C20 6 34 6 42 22 C50 38 64 38 74 20 C84 4 98 6 106 22 C114 38 128 38 138 20 C144 10 150 10 154 14" fill="none" />],
}

function Sticker({ name, className }) {
  const [viewBox, body] = SHAPES[name]
  return <svg className={`fd-stk ${className}`} viewBox={viewBox} focusable="false">{body}</svg>
}

export default function FeedDecor() {
  return (
    <div className="fd" aria-hidden="true">
      {/* side gutters, wide screens */}
      <Sticker name="cloud" className="fd-gl1" />
      <Sticker name="drop" className="fd-gl2" />
      <Sticker name="heart" className="fd-gl3" />
      <Sticker name="star" className="fd-gr1" />
      <Sticker name="moon" className="fd-gr2" />
      <Sticker name="sparkle" className="fd-gr3" />
      {/* empty space under the sticky nav, tall enough windows only */}
      <Sticker name="flower" className="fd-n1" />
      <Sticker name="squiggle" className="fd-n2" />
      <Sticker name="umbrella" className="fd-n3" />
      <Sticker name="sparkle" className="fd-n4" />
    </div>
  )
}

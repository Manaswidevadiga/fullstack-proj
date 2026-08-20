import { INK, SUN, CORAL, SKY, GRASS, BUBBLEGUM } from '../lib/theme'

export function Star({ style, color = SUN }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" style={style}>
      <path
        d="M12 1 L14.5 9 L23 9 L16 14 L18.5 22 L12 17 L5.5 22 L8 14 L1 9 L9.5 9 Z"
        fill={color}
        stroke={INK}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Zigzag({ style, color = CORAL }) {
  return (
    <svg viewBox="0 0 60 20" width="60" height="20" style={style}>
      <path
        d="M2 18 L14 2 L26 18 L38 2 L50 18 L58 2"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function ScribbleArrow({ style }) {
  return (
    <svg viewBox="0 0 80 60" width="80" height="60" style={style}>
      <path
        d="M4 6 C 30 2, 40 30, 20 34 C 44 30, 60 20, 70 40"
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d="M58 32 L72 40 L60 48"
        fill="none"
        stroke={INK}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function WobblyRing({ style, color = CORAL }) {
  return (
    <svg viewBox="0 0 220 90" width="100%" height="100%" style={style} preserveAspectRatio="none">
      <path
        d="M14 45 C 10 15, 60 6, 110 8 C 165 10, 212 20, 208 46 C 204 76, 150 84, 108 82 C 55 80, 18 74, 14 45 Z"
        fill="none"
        stroke={color}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

// Reusable background blob set — used on Home and Lobby for visual continuity.
export const BG_BLOBS = [
  { size: 220, top: '-6%', left: '-8%', color: SKY, rotate: 12 },
  { size: 180, top: '62%', left: '84%', color: SUN, rotate: -18 },
  { size: 140, top: '4%', left: '80%', color: BUBBLEGUM, rotate: 20 },
  { size: 160, top: '78%', left: '4%', color: GRASS, rotate: -10 },
]
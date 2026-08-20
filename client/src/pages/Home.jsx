import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { SKINS } from '../lib/skins'

const INK = '#1A1A1A'
const PAPER = '#FFFDF7'
const CORAL = '#FF6B4A'
const SUN = '#FFD23F'
const SKY = '#4FC3E8'
const GRASS = '#7ED957'
const BUBBLEGUM = '#FF6FA8'

const stickerRotations = [-6, 4, -3, 6, -5, 3]

const blobs = [
  { size: 220, top: '-6%', left: '-8%', color: SKY, rotate: 12 },
  { size: 180, top: '62%', left: '84%', color: SUN, rotate: -18 },
  { size: 140, top: '4%', left: '80%', color: BUBBLEGUM, rotate: 20 },
  { size: 160, top: '78%', left: '4%', color: GRASS, rotate: -10 },
]

function Star({ style }) {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" style={style}>
      <path
        d="M12 1 L14.5 9 L23 9 L16 14 L18.5 22 L12 17 L5.5 22 L8 14 L1 9 L9.5 9 Z"
        fill={SUN}
        stroke={INK}
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Zigzag({ style, color = CORAL }) {
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

function ScribbleArrow({ style }) {
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

function WobblyRing({ style }) {
  return (
    <svg viewBox="0 0 220 90" width="100%" height="100%" style={style} preserveAspectRatio="none">
      <path
        d="M14 45 C 10 15, 60 6, 110 8 C 165 10, 212 20, 208 46 C 204 76, 150 84, 108 82 C 55 80, 18 74, 14 45 Z"
        fill="none"
        stroke={CORAL}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function Home() {
  const { user, continueAsGuest, skin, setSkin } = useAuth()
  const navigate = useNavigate()

  const handlePlay = () => {
    if (!user) {
      continueAsGuest()
    }
    navigate('/lobby')
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex items-center justify-center px-4"
      style={{
        background: PAPER,
        backgroundImage: 'radial-gradient(#e7e2d3 1.4px, transparent 1.4px)',
        backgroundSize: '22px 22px',
      }}
    >
      {/* Soft background blobs */}
      {blobs.map((b, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: b.color,
            opacity: 0.28,
            borderRadius: '58% 42% 65% 35% / 45% 55% 45% 55%',
          }}
          animate={{ rotate: [b.rotate, b.rotate + 10, b.rotate] }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {/* Doodle accents */}
      <Star style={{ position: 'absolute', top: '10%', left: '14%', transform: 'rotate(-8deg)' }} />
      <Star style={{ position: 'absolute', top: '78%', left: '88%', transform: 'rotate(14deg) scale(0.8)' }} />
      <Zigzag style={{ position: 'absolute', top: '20%', left: '84%', transform: 'rotate(-6deg)' }} />
      <Zigzag style={{ position: 'absolute', top: '82%', left: '10%', transform: 'rotate(4deg)' }} color={SKY} />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95, rotate: -3 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: -1.5 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-white rounded-[28px] p-8 text-center"
        style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
      >
        <motion.h1
          initial={{ opacity: 0, y: -10, rotate: -6 }}
          animate={{ opacity: 1, y: 0, rotate: -2 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 12 }}
          className="text-5xl mb-1 inline-block"
          style={{
            fontFamily: "'Bangers', cursive",
            color: CORAL,
            WebkitTextStroke: `2px ${INK}`,
            letterSpacing: '0.02em',
          }}
        >
          Snake Royale
        </motion.h1>
        <p className="mb-6 -rotate-1" style={{ fontFamily: "'Kalam', cursive", color: INK, fontSize: '1.05rem' }}>
          {user ? `Welcome back, ${user.username}!` : 'jump in and battle — no account needed!'}
        </p>

        <p className="text-sm mb-3 text-left" style={{ fontFamily: "'Kalam', cursive", color: INK, fontWeight: 700 }}>
          pick your snake →
        </p>
        <div className="grid grid-cols-3 gap-4 mb-8 place-items-center">
          {SKINS.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => setSkin(s.id)}
              initial={{ rotate: stickerRotations[i % stickerRotations.length] }}
              animate={{
                rotate:
                  skin === s.id
                    ? 0
                    : [
                        stickerRotations[i % stickerRotations.length],
                        stickerRotations[i % stickerRotations.length] - 6,
                        stickerRotations[i % stickerRotations.length],
                      ],
              }}
              transition={
                skin === s.id
                  ? { type: 'spring', stiffness: 300, damping: 12 }
                  : { duration: 3, repeat: Infinity, ease: 'easeInOut', delay: i * 0.2 }
              }
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="relative w-14 h-14 rounded-full flex items-center justify-center"
              style={{
                backgroundColor: s.head,
                border: `3px solid ${INK}`,
                boxShadow: skin === s.id ? `4px 4px 0 ${INK}` : `3px 3px 0 ${INK}`,
                outline: skin === s.id ? `3px solid ${SUN}` : 'none',
                outlineOffset: '2px',
              }}
            >
              <span className="absolute left-3 top-4 w-2 h-2 rounded-full bg-white">
                <span className="absolute left-0.5 top-0.5 w-1 h-1 rounded-full" style={{ background: INK }} />
              </span>
              <span className="absolute right-3 top-4 w-2 h-2 rounded-full bg-white">
                <span className="absolute left-0.5 top-0.5 w-1 h-1 rounded-full" style={{ background: INK }} />
              </span>
            </motion.button>
          ))}
        </div>

        <div className="relative flex items-center justify-center mb-2" style={{ height: 90 }}>
          <WobblyRing style={{ position: 'absolute', inset: '-10px -6px' }} />
          <motion.button
            whileHover={{ scale: 1.05, rotate: -2 }}
            whileTap={{ scale: 0.94, y: 4, rotate: 0 }}
            onClick={handlePlay}
            className="relative w-[85%] text-2xl py-4 rounded-2xl"
            style={{
              fontFamily: "'Bangers', cursive",
              letterSpacing: '0.03em',
              color: INK,
              background: SUN,
              border: `4px solid ${INK}`,
              boxShadow: `6px 6px 0 ${INK}`,
            }}
          >
            PLAY!
          </motion.button>
        </div>
        <ScribbleArrow style={{ position: 'absolute', bottom: -6, right: 30, transform: 'rotate(8deg)' }} />

        {!user && (
          <p className="text-sm mt-6" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558' }}>
            want your stats saved?{' '}
            <button
              onClick={() => navigate('/login')}
              className="font-bold"
              style={{ color: BUBBLEGUM, textDecoration: 'underline wavy' }}
            >
              sign in
            </button>{' '}
            or{' '}
            <button
              onClick={() => navigate('/signup')}
              className="font-bold"
              style={{ color: SKY, textDecoration: 'underline wavy' }}
            >
              sign up
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}
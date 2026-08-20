import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { SKINS } from '../lib/skins'
import { INK, PAPER, CORAL, SUN, SKY, BUBBLEGUM } from '../lib/theme'
import { Star, Zigzag, ScribbleArrow, WobblyRing, BG_BLOBS } from '../components/Doodles'

const stickerRotations = [-6, 4, -3, 6, -5, 3]

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
      {BG_BLOBS.map((b, i) => (
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
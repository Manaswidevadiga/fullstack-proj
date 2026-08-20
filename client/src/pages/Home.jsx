import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { SKINS } from '../lib/skins'

const BG = 'linear-gradient(180deg, #6FE3FF 0%, #B9F6C9 100%)'

const floatingShapes = [
  { size: 90, top: '8%', left: '6%', delay: 0 },
  { size: 60, top: '18%', left: '82%', delay: 0.6 },
  { size: 120, top: '68%', left: '10%', delay: 1.1 },
  { size: 70, top: '75%', left: '78%', delay: 0.3 },
  { size: 45, top: '40%', left: '90%', delay: 0.9 },
]

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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" style={{ background: BG }}>
      {floatingShapes.map((shape, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/25 pointer-events-none"
          style={{ width: shape.size, height: shape.size, top: shape.top, left: shape.left }}
          animate={{ y: [0, -18, 0] }}
          transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut', delay: shape.delay }}
        />
      ))}

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-white rounded-[32px] shadow-[0_20px_60px_rgba(20,33,61,0.25)] p-8 text-center"
      >
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, type: 'spring', stiffness: 300, damping: 14 }}
          className="text-5xl mb-1"
          style={{ fontFamily: "'Fredoka', sans-serif", color: '#14213D', fontWeight: 700 }}
        >
          Snake Royale
        </motion.h1>
        <p className="mb-6" style={{ fontFamily: "'Nunito', sans-serif", color: '#5B6B8C' }}>
          {user ? `Welcome back, ${user.username}` : 'Jump in and battle — no account needed'}
        </p>

        <p
          className="text-sm mb-3 text-left"
          style={{ fontFamily: "'Nunito', sans-serif", color: '#5B6B8C', fontWeight: 700 }}
        >
          Choose your snake
        </p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {SKINS.map((s, i) => (
            <motion.button
              key={s.id}
              onClick={() => setSkin(s.id)}
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.92 }}
              animate={{ y: [0, -4, 0] }}
              transition={{ y: { duration: 2, repeat: Infinity, ease: 'easeInOut', delay: i * 0.15 } }}
              className="flex flex-col items-center gap-1 rounded-2xl p-2 border-[3px] transition-colors"
              style={{
                borderColor: skin === s.id ? '#FFB627' : 'transparent',
                background: skin === s.id ? '#FFF4DB' : '#F5F7FB',
              }}
            >
              <div className="relative w-11 h-11 rounded-full shadow-inner" style={{ backgroundColor: s.head }}>
                <span className="absolute left-1.5 top-2.5 w-2 h-2 rounded-full bg-white">
                  <span className="absolute left-0.5 top-0.5 w-1 h-1 rounded-full bg-[#14213D]" />
                </span>
                <span className="absolute right-1.5 top-2.5 w-2 h-2 rounded-full bg-white">
                  <span className="absolute left-0.5 top-0.5 w-1 h-1 rounded-full bg-[#14213D]" />
                </span>
              </div>
              <span
                className="text-[11px]"
                style={{ fontFamily: "'Nunito', sans-serif", color: '#14213D', fontWeight: 600 }}
              >
                {s.name}
              </span>
            </motion.button>
          ))}
        </div>

        <div className="relative flex items-center justify-center mb-4">
          {/* Shrinking-ring signature — echoes the in-game danger zone */}
          <motion.span
            className="absolute rounded-[20px] border-2 border-dashed pointer-events-none"
            style={{ borderColor: '#FF5D8F', width: '100%', height: '64px' }}
            animate={{ scale: [1, 0.86, 1], opacity: [0.5, 0.15, 0.5] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.94, y: 4 }}
            onClick={handlePlay}
            className="relative w-full text-xl py-4 rounded-2xl"
            style={{
              fontFamily: "'Fredoka', sans-serif",
              fontWeight: 600,
              color: '#14213D',
              background: 'linear-gradient(180deg, #FFD166 0%, #FFB627 100%)',
              boxShadow: '0 8px 0 #E8960B, 0 12px 20px rgba(232,150,11,0.35)',
            }}
          >
            ▶ PLAY
          </motion.button>
        </div>

        {!user && (
          <p className="text-sm" style={{ fontFamily: "'Nunito', sans-serif", color: '#8A94AD' }}>
            Want your stats saved?{' '}
            <button onClick={() => navigate('/login')} className="font-bold hover:underline" style={{ color: '#FF5D8F' }}>
              Sign In
            </button>{' '}
            or{' '}
            <button onClick={() => navigate('/signup')} className="font-bold hover:underline" style={{ color: '#FF5D8F' }}>
              Sign Up
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}
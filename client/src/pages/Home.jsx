import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'
import { SKINS } from '../lib/skins'

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
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center"
      >
        <h1 className="text-4xl font-extrabold text-green-400 mb-2">Snake Royale</h1>
        <p className="text-zinc-400 mb-6">
          {user ? `Welcome back, ${user.username}` : 'Jump in and battle — no account needed'}
        </p>

        <p className="text-zinc-400 text-sm mb-3 text-left">Choose your snake</p>
        <div className="grid grid-cols-3 gap-3 mb-8">
          {SKINS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSkin(s.id)}
              className={`flex flex-col items-center gap-1 rounded-xl p-2 border-2 transition ${
                skin === s.id
                  ? 'border-green-400 bg-zinc-800'
                  : 'border-transparent bg-zinc-800/50 hover:bg-zinc-800'
              }`}
            >
              <div
                className="relative w-10 h-10 rounded-full"
                style={{ backgroundColor: s.head }}
              >
                <span className="absolute left-1.5 top-2.5 w-1.5 h-1.5 rounded-full bg-white">
                  <span className="absolute left-0.5 top-0.5 w-0.5 h-0.5 rounded-full bg-black" />
                </span>
                <span className="absolute right-1.5 top-2.5 w-1.5 h-1.5 rounded-full bg-white">
                  <span className="absolute left-0.5 top-0.5 w-0.5 h-0.5 rounded-full bg-black" />
                </span>
              </div>
              <span className="text-[11px] text-zinc-300">{s.name}</span>
            </button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handlePlay}
          className="w-full bg-green-500 hover:bg-green-400 text-black text-xl font-bold rounded-xl py-4 transition mb-4"
        >
          ▶ PLAY
        </motion.button>

        {!user && (
          <p className="text-zinc-500 text-sm">
            Want your stats saved?{' '}
            <button
              onClick={() => navigate('/login')}
              className="text-green-400 font-semibold hover:underline"
            >
              Sign In
            </button>{' '}
            or{' '}
            <button
              onClick={() => navigate('/signup')}
              className="text-green-400 font-semibold hover:underline"
            >
              Sign Up
            </button>
          </p>
        )}
      </motion.div>
    </div>
  )
}
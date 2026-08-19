import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function Home() {
  const { user, continueAsGuest } = useAuth()
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
        <p className="text-zinc-400 mb-8">
          {user ? `Welcome back, ${user.username}` : 'Jump in and battle — no account needed'}
        </p>

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
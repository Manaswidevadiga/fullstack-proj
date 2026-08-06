import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signup } from '../lib/api'
import { useAuth } from '../context/AuthContext'

export default function Signup() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const navigate = useNavigate()
  const { loginUser } = useAuth()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await signup(username, password)
      const { token, user } = res.data
      loginUser(user, token)
      navigate('/lobby')
    } catch (err) {
      const message = err.response?.data?.message || 'Signup failed. Try a different username.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
      >
        <h1 className="text-3xl font-bold text-green-400 mb-1 text-center">Snake Royale</h1>
        <p className="text-zinc-400 text-sm text-center mb-6">Create your account</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-green-400"
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-green-400"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-50 text-black font-semibold rounded-lg py-2 transition"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </motion.button>
        </form>

        <p className="text-zinc-500 text-sm text-center mt-4">
          Already have an account?{' '}
          <Link to="/login" className="text-green-400 hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  )
} 
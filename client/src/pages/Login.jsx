import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { login } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { INK, PAPER, CORAL, SUN, SKY } from '../lib/theme'
import { Star, Zigzag, SnakeDoodle, BG_BLOBS } from '../components/doodles'

export default function Login() {
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
      const res = await login(username, password)
      const { token, user } = res.data
      loginUser(user, token)
      navigate('/lobby')
    } catch (err) {
      const message = err.response?.data?.message || 'Login failed. Check your credentials.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    fontFamily: "'Kalam', cursive",
    color: INK,
    background: PAPER,
    border: `3px solid ${INK}`,
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
      <Star style={{ position: 'absolute', top: '12%', left: '10%', transform: 'rotate(-8deg)' }} />
      <Zigzag style={{ position: 'absolute', bottom: '14%', right: '12%' }} color={SKY} />
      <SnakeDoodle style={{ position: 'absolute', bottom: '8%', left: '6%', transform: 'rotate(4deg)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95, rotate: -2 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-sm bg-white rounded-[28px] p-8"
        style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
      >
        <h1
          className="text-4xl mb-1 text-center"
          style={{
            fontFamily: "'Bangers', cursive",
            color: SKY,
            WebkitTextStroke: `1.5px ${INK}`,
            letterSpacing: '0.02em',
          }}
        >
          Snake Royale
        </h1>
        <p className="text-sm text-center mb-6" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558' }}>
          log in to battle
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm mb-1"
              style={{ fontFamily: "'Kalam', cursive", color: INK, fontWeight: 700 }}
            >
              username
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </div>

          <div>
            <label
              className="block text-sm mb-1"
              style={{ fontFamily: "'Kalam', cursive", color: INK, fontWeight: 700 }}
            >
              password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-xl px-3 py-2 outline-none"
              style={inputStyle}
            />
          </div>

          {error && (
            <p className="text-sm text-center" style={{ fontFamily: "'Kalam', cursive", color: CORAL, fontWeight: 700 }}>
              {error}
            </p>
          )}

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={{ scale: loading ? 1 : 1.02, rotate: loading ? 0 : -1 }}
            whileTap={{ scale: loading ? 1 : 0.96, y: loading ? 0 : 3 }}
            className="w-full rounded-2xl py-3 text-lg disabled:opacity-60"
            style={{
              fontFamily: "'Bangers', cursive",
              letterSpacing: '0.02em',
              color: INK,
              background: SUN,
              border: `4px solid ${INK}`,
              boxShadow: loading ? 'none' : `5px 5px 0 ${INK}`,
            }}
          >
            {loading ? 'logging in...' : 'LOG IN'}
          </motion.button>
        </form>

        <p className="text-sm text-center mt-5" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558' }}>
          no account?{' '}
          <Link to="/signup" className="font-bold" style={{ color: CORAL, textDecoration: 'underline wavy' }}>
            sign up
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
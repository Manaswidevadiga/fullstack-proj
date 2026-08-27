import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getLeaderboard } from '../lib/api'
import { INK, PAPER, CORAL, SUN, SKY, GRASS } from '../lib/theme'
import { Star, Zigzag, SnakeDoodle, BG_BLOBS } from '../components/doodles'

const chipRotations = [-2, 2, -1.5, 1.5, -1, 1, -2, 2, -1, 1]

export default function Leaderboard() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    getLeaderboard()
      .then((res) => {
        const sorted = [...res.data].sort((a, b) => b.wins - a.wins)
        setEntries(sorted)
      })
      .catch((err) => {
        console.error('Leaderboard fetch error:', err)
        setError('Failed to load leaderboard.')
      })
      .finally(() => setLoading(false))
  }, [])

  const medalColor = (rank) => {
    if (rank === 0) return SUN
    if (rank === 1) return '#D9D4C4'
    if (rank === 2) return CORAL
    return '#EFEAD9'
  }

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col items-center px-4 py-10"
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
      <Star style={{ position: 'absolute', top: '8%', right: '10%', transform: 'rotate(12deg)' }} />
      <Zigzag style={{ position: 'absolute', bottom: '10%', left: '8%' }} color={SKY} />
      <SnakeDoodle style={{ position: 'absolute', top: '10%', left: '6%', transform: 'rotate(-6deg)' }} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96, rotate: -1 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: -0.5 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h1
            className="text-4xl"
            style={{
              fontFamily: "'Bangers', cursive",
              color: SUN,
              WebkitTextStroke: `1.5px ${INK}`,
              letterSpacing: '0.02em',
            }}
          >
            Leaderboard
          </h1>
          <button
            onClick={() => navigate('/lobby')}
            className="text-sm font-bold"
            style={{ fontFamily: "'Kalam', cursive", color: INK, textDecoration: 'underline wavy' }}
          >
            ← lobby
          </button>
        </div>

        <div
          className="bg-white rounded-[24px] p-4"
          style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
        >
          {loading && (
            <p className="text-center py-6" style={{ fontFamily: "'Kalam', cursive", color: '#8A8372' }}>
              loading...
            </p>
          )}

          {error && (
            <p className="text-center py-6" style={{ fontFamily: "'Kalam', cursive", color: CORAL, fontWeight: 700 }}>
              {error}
            </p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="text-center py-6" style={{ fontFamily: "'Kalam', cursive", color: '#8A8372' }}>
              no games played yet.
            </p>
          )}

          {!loading && !error && entries.length > 0 && (
            <ul className="space-y-2">
              {entries.map((entry, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10, rotate: 0 }}
                  animate={{ opacity: 1, x: 0, rotate: chipRotations[idx % chipRotations.length] }}
                  transition={{ delay: idx * 0.05, type: 'spring', stiffness: 320, damping: 20 }}
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: '#FFF9EC', border: `2.5px solid ${INK}` }}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-7 h-7 rounded-full flex items-center justify-center text-xs"
                      style={{
                        backgroundColor: medalColor(idx),
                        border: `2px solid ${INK}`,
                        fontFamily: "'Bangers', cursive",
                        color: INK,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span style={{ fontFamily: "'Kalam', cursive", color: INK, fontWeight: 700 }}>
                      {entry.guest_name}
                    </span>
                  </div>
                  <span style={{ fontFamily: "'Bangers', cursive", color: GRASS, letterSpacing: '0.02em' }}>
                    {entry.wins} wins
                  </span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  )
}
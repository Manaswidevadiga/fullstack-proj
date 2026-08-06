import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getLeaderboard } from '../lib/api'

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
    if (rank === 0) return '#facc15'
    if (rank === 1) return '#d4d4d8'
    if (rank === 2) return '#f97316'
    return '#3f3f46'
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-green-400">Leaderboard</h1>
          <button
            onClick={() => navigate('/lobby')}
            className="text-sm text-zinc-400 hover:text-white transition"
          >
            ← Back to Lobby
          </button>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
          {loading && (
            <p className="text-zinc-500 text-center py-6">Loading...</p>
          )}

          {error && (
            <p className="text-red-400 text-center py-6">{error}</p>
          )}

          {!loading && !error && entries.length === 0 && (
            <p className="text-zinc-500 text-center py-6">No games played yet.</p>
          )}

          {!loading && !error && entries.length > 0 && (
            <ul className="space-y-2">
              {entries.map((entry, idx) => (
                <motion.li
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="flex items-center justify-between bg-zinc-800 rounded-lg px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-black"
                      style={{ backgroundColor: medalColor(idx) }}
                    >
                      {idx + 1}
                    </span>
                    <span className="text-white font-medium">{entry.guest_name}</span>
                  </div>
                  <span className="text-green-400 font-semibold">{entry.wins} wins</span>
                </motion.li>
              ))}
            </ul>
          )}
        </div>
      </motion.div>
    </div>
  )
} 
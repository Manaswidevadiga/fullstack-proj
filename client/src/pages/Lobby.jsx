import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { socket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'

export default function Lobby() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [roomCode, setRoomCode] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [inRoom, setInRoom] = useState(false)
  const [players, setPlayers] = useState({})
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(!socket.connected)

  useEffect(() => {
    socket.connect()

    if (socket.connected) {
      setConnecting(false)
    }

    socket.on('connect', () => setConnecting(false))

    socket.on('lobbyUpdate', (roomState) => {
      console.log('lobbyUpdate:', roomState)
      setPlayers(roomState.players || {})
    })

    socket.on('gameState', () => {
      navigate('/game')
    })

    return () => {
      socket.off('connect')
      socket.off('lobbyUpdate')
      socket.off('gameState')
    }
  }, [navigate])

  const handleCreateRoom = () => {
    setError('')
    socket.emit('createRoom', { username: user.username }, (res) => {
      if (res?.roomCode) {
        setRoomCode(res.roomCode)
        setInRoom(true)
      } else {
        setError('Failed to create room.')
      }
    })
  }

  const handleJoinRoom = () => {
    setError('')
    if (!joinCodeInput.trim()) return
    socket.emit(
      'joinRoom',
      { roomCode: joinCodeInput.trim().toUpperCase(), username: user.username },
      (res) => {
        if (res?.success) {
          setRoomCode(joinCodeInput.trim().toUpperCase())
          setInRoom(true)
        } else {
          setError(res?.error || 'Failed to join room.')
        }
      }
    )
  }

  const handleStartGame = () => {
    socket.emit('startGame')
  }

  if (connecting) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-zinc-400">Connecting to server...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
      >
        <h1 className="text-2xl font-bold text-green-400 mb-6 text-center">
          {inRoom ? `Room: ${roomCode}` : 'Lobby'}
        </h1>

        {!inRoom && (
          <div className="space-y-6">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateRoom}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg py-2 transition"
            >
              Create Room
            </motion.button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px bg-zinc-700" />
              <span className="text-zinc-500 text-sm">or</span>
              <div className="flex-1 h-px bg-zinc-700" />
            </div>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                className="w-full bg-zinc-800 text-white rounded-lg px-3 py-2 outline-none border border-zinc-700 focus:border-green-400 uppercase"
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleJoinRoom}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-lg py-2 transition"
              >
                Join Room
              </motion.button>
            </div>
          </div>
        )}

        {inRoom && (
          <div className="space-y-4">
            <div>
              <p className="text-zinc-400 text-sm mb-2">Players in room:</p>
              <ul className="space-y-1">
                <AnimatePresence>
                  {Object.values(players).map((p, i) => (
                    <motion.li
                      key={p.username + i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-white bg-zinc-800 rounded-lg px-3 py-2"
                    >
                      {p.username}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartGame}
              className="w-full bg-green-500 hover:bg-green-400 text-black font-semibold rounded-lg py-2 transition"
            >
              Start Game
            </motion.button>
          </div>
        )}

        {error && <p className="text-red-400 text-sm text-center mt-4">{error}</p>}
      </motion.div>
    </div>
  )
} 
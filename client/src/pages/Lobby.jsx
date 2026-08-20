import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { socket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'

const BG = 'linear-gradient(180deg, #6FE3FF 0%, #B9F6C9 100%)'

const floatingShapes = [
  { size: 90, top: '8%', left: '6%', delay: 0 },
  { size: 60, top: '18%', left: '82%', delay: 0.6 },
  { size: 120, top: '68%', left: '10%', delay: 1.1 },
  { size: 70, top: '75%', left: '78%', delay: 0.3 },
  { size: 45, top: '40%', left: '90%', delay: 0.9 },
]

export default function Lobby() {
  const { user, skin } = useAuth()
  const navigate = useNavigate()

  const [roomCode, setRoomCode] = useState('')
  const [joinCodeInput, setJoinCodeInput] = useState('')
  const [inRoom, setInRoom] = useState(false)
  const [players, setPlayers] = useState({})
  const [hostId, setHostId] = useState(null)
  const [error, setError] = useState('')
  const [connecting, setConnecting] = useState(!socket.connected)
  const [findingMatch, setFindingMatch] = useState(false)

  useEffect(() => {
    socket.connect()

    if (socket.connected) {
      setConnecting(false)
    }

    socket.on('connect', () => setConnecting(false))

    socket.on('lobbyUpdate', (roomState) => {
      console.log('lobbyUpdate:', roomState)
      setPlayers(roomState.players || {})
      setHostId(roomState.hostId ?? null)
    })

    socket.on('gameState', () => {
      navigate('/game')
    })

    socket.on('startGameError', ({ error: msg }) => {
      setError(msg || 'Only the host can start the game.')
    })

    return () => {
      socket.off('connect')
      socket.off('lobbyUpdate')
      socket.off('gameState')
      socket.off('startGameError')
    }
  }, [navigate])

  const handleCreateRoom = () => {
    setError('')
    socket.emit(
      'createRoom',
      { username: user.username, isGuest: !!user.isGuest, skin },
      (res) => {
        if (res?.roomCode) {
          setRoomCode(res.roomCode)
          setInRoom(true)
        } else {
          setError('Failed to create room.')
        }
      }
    )
  }

  const handleJoinRoom = () => {
    setError('')
    if (!joinCodeInput.trim()) return
    socket.emit(
      'joinRoom',
      {
        roomCode: joinCodeInput.trim().toUpperCase(),
        username: user.username,
        isGuest: !!user.isGuest,
        skin,
      },
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

  const handleQuickJoin = () => {
    setError('')
    setFindingMatch(true)
    socket.emit(
      'quickJoin',
      { username: user.username, isGuest: !!user.isGuest, skin },
      (res) => {
        setFindingMatch(false)
        if (res?.roomCode) {
          setRoomCode(res.roomCode)
          setInRoom(true)
        } else {
          setError('Failed to find a match.')
        }
      }
    )
  }

  const handleStartGame = () => {
    socket.emit('startGame')
  }

  const isHost = hostId !== null && socket.id === hostId

  if (connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: BG }}>
        <p style={{ fontFamily: "'Nunito', sans-serif", color: '#14213D' }}>Connecting to server...</p>
      </div>
    )
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
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-white rounded-[32px] shadow-[0_20px_60px_rgba(20,33,61,0.25)] p-8"
      >
        {inRoom ? (
          <div className="mx-auto mb-6 w-fit px-6 py-2 rounded-2xl border-[3px] border-dashed" style={{ borderColor: '#FF5D8F' }}>
            <p
              className="text-xs text-center mb-0.5"
              style={{ fontFamily: "'Nunito', sans-serif", color: '#8A94AD', fontWeight: 700, letterSpacing: '0.08em' }}
            >
              ROOM CODE
            </p>
            <p
              className="text-2xl text-center tracking-[0.2em]"
              style={{ fontFamily: "'JetBrains Mono', monospace", color: '#14213D', fontWeight: 700 }}
            >
              {roomCode}
            </p>
          </div>
        ) : (
          <h1
            className="text-3xl mb-6 text-center"
            style={{ fontFamily: "'Fredoka', sans-serif", color: '#14213D', fontWeight: 700 }}
          >
            Lobby
          </h1>
        )}

        {!inRoom && (
          <div className="space-y-5">
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.95, y: 3 }}
              onClick={handleQuickJoin}
              disabled={findingMatch}
              className="w-full py-4 rounded-2xl text-lg disabled:opacity-60"
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 600,
                color: '#14213D',
                background: 'linear-gradient(180deg, #FFD166 0%, #FFB627 100%)',
                boxShadow: '0 6px 0 #E8960B',
              }}
            >
              {findingMatch ? 'Finding a match…' : '⚡ Quick Match'}
            </motion.button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ backgroundColor: '#E4E9F5' }} />
              <span className="text-xs" style={{ fontFamily: "'Nunito', sans-serif", color: '#8A94AD' }}>
                or play with friends
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#E4E9F5' }} />
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.96, y: 3 }}
              onClick={handleCreateRoom}
              className="w-full py-3 rounded-2xl"
              style={{
                fontFamily: "'Fredoka', sans-serif",
                fontWeight: 600,
                color: '#fff',
                background: '#4CD97B',
                boxShadow: '0 5px 0 #34B15E',
              }}
            >
              Create Room
            </motion.button>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Enter room code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 outline-none uppercase text-center tracking-[0.15em]"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#14213D',
                  background: '#F5F7FB',
                  border: '2px solid #E4E9F5',
                }}
              />
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96, y: 3 }}
                onClick={handleJoinRoom}
                className="w-full py-3 rounded-2xl"
                style={{
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 600,
                  color: '#14213D',
                  background: '#F5F7FB',
                  border: '2px solid #E4E9F5',
                }}
              >
                Join Room
              </motion.button>
            </div>
          </div>
        )}

        {inRoom && (
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2" style={{ fontFamily: "'Nunito', sans-serif", color: '#8A94AD', fontWeight: 700 }}>
                Players in room
              </p>
              <ul className="space-y-2">
                <AnimatePresence>
                  {Object.entries(players).map(([id, p]) => (
                    <motion.li
                      key={id}
                      layout
                      initial={{ opacity: 0, scale: 0.8, y: -8 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                      className="flex items-center justify-between rounded-2xl px-4 py-2.5"
                      style={{ background: '#F5F7FB' }}
                    >
                      <span style={{ fontFamily: "'Nunito', sans-serif", color: '#14213D', fontWeight: 700 }}>
                        {p.username}
                      </span>
                      {id === hostId && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: '#FFE29A', color: '#8A5C00', fontFamily: "'Nunito', sans-serif", fontWeight: 800 }}
                        >
                          👑 HOST
                        </span>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.95, y: 4 }}
                onClick={handleStartGame}
                className="w-full py-4 rounded-2xl text-lg"
                style={{
                  fontFamily: "'Fredoka', sans-serif",
                  fontWeight: 600,
                  color: '#fff',
                  background: '#4CD97B',
                  boxShadow: '0 6px 0 #34B15E',
                }}
              >
                Start Game
              </motion.button>
            ) : (
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full text-center rounded-2xl py-3"
                style={{ background: '#F5F7FB', color: '#8A94AD', fontFamily: "'Nunito', sans-serif", fontWeight: 700 }}
              >
                Waiting for host to start…
              </motion.div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-center mt-4" style={{ fontFamily: "'Nunito', sans-serif", color: '#FF5D8F' }}>
            {error}
          </p>
        )}
      </motion.div>
    </div>
  )
}
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { socket } from '../lib/socket'
import { useAuth } from '../context/AuthContext'
import { INK, PAPER, CORAL, SUN, SKY, GRASS } from '../lib/theme'
import { Star, Zigzag, WobblyRing, BG_BLOBS } from '../components/doodles'

const chipRotations = [-3, 2, -2, 3, -1, 1]

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

  const bgStyle = {
    background: PAPER,
    backgroundImage: 'radial-gradient(#e7e2d3 1.4px, transparent 1.4px)',
    backgroundSize: '22px 22px',
  }

  if (connecting) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={bgStyle}>
        <p style={{ fontFamily: "'Kalam', cursive", color: INK }}>connecting to server...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center px-4" style={bgStyle}>
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

      <Star style={{ position: 'absolute', top: '12%', left: '10%', transform: 'rotate(10deg)' }} />
      <Zigzag style={{ position: 'absolute', top: '80%', left: '86%', transform: 'rotate(-8deg)' }} color={SKY} />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96, rotate: 2 }}
        animate={{ opacity: 1, y: 0, scale: 1, rotate: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative z-10 w-full max-w-md bg-white rounded-[28px] p-8"
        style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
      >
        {inRoom ? (
          <div className="relative mx-auto mb-6 w-fit" style={{ height: 78 }}>
            <WobblyRing style={{ position: 'absolute', inset: '-14px -18px' }} color={CORAL} />
            <div className="relative px-8 py-2 text-center">
              <p
                className="text-xs mb-0.5"
                style={{ fontFamily: "'Kalam', cursive", color: '#6B6558', fontWeight: 700, letterSpacing: '0.06em' }}
              >
                room code
              </p>
              <p
                className="text-2xl tracking-[0.2em]"
                style={{ fontFamily: "'JetBrains Mono', monospace", color: INK, fontWeight: 700 }}
              >
                {roomCode}
              </p>
            </div>
          </div>
        ) : (
          <h1
            className="text-4xl mb-6 text-center"
            style={{
              fontFamily: "'Bangers', cursive",
              color: SKY,
              WebkitTextStroke: `1.5px ${INK}`,
              letterSpacing: '0.02em',
            }}
          >
            Lobby
          </h1>
        )}

        {!inRoom && (
          <div className="space-y-5">
            <motion.button
              whileHover={{ scale: 1.03, rotate: -1 }}
              whileTap={{ scale: 0.95, y: 3, rotate: 0 }}
              onClick={handleQuickJoin}
              disabled={findingMatch}
              className="w-full py-4 rounded-2xl text-xl disabled:opacity-60"
              style={{
                fontFamily: "'Bangers', cursive",
                letterSpacing: '0.02em',
                color: INK,
                background: SUN,
                border: `4px solid ${INK}`,
                boxShadow: `6px 6px 0 ${INK}`,
              }}
            >
              {findingMatch ? 'finding a match…' : '⚡ QUICK MATCH'}
            </motion.button>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-px" style={{ backgroundColor: '#E4DFCF' }} />
              <span className="text-xs" style={{ fontFamily: "'Kalam', cursive", color: '#8A8372' }}>
                or play with friends
              </span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#E4DFCF' }} />
            </div>

            <motion.button
              whileHover={{ scale: 1.02, rotate: 1 }}
              whileTap={{ scale: 0.96, y: 3, rotate: 0 }}
              onClick={handleCreateRoom}
              className="w-full py-3 rounded-2xl text-lg"
              style={{
                fontFamily: "'Bangers', cursive",
                letterSpacing: '0.02em',
                color: '#fff',
                background: GRASS,
                border: `4px solid ${INK}`,
                boxShadow: `5px 5px 0 ${INK}`,
              }}
            >
              CREATE ROOM
            </motion.button>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="enter room code"
                value={joinCodeInput}
                onChange={(e) => setJoinCodeInput(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 outline-none uppercase text-center tracking-[0.15em]"
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: INK,
                  background: PAPER,
                  border: `3px solid ${INK}`,
                }}
              />
              <motion.button
                whileHover={{ scale: 1.02, rotate: -1 }}
                whileTap={{ scale: 0.96, y: 3, rotate: 0 }}
                onClick={handleJoinRoom}
                className="w-full py-3 rounded-2xl text-lg"
                style={{
                  fontFamily: "'Bangers', cursive",
                  letterSpacing: '0.02em',
                  color: INK,
                  background: '#fff',
                  border: `3px solid ${INK}`,
                  boxShadow: `4px 4px 0 ${INK}`,
                }}
              >
                JOIN ROOM
              </motion.button>
            </div>
          </div>
        )}

        {inRoom && (
          <div className="space-y-4">
            <div>
              <p className="text-sm mb-2" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558', fontWeight: 700 }}>
                players in room
              </p>
              <ul className="space-y-2">
                <AnimatePresence>
                  {Object.entries(players).map(([id, p], i) => (
                    <motion.li
                      key={id}
                      layout
                      initial={{ opacity: 0, scale: 0.7, y: -10, rotate: 0 }}
                      animate={{
                        opacity: 1,
                        scale: 1,
                        y: 0,
                        rotate: chipRotations[i % chipRotations.length],
                      }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      transition={{ type: 'spring', stiffness: 380, damping: 18 }}
                      className="flex items-center justify-between rounded-xl px-4 py-2.5"
                      style={{ background: '#FFF9EC', border: `2.5px solid ${INK}` }}
                    >
                      <span style={{ fontFamily: "'Kalam', cursive", color: INK, fontWeight: 700 }}>
                        {p.username}
                      </span>
                      {id === hostId && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: SUN, color: INK, border: `1.5px solid ${INK}`, fontFamily: "'Kalam', cursive", fontWeight: 700 }}
                        >
                          👑 host
                        </span>
                      )}
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </div>

            {isHost ? (
              <motion.button
                whileHover={{ scale: 1.03, rotate: -1 }}
                whileTap={{ scale: 0.95, y: 4, rotate: 0 }}
                onClick={handleStartGame}
                className="w-full py-4 rounded-2xl text-xl"
                style={{
                  fontFamily: "'Bangers', cursive",
                  letterSpacing: '0.02em',
                  color: '#fff',
                  background: GRASS,
                  border: `4px solid ${INK}`,
                  boxShadow: `6px 6px 0 ${INK}`,
                }}
              >
                START GAME
              </motion.button>
            ) : (
              <motion.div
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
                className="w-full text-center rounded-2xl py-3"
                style={{
                  background: '#FFF9EC',
                  color: '#6B6558',
                  fontFamily: "'Kalam', cursive",
                  fontWeight: 700,
                  border: `2.5px dashed ${INK}`,
                }}
              >
                waiting for host to start…
              </motion.div>
            )}
          </div>
        )}

        {error && (
          <p className="text-sm text-center mt-4" style={{ fontFamily: "'Kalam', cursive", color: CORAL, fontWeight: 700 }}>
            {error}
          </p>
        )}
      </motion.div>
    </div>
  )
}
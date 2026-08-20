import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { socket } from '../lib/socket'
import { SKINS, getSkinById } from '../lib/skins'
import { CORAL } from '../lib/theme'

const GRID_SIZE = 40
const CELL_SIZE = 15
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE

const KEY_MAP = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
  W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
}

// TEMPORARY: mock data generator for testing rendering without backend
function generateMockGameState(tick) {
  const angle1 = (tick * 0.05) % (Math.PI * 2)
  const angle2 = (tick * 0.05 + Math.PI) % (Math.PI * 2)
  const center = GRID_SIZE / 2
  const radius = 10

  const makeSnake = (angle) => {
    const headX = Math.round(center + Math.cos(angle) * radius)
    const headY = Math.round(center + Math.sin(angle) * radius)
    return [
      { x: headX, y: headY },
      { x: headX - 1, y: headY },
      { x: headX - 2, y: headY },
    ]
  }

  return {
    players: {
      player1: { username: 'Alice', snake: makeSnake(angle1), alive: true, skin: SKINS[0].id },
      player2: { username: 'Bob', snake: makeSnake(angle2), alive: true, skin: SKINS[1].id },
    },
    food: { x: 20, y: 15 },
    dangerRing: Math.max(5, 20 - Math.floor(tick / 40)), // shrinks over time
  }
}

// Deterministic pseudo-random, seeded — same seed always gives the same
// jitter, so the hand-drawn ring stays stable between renders instead of
// visibly vibrating at the tick rate.
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function jitterPoint(px, py, seed, amount = 3) {
  const rx = (seededRandom(seed) - 0.5) * 2 * amount
  const ry = (seededRandom(seed + 1) - 0.5) * 2 * amount
  return [px + rx, py + ry]
}

// Hand-drawn rectangle: draws the danger-zone boundary as a wobbly sketched
// outline (two overlapping jittered passes) instead of a perfectly straight
// rect, to match the sticker/doodle visual style.
function drawRoughRect(ctx, x, y, w, h, seed, color) {
  const corners = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ]
  for (let pass = 0; pass < 2; pass++) {
    ctx.beginPath()
    corners.forEach(([cx, cy], i) => {
      const [jx, jy] = jitterPoint(cx, cy, seed + i * 17 + pass * 131, 4)
      if (i === 0) ctx.moveTo(jx, jy)
      else ctx.lineTo(jx, jy)
    })
    ctx.closePath()
    ctx.strokeStyle = color
    ctx.lineWidth = pass === 0 ? 3 : 2
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.globalAlpha = pass === 0 ? 1 : 0.55
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

export default function Game() {
  const canvasRef = useRef(null)
  const navigate = useNavigate()
  const [gameState, setGameState] = useState(null)
  const [winner, setWinner] = useState(undefined)
  const [rematchStatus, setRematchStatus] = useState(null)
  const [iAmReady, setIAmReady] = useState(false)

  useEffect(() => {
    const useMock = new URLSearchParams(window.location.search).get('mock') === 'true'

    if (useMock) {
      let tick = 0
      const interval = setInterval(() => {
        tick++
        setGameState(generateMockGameState(tick))
      }, 125) // ~8 times/sec, matching real server rate
      return () => clearInterval(interval)
    }

    socket.on('gameState', (state) => setGameState(state))
    socket.on('gameOver', (data) => setWinner(data.winner))
    socket.on('rematchStatus', (status) => setRematchStatus(status))
    socket.on('rematchReady', (state) => {
      setGameState(state)
      setWinner(undefined)
      setRematchStatus(null)
      setIAmReady(false)
    })
    return () => {
      socket.off('gameState')
      socket.off('gameOver')
      socket.off('rematchStatus')
      socket.off('rematchReady')
    }
  }, [])

  useEffect(() => {
    const handleKeyDown = (e) => {
      const direction = KEY_MAP[e.key]
      if (direction) {
        e.preventDefault()
        socket.emit('changeDirection', direction)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!gameState) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    // Background
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    // Grid lines
    ctx.strokeStyle = '#18181b'
    ctx.lineWidth = 1
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * CELL_SIZE, 0)
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE)
      ctx.stroke()
      ctx.beginPath()
      ctx.moveTo(0, i * CELL_SIZE)
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE)
      ctx.stroke()
    }

    // Danger zone - shrinking safe area (square inset from edges),
    // drawn as a hand-sketched wobbly outline to match the sticker theme
    if (typeof gameState.dangerRing === 'number') {
      const inset = gameState.dangerRing * CELL_SIZE
      const safeX = inset
      const safeY = inset
      const safeSize = Math.max(CANVAS_SIZE - inset * 2, 0)

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.rect(safeX, safeY, safeSize, safeSize)
      ctx.fillStyle = 'rgba(255, 107, 74, 0.14)' // coral tint instead of pure red
      ctx.fill('evenodd')
      ctx.restore()

      drawRoughRect(ctx, safeX, safeY, safeSize, safeSize, gameState.dangerRing, CORAL)
    }

    // Food - glowing red circle
    if (gameState.food) {
      const fx = gameState.food.x * CELL_SIZE + CELL_SIZE / 2
      const fy = gameState.food.y * CELL_SIZE + CELL_SIZE / 2
      ctx.beginPath()
      ctx.arc(fx, fy, CELL_SIZE / 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
    }

    // Snakes - cute rounded segments with a face on the head, colored per skin
    const playerEntries = Object.entries(gameState.players || {})
    playerEntries.forEach(([id, player]) => {
      if (!player.alive || !player.snake?.length) return
      const skinData = getSkinById(player.skin)

      player.snake.forEach((seg, segIdx) => {
        const x = seg.x * CELL_SIZE
        const y = seg.y * CELL_SIZE
        const isHead = segIdx === 0
        const color = isHead ? skinData.head : skinData.body

        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = isHead ? 8 : 3
        ctx.beginPath()
        ctx.roundRect(
          x + 1,
          y + 1,
          CELL_SIZE - 2,
          CELL_SIZE - 2,
          isHead ? CELL_SIZE / 2 : 3
        )
        ctx.fill()
        ctx.shadowBlur = 0
      })

      const head = player.snake[0]
      const neck = player.snake[1] || head
      let facing = { x: head.x - neck.x, y: head.y - neck.y }
      if (facing.x === 0 && facing.y === 0) facing = { x: 1, y: 0 }

      const hx = head.x * CELL_SIZE + CELL_SIZE / 2
      const hy = head.y * CELL_SIZE + CELL_SIZE / 2
      const perp = { x: -facing.y, y: facing.x }
      const eyeSpacing = CELL_SIZE / 4
      const eyeForward = CELL_SIZE / 6

      const eyes = [1, -1].map((side) => ({
        x: hx + perp.x * eyeSpacing * side + facing.x * eyeForward,
        y: hy + perp.y * eyeSpacing * side + facing.y * eyeForward,
      }))

      eyes.forEach((eye) => {
        ctx.beginPath()
        ctx.arc(eye.x, eye.y, CELL_SIZE / 7, 0, Math.PI * 2)
        ctx.fillStyle = '#ffffff'
        ctx.fill()

        ctx.beginPath()
        ctx.arc(
          eye.x + facing.x * 1.2,
          eye.y + facing.y * 1.2,
          CELL_SIZE / 14,
          0,
          Math.PI * 2
        )
        ctx.fillStyle = '#111827'
        ctx.fill()
      })
    })
  }, [gameState])

  if (winner !== undefined) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <motion.h1
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="text-4xl font-bold text-green-400"
        >
          {winner ? `${winner} wins!` : 'Game Over — No Winner'}
        </motion.h1>

        <div className="flex flex-col items-center gap-3">
          <div className="flex gap-3">
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: iAmReady ? 1 : 1.05 }}
              whileTap={{ scale: iAmReady ? 1 : 0.95 }}
              disabled={iAmReady}
              onClick={() => { socket.emit('playAgain'); setIAmReady(true) }}
              className={`font-semibold rounded-lg px-6 py-2 transition ${
                iAmReady
                  ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-400 text-black'
              }`}
            >
              {iAmReady ? 'Waiting...' : 'Play Again'}
            </motion.button>

            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/lobby')}
              className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-lg px-6 py-2 transition"
            >
              Back to Lobby
            </motion.button>
          </div>

          {rematchStatus && (
            <p className="text-zinc-400 text-sm">
              Waiting for other players... ({rematchStatus.ready}/{rematchStatus.total} ready)
            </p>
          )}
        </div>
      </div>
    )
  }

  const players = Object.entries(gameState?.players || {})

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row items-center justify-center gap-6 p-4">
      <canvas
        ref={canvasRef}
        width={CANVAS_SIZE}
        height={CANVAS_SIZE}
        className="border border-zinc-800 rounded-lg"
      />
      {/* Mobile touch controls */}
      <div className="lg:hidden grid grid-cols-3 gap-2 w-40 mx-auto mt-4">
        <div />
        <button
          onTouchStart={() => socket.emit('changeDirection', 'UP')}
          onClick={() => socket.emit('changeDirection', 'UP')}
          className="bg-zinc-800 active:bg-green-500 text-white rounded-lg py-3 text-xl"
        >
          ↑
        </button>
        <div />

        <button
          onTouchStart={() => socket.emit('changeDirection', 'LEFT')}
          onClick={() => socket.emit('changeDirection', 'LEFT')}
          className="bg-zinc-800 active:bg-green-500 text-white rounded-lg py-3 text-xl"
        >
          ←
        </button>
        <div />
        <button
          onTouchStart={() => socket.emit('changeDirection', 'RIGHT')}
          onClick={() => socket.emit('changeDirection', 'RIGHT')}
          className="bg-zinc-800 active:bg-green-500 text-white rounded-lg py-3 text-xl"
        >
          →
        </button>

        <div />
        <button
          onTouchStart={() => socket.emit('changeDirection', 'DOWN')}
          onClick={() => socket.emit('changeDirection', 'DOWN')}
          className="bg-zinc-800 active:bg-green-500 text-white rounded-lg py-3 text-xl"
        >
          ↓
        </button>
        <div />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 w-full lg:w-56">
        <h2 className="text-zinc-400 text-sm font-semibold mb-3 uppercase tracking-wide">
          Players
        </h2>
        <ul className="space-y-2">
          {players.map(([id, p]) => (
            <li
              key={id}
              className="flex items-center gap-2 text-sm"
              style={{ opacity: p.alive ? 1 : 0.4 }}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getSkinById(p.skin).head }}
              />
              <span className="text-white">{p.username}</span>
              {!p.alive && <span className="text-red-400 text-xs">(out)</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useAnimation } from 'framer-motion'
import { socket } from '../lib/socket'
import { SKINS, getSkinById } from '../lib/skins'
import { getArenaById } from '../lib/Arenas'
import { INK, PAPER, CORAL, SUN, SKY, GRASS, BUBBLEGUM } from '../lib/theme'
import { Star, Zigzag, SnakeDoodle, BG_BLOBS } from '../components/doodles'

const GRID_SIZE = 40
const CELL_SIZE = 15
const CANVAS_SIZE = GRID_SIZE * CELL_SIZE

// Must match the server's TICK_RATE_MS (server/src/game/constants.js) — used
// only to time client-side position interpolation between state updates.
const SERVER_TICK_MS = 230

const KEY_MAP = {
  ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
  w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
  W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
}

const POWERUP_META = {
  speed: { emoji: '⚡', color: SUN },
  shield: { emoji: '🛡️', color: SKY },
  magnet: { emoji: '🧲', color: BUBBLEGUM },
}

// Rock obstacles use a fixed stone color regardless of arena theme accent —
// only Rocky Canyon has obstacles, so this never needs to vary.
const ROCK_FILL = '#8B7355'

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
      player1: {
        username: 'Alice',
        snake: makeSnake(angle1),
        alive: true,
        skin: SKINS[0].id,
        effects: { speed: true, shield: false, magnet: false },
      },
      player2: {
        username: 'Bob',
        snake: makeSnake(angle2),
        alive: true,
        skin: SKINS[1].id,
        effects: { speed: false, shield: true, magnet: false },
      },
    },
    food: { x: 20, y: 15 },
    powerUps: [
      { id: 1, type: 'magnet', x: 12, y: 8 },
      { id: 2, type: 'speed', x: 30, y: 28 },
    ],
    dangerRing: Math.max(5, 20 - Math.floor(tick / 40)), // shrinks over time
    arena: { id: 'meadow', name: 'Meadow', theme: 'green', obstacles: [], hazards: [] },
  }
}

// Deterministic pseudo-random, seeded — same seed always gives the same
// jitter, so the hand-drawn danger ring stays stable between renders.
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000
  return x - Math.floor(x)
}

function jitterPoint(px, py, seed, amount = 3) {
  const rx = (seededRandom(seed) - 0.5) * 2 * amount
  const ry = (seededRandom(seed + 1) - 0.5) * 2 * amount
  return [px + rx, py + ry]
}

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

// Static rock obstacle cell — filled stone color plus a hand-drawn outline,
// seeded on grid position so the jagged edge stays stable between frames.
function drawObstacleCell(ctx, gx, gy) {
  const x = gx * CELL_SIZE
  const y = gy * CELL_SIZE
  const seed = gx * 1000 + gy

  ctx.fillStyle = ROCK_FILL
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 3)
  ctx.fill()

  drawRoughRect(ctx, x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, seed, INK)
}

// Blinking ice hazard cell — bright + glowing while active (lethal), dim and
// flat while inactive (safe, still walkable/spawnable).
function drawHazardCell(ctx, gx, gy, active) {
  const x = gx * CELL_SIZE
  const y = gy * CELL_SIZE
  const seed = gx * 1000 + gy

  ctx.save()
  ctx.fillStyle = active ? SKY : 'rgba(79, 195, 232, 0.22)'
  ctx.beginPath()
  ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, 4)
  if (active) {
    ctx.shadowColor = SKY
    ctx.shadowBlur = 9
  }
  ctx.fill()
  ctx.restore()

  drawRoughRect(
    ctx,
    x + 1,
    y + 1,
    CELL_SIZE - 2,
    CELL_SIZE - 2,
    seed,
    active ? '#ffffff' : 'rgba(255, 255, 255, 0.3)'
  )
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

// Interpolates each snake segment between ITS OWN previous position and its
// current one (same index in both arrays). Each segment simply glides one
// cell forward along the snake's path every tick — the same amount the head
// moves. Falls back to a zero-distance "no movement" for segments that
// didn't exist last tick (e.g. a segment added by growth or a multi-step
// speed-boost move), which snap in place rather than glide from nowhere.
function getInterpolatedSnake(prevSnake, currSnake, t) {
  if (!prevSnake || prevSnake.length === 0) return currSnake
  return currSnake.map((seg, i) => {
    const from = prevSnake[i] || seg
    return { x: lerp(from.x, seg.x, t), y: lerp(from.y, seg.y, t) }
  })
}

export default function Game() {
  const canvasRef = useRef(null)
  const navigate = useNavigate()
  const [gameState, setGameState] = useState(null)
  const [winner, setWinner] = useState(undefined)
  const [rematchStatus, setRematchStatus] = useState(null)
  const [iAmReady, setIAmReady] = useState(false)
  const [showWarning, setShowWarning] = useState(false)

  const shakeControls = useAnimation()
  const stateRef = useRef({ prev: null, curr: null, lastUpdateTime: 0 })
  const rafRef = useRef(null)

  const pushState = (state) => {
    stateRef.current.prev = stateRef.current.curr
    stateRef.current.curr = state
    stateRef.current.lastUpdateTime = performance.now()
    setGameState(state)
  }

  useEffect(() => {
    const useMock = new URLSearchParams(window.location.search).get('mock') === 'true'

    if (useMock) {
      let tick = 0
      const interval = setInterval(() => {
        tick++
        pushState(generateMockGameState(tick))
      }, 125)
      return () => clearInterval(interval)
    }

    socket.on('gameState', (state) => pushState(state))
    socket.on('gameOver', (data) => setWinner(data.winner))
    socket.on('rematchStatus', (status) => setRematchStatus(status))
    socket.on('rematchReady', (state) => {
      stateRef.current.prev = null
      stateRef.current.curr = state
      stateRef.current.lastUpdateTime = performance.now()
      setGameState(state)
      setWinner(undefined)
      setRematchStatus(null)
      setIAmReady(false)
    })
    socket.on('dangerZoneWarning', () => {
      shakeControls.start({
        x: [0, -6, 6, -4, 4, -2, 2, 0],
        y: [0, 3, -3, 2, -2, 1, -1, 0],
        transition: { duration: 0.5 },
      })
      setShowWarning(true)
      setTimeout(() => setShowWarning(false), 1500)
    })

    return () => {
      socket.off('gameState')
      socket.off('gameOver')
      socket.off('rematchStatus')
      socket.off('rematchReady')
      socket.off('dangerZoneWarning')
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
    function renderLoop() {
      const canvas = canvasRef.current
      const { prev, curr, lastUpdateTime } = stateRef.current

      if (canvas && curr) {
        const ctx = canvas.getContext('2d')
        const t = Math.min(1, (performance.now() - lastUpdateTime) / SERVER_TICK_MS)
        drawFrame(ctx, curr, prev, t)
      }

      rafRef.current = requestAnimationFrame(renderLoop)
    }

    rafRef.current = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  function drawFrame(ctx, state, prevState, t) {
    ctx.fillStyle = '#0a0a0a'
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

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

    if (typeof state.dangerRing === 'number') {
      const inset = state.dangerRing * CELL_SIZE
      const safeX = inset
      const safeY = inset
      const safeSize = Math.max(CANVAS_SIZE - inset * 2, 0)

      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      ctx.rect(safeX, safeY, safeSize, safeSize)
      ctx.fillStyle = 'rgba(255, 107, 74, 0.14)'
      ctx.fill('evenodd')
      ctx.restore()

      drawRoughRect(ctx, safeX, safeY, safeSize, safeSize, state.dangerRing, CORAL)
    }

    // Arena obstacles/hazards — drawn after the danger zone but before
    // food/power-ups/snakes, so those always render on top.
    if (state.arena?.obstacles?.length) {
      state.arena.obstacles.forEach((o) => drawObstacleCell(ctx, o.x, o.y))
    }
    if (state.arena?.hazards?.length) {
      state.arena.hazards.forEach((h) => drawHazardCell(ctx, h.x, h.y, h.active))
    }

    if (state.food) {
      const fx = state.food.x * CELL_SIZE + CELL_SIZE / 2
      const fy = state.food.y * CELL_SIZE + CELL_SIZE / 2
      ctx.beginPath()
      ctx.arc(fx, fy, CELL_SIZE / 2.5, 0, Math.PI * 2)
      ctx.fillStyle = '#ef4444'
      ctx.shadowColor = '#ef4444'
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
    }

    ;(state.powerUps || []).forEach((p) => {
      const meta = POWERUP_META[p.type] || { emoji: '✨', color: '#ffffff' }
      const cx = p.x * CELL_SIZE + CELL_SIZE / 2
      const cy = p.y * CELL_SIZE + CELL_SIZE / 2
      ctx.beginPath()
      ctx.arc(cx, cy, CELL_SIZE / 2.1, 0, Math.PI * 2)
      ctx.fillStyle = meta.color
      ctx.shadowColor = meta.color
      ctx.shadowBlur = 10
      ctx.fill()
      ctx.shadowBlur = 0
      ctx.font = `${CELL_SIZE - 2}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(meta.emoji, cx, cy + 1)
    })

    const playerEntries = Object.entries(state.players || {})
    playerEntries.forEach(([id, player]) => {
      if (!player.alive || !player.snake?.length) return
      const skinData = getSkinById(player.skin)
      const prevSnake = prevState?.players?.[id]?.snake
      const renderSnake = getInterpolatedSnake(prevSnake, player.snake, t)

      renderSnake.forEach((seg, segIdx) => {
        const x = seg.x * CELL_SIZE
        const y = seg.y * CELL_SIZE
        const isHead = segIdx === 0
        const color = isHead ? skinData.head : skinData.body

        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = isHead ? 8 : 3
        ctx.beginPath()
        ctx.roundRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2, isHead ? CELL_SIZE / 2 : 3)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      const head = player.snake[0]
      const neck = player.snake[1] || head
      let facing = { x: head.x - neck.x, y: head.y - neck.y }
      if (facing.x === 0 && facing.y === 0) facing = { x: 1, y: 0 }

      const renderHead = renderSnake[0]
      const hx = renderHead.x * CELL_SIZE + CELL_SIZE / 2
      const hy = renderHead.y * CELL_SIZE + CELL_SIZE / 2
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
        ctx.arc(eye.x + facing.x * 1.2, eye.y + facing.y * 1.2, CELL_SIZE / 14, 0, Math.PI * 2)
        ctx.fillStyle = '#111827'
        ctx.fill()
      })

      if (player.effects?.shield) {
        const pulseT = Date.now() / 300
        const pulse = 2 + Math.sin(pulseT) * 1.5
        ctx.beginPath()
        ctx.arc(hx, hy, CELL_SIZE / 1.6 + pulse, 0, Math.PI * 2)
        ctx.strokeStyle = SKY
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if (player.effects?.speed) {
        ctx.strokeStyle = SUN
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(hx - facing.x * CELL_SIZE * 1.2, hy - facing.y * CELL_SIZE * 1.2)
        ctx.lineTo(hx - facing.x * CELL_SIZE * 0.6, hy - facing.y * CELL_SIZE * 0.6)
        ctx.stroke()
      }
    })
  }

  if (winner !== undefined) {
    return (
      <div
        className="min-h-screen relative overflow-hidden flex flex-col items-center justify-center gap-4 px-4"
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
        <Star style={{ position: 'absolute', top: '14%', left: '12%', transform: 'rotate(-10deg)' }} />
        <Zigzag style={{ position: 'absolute', top: '16%', right: '12%' }} color={SKY} />
        <SnakeDoodle style={{ position: 'absolute', bottom: '10%', left: '8%', transform: 'rotate(-6deg)' }} />
        <SnakeDoodle
          style={{ position: 'absolute', bottom: '12%', right: '10%', transform: 'scaleX(-1) rotate(-4deg)' }}
          color={SKY}
        />

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9, rotate: -3 }}
          animate={{ opacity: 1, y: 0, scale: 1, rotate: -1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          className="relative z-10 bg-white rounded-[28px] px-8 py-10 text-center max-w-md w-full"
          style={{ border: `4px solid ${INK}`, boxShadow: `8px 8px 0 ${INK}` }}
        >
          <motion.h1
            initial={{ scale: 0.7, rotate: -8 }}
            animate={{ scale: 1, rotate: -2 }}
            transition={{ type: 'spring', stiffness: 280, damping: 12, delay: 0.1 }}
            className="text-4xl mb-6"
            style={{
              fontFamily: "'Bangers', cursive",
              color: winner ? SUN : CORAL,
              WebkitTextStroke: `2px ${INK}`,
              letterSpacing: '0.02em',
            }}
          >
            {winner ? `${winner} wins! 🎉` : 'no winner!'}
          </motion.h1>

          <div className="flex flex-col items-center gap-3">
            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: iAmReady ? 1 : 1.04, rotate: iAmReady ? 0 : -1 }}
                whileTap={{ scale: iAmReady ? 1 : 0.95, y: iAmReady ? 0 : 3 }}
                disabled={iAmReady}
                onClick={() => { socket.emit('playAgain'); setIAmReady(true) }}
                className="rounded-2xl px-6 py-3 text-lg"
                style={{
                  fontFamily: "'Bangers', cursive",
                  letterSpacing: '0.02em',
                  color: iAmReady ? '#9C9585' : '#fff',
                  background: iAmReady ? '#EFEAD9' : GRASS,
                  border: `3px solid ${INK}`,
                  boxShadow: iAmReady ? 'none' : `5px 5px 0 ${INK}`,
                  cursor: iAmReady ? 'not-allowed' : 'pointer',
                }}
              >
                {iAmReady ? 'waiting...' : 'PLAY AGAIN'}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.04, rotate: 1 }}
                whileTap={{ scale: 0.95, y: 3 }}
                onClick={() => navigate('/lobby')}
                className="rounded-2xl px-6 py-3 text-lg"
                style={{
                  fontFamily: "'Bangers', cursive",
                  letterSpacing: '0.02em',
                  color: INK,
                  background: '#fff',
                  border: `3px solid ${INK}`,
                  boxShadow: `5px 5px 0 ${INK}`,
                }}
              >
                LOBBY
              </motion.button>
            </div>

            {rematchStatus && (
              <p className="text-sm" style={{ fontFamily: "'Kalam', cursive", color: '#6B6558' }}>
                waiting for other players... ({rematchStatus.ready}/{rematchStatus.total} ready)
              </p>
            )}
          </div>
        </motion.div>
      </div>
    )
  }

  const players = Object.entries(gameState?.players || {})
  const arenaMeta = getArenaById(gameState?.arena?.id)

  return (
    <div className="min-h-screen bg-black flex flex-col lg:flex-row items-center justify-center gap-6 p-4">
      <motion.div className="relative" animate={shakeControls}>
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="rounded-lg"
          style={{ border: `2px solid ${arenaMeta.theme}` }}
        />

        <div
          className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1 rounded-full pointer-events-none"
          style={{
            background: 'rgba(10, 10, 10, 0.7)',
            border: `1.5px solid ${arenaMeta.theme}`,
          }}
        >
          <span className="text-sm leading-none">{arenaMeta.emoji}</span>
          <span
            className="text-xs text-white leading-none"
            style={{ fontFamily: "'Kalam', cursive", fontWeight: 700 }}
          >
            {arenaMeta.name}
          </span>
        </div>

        <AnimatePresence>
          {showWarning && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.7 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl pointer-events-none"
              style={{
                fontFamily: "'Bangers', cursive",
                letterSpacing: '0.02em',
                color: '#fff',
                background: CORAL,
                border: `3px solid ${INK}`,
                boxShadow: `4px 4px 0 ${INK}`,
              }}
            >
              ⚠️ ZONE SHRINKING!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

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
              {p.effects?.speed && <span title="Speed Boost">⚡</span>}
              {p.effects?.shield && <span title="Shield">🛡️</span>}
              {p.effects?.magnet && <span title="Magnet">🧲</span>}
              {!p.alive && <span className="text-red-400 text-xs">(out)</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
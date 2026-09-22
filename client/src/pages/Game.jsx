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

// Fallback/starting assumption for the tick interval, matching the server's
// TICK_RATE_MS (server/src/game/constants.js). Once real gameState events
// start arriving, the client measures the actual gap between them (see
// pushState) and interpolates against that instead — this constant is only
// used before the first two ticks have landed.
const SERVER_TICK_MS = 230

// Snake body wiggle — a small sideways wave per segment, phase-shifted by
// index, purely visual (grid/collision logic is untouched). Only applied to
// body segments (index >= 1) — the head stays locked to its true position
// so the eyes read as steady/aiming rather than twitchy.
const WIGGLE_AMPLITUDE = CELL_SIZE * 0.15
const WIGGLE_SPEED = 5.5
const WIGGLE_PHASE_STEP = 0.85

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

// Per-arena board palette. `texture` picks which decoration is scattered
// through the danger zone so the dead area reads as part of the biome
// instead of flat black.
const ARENA_VISUALS = {
  meadow: {
    bg: '#07150a',
    grid: '#16301c',
    dangerFill: 'rgba(255, 107, 74, 0.12)',
    texture: 'grass',
    textureColor: '#2F6B37',
  },
  rocky_canyon: {
    bg: '#150d06',
    grid: '#2E1D10',
    dangerFill: 'rgba(255, 107, 74, 0.13)',
    texture: 'rocks',
    textureColor: '#6B573C',
  },
  frozen_lake: {
    bg: '#04121c',
    grid: '#0E2A3C',
    dangerFill: 'rgba(255, 107, 74, 0.10)',
    texture: 'frost',
    textureColor: '#2E6E8E',
  },
}

function getArenaVisuals(arenaId) {
  return ARENA_VISUALS[arenaId] || ARENA_VISUALS.meadow
}

// Per-arena theming for the page AROUND the canvas — gradient background,
// floating accent blobs, and floating themed emoji, so the whole screen
// feels like the chosen biome instead of just the board itself.
const ARENA_PAGE_THEME = {
  meadow: {
    bg: 'radial-gradient(circle at 15% 20%, #1c3a1f 0%, #050e07 55%, #030905 100%)',
    blobColors: [GRASS, SUN, SKY, '#3f7d33'],
    icons: ['🌿', '🍀', '🌼', '🐛', '🌾'],
  },
  rocky_canyon: {
    bg: 'radial-gradient(circle at 15% 20%, #3a2413 0%, #140b04 55%, #0a0502 100%)',
    blobColors: [CORAL, '#b45309', '#8B7355', SUN],
    icons: ['🪨', '⛰️', '🧱', '🏜️', '🦂'],
  },
  frozen_lake: {
    bg: 'radial-gradient(circle at 15% 20%, #123244 0%, #041019 55%, #020a10 100%)',
    blobColors: [SKY, '#38bdf8', BUBBLEGUM, '#ffffff'],
    icons: ['❄️', '🧊', '⛄', '🌨️', '🥶'],
  },
}

function getPageTheme(arenaId) {
  return ARENA_PAGE_THEME[arenaId] || ARENA_PAGE_THEME.meadow
}

const PAGE_BLOB_LAYOUT = [
  { size: 260, top: '-8%', left: '-10%', rotate: 10 },
  { size: 200, top: '68%', left: '88%', rotate: -16 },
  { size: 150, top: '2%', left: '82%', rotate: 22 },
  { size: 170, top: '75%', left: '2%', rotate: -8 },
]

const PAGE_ICON_LAYOUT = [
  { top: '10%', left: '6%', size: 34, rotate: -8, duration: 6 },
  { top: '85%', left: '10%', size: 30, rotate: 10, duration: 7 },
  { top: '14%', left: '90%', size: 32, rotate: -12, duration: 5.5 },
  { top: '82%', left: '92%', size: 28, rotate: 14, duration: 6.5 },
  { top: '46%', left: '3%', size: 26, rotate: -6, duration: 8 },
]

// Rock obstacles use a fixed stone color regardless of arena theme accent —
// only Rocky Canyon has obstacles, so this never needs to vary.
const ROCK_FILL = '#8B7355'

// TEMPORARY: mock data generator for testing rendering without backend.
// Add &arena=rocky_canyon (or frozen_lake) to preview those boards offline.
function generateMockGameState(tick, arenaId = 'meadow') {
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

  // Mirrors the server's arena shapes closely enough for visual testing.
  const mockArenas = {
    meadow: { obstacles: [], hazards: [] },
    rocky_canyon: {
      obstacles: (() => {
        const cells = []
        const r = 6
        for (let dx = -r; dx <= r; dx++) {
          const dy = r - Math.abs(dx)
          if (dy === 0 || dx === 0) continue
          cells.push({ x: 20 + dx, y: 20 + dy }, { x: 20 + dx, y: 20 - dy })
        }
        return cells
      })(),
      hazards: [],
    },
    frozen_lake: {
      obstacles: [],
      hazards: [
        { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 11 }, { x: 11, y: 11 },
        { x: 28, y: 10 }, { x: 29, y: 10 }, { x: 28, y: 11 }, { x: 29, y: 11 },
        { x: 10, y: 28 }, { x: 11, y: 28 }, { x: 10, y: 29 },
        { x: 28, y: 28 }, { x: 29, y: 28 }, { x: 28, y: 29 },
      ].map((h) => ({ ...h, active: Math.floor(Date.now() / 2500) % 2 === 0 })),
    },
  }

  const shape = mockArenas[arenaId] || mockArenas.meadow
  const meta = getArenaById(arenaId)

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
    arena: { id: meta.id, name: meta.name, theme: meta.theme, ...shape },
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

  // A couple of darker facets so each rock reads as a chunk of stone
  // rather than a flat tile.
  ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
  ctx.beginPath()
  ctx.moveTo(x + 2, y + CELL_SIZE - 3)
  ctx.lineTo(x + CELL_SIZE / 2, y + CELL_SIZE / 2)
  ctx.lineTo(x + CELL_SIZE - 2, y + CELL_SIZE - 3)
  ctx.closePath()
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

  // Crack lines across the ice, seeded per cell so they stay put.
  ctx.strokeStyle = active ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.22)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(x + 3, y + 3 + seededRandom(seed) * 4)
  ctx.lineTo(x + CELL_SIZE - 3, y + CELL_SIZE - 4 - seededRandom(seed + 3) * 4)
  ctx.stroke()

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

// Scatters biome decoration through a single danger-zone cell.
function drawTextureCell(ctx, gx, gy, kind, color) {
  const seed = gx * 733 + gy * 91
  const r = seededRandom(seed)
  if (r > 0.55) return // leave gaps so it looks scattered, not tiled

  const x = gx * CELL_SIZE
  const y = gy * CELL_SIZE
  const jx = x + 2 + seededRandom(seed + 1) * (CELL_SIZE - 6)
  const jy = y + 2 + seededRandom(seed + 2) * (CELL_SIZE - 6)

  ctx.save()
  ctx.globalAlpha = 0.65

  if (kind === 'rocks') {
    ctx.fillStyle = color
    const size = 2 + seededRandom(seed + 3) * 3
    ctx.beginPath()
    ctx.moveTo(jx, jy - size)
    ctx.lineTo(jx + size, jy)
    ctx.lineTo(jx, jy + size)
    ctx.lineTo(jx - size, jy)
    ctx.closePath()
    ctx.fill()
  } else if (kind === 'grass') {
    ctx.strokeStyle = color
    ctx.lineWidth = 1.4
    ctx.lineCap = 'round'
    for (let b = -1; b <= 1; b++) {
      ctx.beginPath()
      ctx.moveTo(jx + b * 2, jy + 3)
      ctx.quadraticCurveTo(jx + b * 2.5, jy, jx + b * 3.5, jy - 3)
      ctx.stroke()
    }
  } else if (kind === 'frost') {
    ctx.strokeStyle = color
    ctx.lineWidth = 1.2
    ctx.lineCap = 'round'
    const len = 2.5 + seededRandom(seed + 4) * 2.5
    for (let a = 0; a < 3; a++) {
      const ang = (Math.PI / 3) * a + seededRandom(seed + 5) * 0.6
      ctx.beginPath()
      ctx.moveTo(jx - Math.cos(ang) * len, jy - Math.sin(ang) * len)
      ctx.lineTo(jx + Math.cos(ang) * len, jy + Math.sin(ang) * len)
      ctx.stroke()
    }
  }

  ctx.restore()
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

// Small deterministic string hash — used to stagger each snake's blink
// cycle so multiple players don't blink in sync.
function hashStringToInt(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  return hash
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
  // avgInterval: a running estimate of the real gap between gameState
  // updates (smoothed, not a hard fixed constant). Interpolation uses this
  // instead of assuming the server always ticks at exactly TICK_RATE_MS —
  // on a host like Render's free tier, real gaps vary (cold starts, CPU
  // throttling), so pacing the glide off the measured average tracks
  // reality better than a fixed constant would.
  const stateRef = useRef({ prev: null, curr: null, lastUpdateTime: 0, avgInterval: SERVER_TICK_MS })
  const rafRef = useRef(null)
  // Cached static backdrop (background + grid + danger zone + obstacles).
  // Only rebuilt when the arena or danger ring actually changes, instead of
  // redrawing ~80 grid lines and every rock on all 60 frames per second.
  const backdropRef = useRef({ key: null, canvas: null })

  const pushState = (state) => {
    const now = performance.now()
    const prevUpdateTime = stateRef.current.lastUpdateTime
    if (prevUpdateTime) {
      const delta = now - prevUpdateTime
      // Clamp so one huge gap (tab backgrounded, cold start, a dropped
      // frame) doesn't permanently skew the running average.
      const clamped = Math.min(delta, SERVER_TICK_MS * 4)
      stateRef.current.avgInterval = stateRef.current.avgInterval
        ? stateRef.current.avgInterval * 0.8 + clamped * 0.2
        : clamped
    }
    stateRef.current.prev = stateRef.current.curr
    stateRef.current.curr = state
    stateRef.current.lastUpdateTime = now
    setGameState(state)
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const useMock = params.get('mock') === 'true'
    const mockArena = params.get('arena') || 'meadow'

    if (useMock) {
      let tick = 0
      const interval = setInterval(() => {
        tick++
        pushState(generateMockGameState(tick, mockArena))
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
      stateRef.current.avgInterval = SERVER_TICK_MS
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
      const { prev, curr, lastUpdateTime, avgInterval } = stateRef.current

      if (canvas && curr) {
        const ctx = canvas.getContext('2d')
        // Hard-capped at 1 — no extrapolation past the true last-known
        // position. An earlier version let this drift past 1 to avoid
        // freezing on a late tick, but that caused a visible
        // overshoot-then-correct wobble once the real tick landed. The
        // per-segment wiggle below now covers "still feels alive" during
        // a brief pause, without moving the snake anywhere it hasn't
        // actually been.
        const t = Math.min(1, Math.max(0, (performance.now() - lastUpdateTime) / (avgInterval || SERVER_TICK_MS)))
        drawFrame(ctx, curr, prev, t)
      }

      rafRef.current = requestAnimationFrame(renderLoop)
    }

    rafRef.current = requestAnimationFrame(renderLoop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [])

  // Builds (and caches) everything on the board that doesn't move: the biome
  // background, grid, textured danger zone and static rock obstacles.
  function getBackdrop(state) {
    const arenaId = state.arena?.id || 'meadow'
    const dangerRing = typeof state.dangerRing === 'number' ? state.dangerRing : 0
    const obstacleCount = state.arena?.obstacles?.length || 0
    const key = `${arenaId}:${dangerRing}:${obstacleCount}`

    if (backdropRef.current.key === key && backdropRef.current.canvas) {
      return backdropRef.current.canvas
    }

    const vis = getArenaVisuals(arenaId)
    const off = document.createElement('canvas')
    off.width = CANVAS_SIZE
    off.height = CANVAS_SIZE
    const octx = off.getContext('2d')

    octx.fillStyle = vis.bg
    octx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)

    octx.strokeStyle = vis.grid
    octx.lineWidth = 1
    for (let i = 0; i <= GRID_SIZE; i++) {
      octx.beginPath()
      octx.moveTo(i * CELL_SIZE, 0)
      octx.lineTo(i * CELL_SIZE, CANVAS_SIZE)
      octx.stroke()
      octx.beginPath()
      octx.moveTo(0, i * CELL_SIZE)
      octx.lineTo(CANVAS_SIZE, i * CELL_SIZE)
      octx.stroke()
    }

    if (dangerRing > 0) {
      const inset = dangerRing * CELL_SIZE
      const safeSize = Math.max(CANVAS_SIZE - inset * 2, 0)

      octx.save()
      octx.beginPath()
      octx.rect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
      octx.rect(inset, inset, safeSize, safeSize)
      octx.fillStyle = vis.dangerFill
      octx.fill('evenodd')
      octx.restore()

      // Biome decoration scattered through the dead zone only.
      for (let gx = 0; gx < GRID_SIZE; gx++) {
        for (let gy = 0; gy < GRID_SIZE; gy++) {
          const outside =
            gx < dangerRing ||
            gy < dangerRing ||
            gx >= GRID_SIZE - dangerRing ||
            gy >= GRID_SIZE - dangerRing
          if (outside) drawTextureCell(octx, gx, gy, vis.texture, vis.textureColor)
        }
      }

      drawRoughRect(octx, inset, inset, safeSize, safeSize, dangerRing, CORAL)
    }

    if (state.arena?.obstacles?.length) {
      state.arena.obstacles.forEach((o) => drawObstacleCell(octx, o.x, o.y))
    }

    backdropRef.current = { key, canvas: off }
    return off
  }

  function drawFrame(ctx, state, prevState, t) {
    ctx.drawImage(getBackdrop(state), 0, 0)

    // Hazards blink, so they're the one arena element drawn every frame.
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

    const now = Date.now()
    const playerEntries = Object.entries(state.players || {})
    playerEntries.forEach(([id, player]) => {
      if (!player.alive || !player.snake?.length) return
      const skinData = getSkinById(player.skin)
      const prevSnake = prevState?.players?.[id]?.snake
      const renderSnake = getInterpolatedSnake(prevSnake, player.snake, t)

      // Wiggle: offset each BODY segment (not the head) sideways along a
      // traveling sine wave, using the local tangent as the perpendicular
      // axis, so the wave reads as a slither. Index 0 (head) is excluded —
      // wiggling it made the head itself look twitchy/laggy rather than
      // alive, since it's what the eyes are attached to.
      const wiggled = renderSnake.map((seg, idx) => {
        if (idx === 0) {
          return { x: seg.x * CELL_SIZE, y: seg.y * CELL_SIZE }
        }
        const prevPt = renderSnake[Math.max(0, idx - 1)]
        const nextPt = renderSnake[Math.min(renderSnake.length - 1, idx + 1)]
        const tangent = { x: nextPt.x - prevPt.x, y: nextPt.y - prevPt.y }
        const tLen = Math.hypot(tangent.x, tangent.y) || 1
        const perp = { x: -tangent.y / tLen, y: tangent.x / tLen }
        const wave = Math.sin(now / 1000 * WIGGLE_SPEED - idx * WIGGLE_PHASE_STEP) * WIGGLE_AMPLITUDE
        return {
          x: seg.x * CELL_SIZE + perp.x * wave,
          y: seg.y * CELL_SIZE + perp.y * wave,
        }
      })

      wiggled.forEach((pos, segIdx) => {
        const isHead = segIdx === 0
        const color = isHead ? skinData.head : skinData.body

        ctx.fillStyle = color
        ctx.shadowColor = color
        ctx.shadowBlur = isHead ? 8 : 3
        ctx.beginPath()
        ctx.roundRect(pos.x + 1, pos.y + 1, CELL_SIZE - 2, CELL_SIZE - 2, isHead ? CELL_SIZE / 2 : 3)
        ctx.fill()
        ctx.shadowBlur = 0
      })

      const head = player.snake[0]
      const neck = player.snake[1] || head
      let facing = { x: head.x - neck.x, y: head.y - neck.y }
      if (facing.x === 0 && facing.y === 0) facing = { x: 1, y: 0 }

      const headPos = wiggled[0]
      const hx = headPos.x + CELL_SIZE / 2
      const hy = headPos.y + CELL_SIZE / 2
      const perp = { x: -facing.y, y: facing.x }
      const eyeSpacing = CELL_SIZE / 4
      const eyeForward = CELL_SIZE / 6

      const eyes = [1, -1].map((side) => ({
        x: hx + perp.x * eyeSpacing * side + facing.x * eyeForward,
        y: hy + perp.y * eyeSpacing * side + facing.y * eyeForward,
      }))

      // Each snake blinks on its own staggered cycle (hashed from its
      // socket id) so multiple players don't blink in sync.
      const blinkOffset = hashStringToInt(id) % 4000
      const blinking = (now + blinkOffset) % 4000 < 140

      eyes.forEach((eye) => {
        if (blinking) {
          ctx.strokeStyle = '#111827'
          ctx.lineWidth = 1.6
          ctx.lineCap = 'round'
          ctx.beginPath()
          ctx.moveTo(eye.x - CELL_SIZE / 10, eye.y)
          ctx.lineTo(eye.x + CELL_SIZE / 10, eye.y)
          ctx.stroke()
          return
        }

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
        const pulseT = now / 300
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
  const pageTheme = getPageTheme(gameState?.arena?.id)

  return (
    <div
      className="min-h-screen relative overflow-hidden flex flex-col lg:flex-row items-center justify-center gap-6 p-4"
      style={{ background: pageTheme.bg }}
    >
      {PAGE_BLOB_LAYOUT.map((b, i) => (
        <motion.div
          key={i}
          className="absolute pointer-events-none"
          style={{
            width: b.size,
            height: b.size,
            top: b.top,
            left: b.left,
            background: pageTheme.blobColors[i % pageTheme.blobColors.length],
            opacity: 0.18,
            borderRadius: '58% 42% 65% 35% / 45% 55% 45% 55%',
            filter: 'blur(1px)',
          }}
          animate={{ rotate: [b.rotate, b.rotate + 10, b.rotate] }}
          transition={{ duration: 10 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}

      {PAGE_ICON_LAYOUT.map((ic, i) => (
        <motion.span
          key={i}
          className="absolute pointer-events-none select-none"
          style={{
            top: ic.top,
            left: ic.left,
            fontSize: ic.size,
            transform: `rotate(${ic.rotate}deg)`,
            opacity: 0.55,
          }}
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: ic.duration, repeat: Infinity, ease: 'easeInOut' }}
        >
          {pageTheme.icons[i % pageTheme.icons.length]}
        </motion.span>
      ))}

      <motion.div className="relative z-10" animate={shakeControls}>
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
      <div className="relative z-10 lg:hidden grid grid-cols-3 gap-2 w-40 mx-auto mt-4">
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

      <div
        className="relative z-10 bg-zinc-900/90 rounded-2xl p-4 w-full lg:w-56"
        style={{ border: `1.5px solid ${arenaMeta.theme}` }}
      >
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
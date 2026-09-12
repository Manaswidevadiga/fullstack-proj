export const ARENAS = [
  { id: 'meadow', name: 'Meadow', emoji: '🌿', theme: '#4ade80' },
  { id: 'rocky_canyon', name: 'Rocky Canyon', emoji: '🪨', theme: '#b45309' },
  { id: 'frozen_lake', name: 'Frozen Lake', emoji: '❄️', theme: '#38bdf8' },
]

export const DEFAULT_ARENA_ID = ARENAS[0].id

export function getArenaById(id) {
  return ARENAS.find((a) => a.id === id) || ARENAS[0]
}
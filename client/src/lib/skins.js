export const SKINS = [
  { id: 'classic', name: 'Classic', body: '#4ade80', head: '#22c55e' },
  { id: 'ocean', name: 'Ocean', body: '#38bdf8', head: '#0ea5e9' },
  { id: 'sunset', name: 'Sunset', body: '#fb923c', head: '#f97316' },
  { id: 'bubblegum', name: 'Bubblegum', body: '#f472b6', head: '#ec4899' },
  { id: 'grape', name: 'Grape', body: '#a78bfa', head: '#8b5cf6' },
  { id: 'gold', name: 'Gold', body: '#facc15', head: '#eab308' },
]

// Costume pack skins — locked until their unlockId shows up in the
// account's /api/skins response (granted server-side in
// GameRoom.checkAndGrantUnlocks after a win in the matching arena).
export const PACK_SKINS = [
  { id: 'sandstone', name: 'Sandstone', body: '#c9a774', head: '#a9805a', unlockId: 'canyon_pack' },
  { id: 'obsidian', name: 'Obsidian', body: '#4b4b4b', head: '#2b2b2b', unlockId: 'canyon_pack' },
  { id: 'glacier', name: 'Glacier', body: '#a8e6f0', head: '#6fd0e6', unlockId: 'frost_pack' },
  { id: 'aurora', name: 'Aurora', body: '#9df2c7', head: '#5fd6a6', unlockId: 'frost_pack' },
]

// Groups the pack skins above for picker UI — one unlock hint per pack,
// not per skin.
export const SKIN_PACKS = [
  { unlockId: 'canyon_pack', name: 'Canyon Pack', hint: 'Win a match in Rocky Canyon', skinIds: ['sandstone', 'obsidian'] },
  { unlockId: 'frost_pack', name: 'Frost Pack', hint: 'Win a match in Frozen Lake', skinIds: ['glacier', 'aurora'] },
]

export const CUSTOM_SKIN_ID = 'custom'
export const CUSTOM_UNLOCK_ID = 'custom_designer'
export const CUSTOM_UNLOCK_HINT = 'Win 5 matches (any arena)'

export const DEFAULT_SKIN_ID = SKINS[0].id

const ALL_PRESET_SKINS = [...SKINS, ...PACK_SKINS]

// customColors, when provided, overrides body/head for the 'custom' skin —
// each account's saved design lives in the DB, not in this static list.
// Game.jsx passes player.customColors (sent per-player in server state);
// Home.jsx passes the signed-in user's own fetched customSkin.
export function getSkinById(id, customColors = null) {
  if (id === CUSTOM_SKIN_ID && customColors) {
    return { id: CUSTOM_SKIN_ID, name: 'Custom', body: customColors.body, head: customColors.head }
  }
  return ALL_PRESET_SKINS.find((s) => s.id === id) || SKINS[0]
}
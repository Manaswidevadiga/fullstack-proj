export const SKINS = [
  { id: 'classic', name: 'Classic', body: '#4ade80', head: '#22c55e' },
  { id: 'ocean', name: 'Ocean', body: '#38bdf8', head: '#0ea5e9' },
  { id: 'sunset', name: 'Sunset', body: '#fb923c', head: '#f97316' },
  { id: 'bubblegum', name: 'Bubblegum', body: '#f472b6', head: '#ec4899' },
  { id: 'grape', name: 'Grape', body: '#a78bfa', head: '#8b5cf6' },
  { id: 'gold', name: 'Gold', body: '#facc15', head: '#eab308' },
]

export const DEFAULT_SKIN_ID = SKINS[0].id

export function getSkinById(id) {
  return SKINS.find((s) => s.id === id) || SKINS[0]
}
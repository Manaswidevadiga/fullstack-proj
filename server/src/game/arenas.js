const { GRID_SIZE } = require('./constants');

const DEFAULT_ARENA_ID = 'meadow';
const HAZARD_BLINK_MS = 2500; // wall-clock hazard toggle period, shared by all clients/server

const CENTER = { x: Math.floor(GRID_SIZE / 2), y: Math.floor(GRID_SIZE / 2) };
const CANYON_RING_RADIUS = 5;

// Generates the outline of a Manhattan-distance diamond around a center point.
// radius=5 -> exactly 20 cells, safely clear of every spawn point (all near edges/corners).
function buildDiamondRing(center, radius) {
  const cells = [];
  for (let dx = -radius; dx <= radius; dx++) {
    const dy = radius - Math.abs(dx);
    if (dy === 0) {
      cells.push({ x: center.x + dx, y: center.y });
    } else {
      cells.push({ x: center.x + dx, y: center.y + dy });
      cells.push({ x: center.x + dx, y: center.y - dy });
    }
  }
  return cells;
}

// 4 small clusters, ~14 cells total, placed at the grid's quarter-points —
// well clear of spawns (corners/edges) and clear of the Rocky Canyon ring (center).
function buildHazardClusters() {
  return [
    // NW cluster (4 cells)
    { x: 10, y: 10 }, { x: 11, y: 10 }, { x: 10, y: 11 }, { x: 11, y: 11 },
    // NE cluster (4 cells)
    { x: 28, y: 10 }, { x: 29, y: 10 }, { x: 28, y: 11 }, { x: 29, y: 11 },
    // SW cluster (3 cells)
    { x: 10, y: 28 }, { x: 11, y: 28 }, { x: 10, y: 29 },
    // SE cluster (3 cells)
    { x: 28, y: 28 }, { x: 29, y: 28 }, { x: 28, y: 29 }
  ];
}

const ARENAS = {
  meadow: {
    id: 'meadow',
    name: 'Meadow',
    theme: 'green',
    obstacles: [],
    hazards: []
  },
  rocky_canyon: {
    id: 'rocky_canyon',
    name: 'Rocky Canyon',
    theme: 'brown',
    obstacles: buildDiamondRing(CENTER, CANYON_RING_RADIUS),
    hazards: []
  },
  frozen_lake: {
    id: 'frozen_lake',
    name: 'Frozen Lake',
    theme: 'ice-blue',
    obstacles: [],
    hazards: buildHazardClusters()
  }
};

function getArenaById(id) {
  return ARENAS[id] || ARENAS[DEFAULT_ARENA_ID];
}

module.exports = { ARENAS, getArenaById, DEFAULT_ARENA_ID, HAZARD_BLINK_MS };
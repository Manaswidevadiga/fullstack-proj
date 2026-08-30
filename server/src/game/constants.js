module.exports = {
  GRID_SIZE: 40,
  TICK_RATE_MS: 230,
  SHRINK_INTERVAL_MS: 20000,
  MAX_PLAYERS_PER_ROOM: 6,
  DIRECTIONS: {
    UP: { x: 0, y: -1 },
    DOWN: { x: 0, y: 1 },
    LEFT: { x: -1, y: 0 },
    RIGHT: { x: 1, y: 0 }
  },
  POWERUP_TYPES: ['speed', 'shield', 'magnet'],
  MAX_POWERUPS_ON_BOARD: 2,
  SPEED_BOOST_DURATION_MS: 4000,
  MAGNET_DURATION_MS: 5000,
  MAGNET_RADIUS: 3
};
const pool = require('../config/db');
const {
  GRID_SIZE,
  TICK_RATE_MS,
  SHRINK_INTERVAL_MS,
  POWERUP_TYPES,
  MAX_POWERUPS_ON_BOARD,
  SPEED_BOOST_DURATION_MS,
  MAGNET_DURATION_MS,
  MAGNET_RADIUS,
  DANGER_WARNING_LEAD_MS
} = require('./constants');
const { getArenaById, DEFAULT_ARENA_ID, HAZARD_BLINK_MS } = require('./arenas');
const VALID_SKINS = ['classic', 'ocean', 'sunset', 'bubblegum', 'grape', 'gold'];
const DEFAULT_SKIN = 'classic';

class GameRoom {
  constructor(roomCode, io) {
    this.roomCode = roomCode;
    this.io = io;
    this.players = {};
    this.food = { x: 10, y: 10 };
    this.powerUps = [];
    this.powerUpIdCounter = 0;
    this.dangerRing = 0;
    this.tickInterval = null;
    this.shrinkInterval = null;
    this.warningTimeout = null;
    this.warningInterval = null;
    this.started = false;
    this.rematchReady = new Set();
    this.hostId = null;
    this.arena = getArenaById(DEFAULT_ARENA_ID);
  }

  addPlayer(socketId, username, isGuest = false, skin = DEFAULT_SKIN, userId = null) {
    if (Object.keys(this.players).length === 0) {
      this.hostId = socketId; // first player in an empty room becomes host
    }
    const spawn = this.getSpawnPoint(Object.keys(this.players).length);
    this.players[socketId] = {
      username,
      isGuest,
      userId, // real account id when authenticated via socket handshake JWT, else null
      skin: VALID_SKINS.includes(skin) ? skin : DEFAULT_SKIN, // never trust client input directly
      snake: [{ x: spawn.x, y: spawn.y }],
      direction: spawn.direction,
      pendingDirection: spawn.direction,
      alive: true,
      speedBoostUntil: 0,
      shielded: false,
      magnetUntil: 0
    };
    this.food = this.randomFreeCell();
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    this.rematchReady.delete(socketId);
    if (this.hostId === socketId) {
      const remaining = Object.keys(this.players);
      this.hostId = remaining.length > 0 ? remaining[0] : null; // migrate host if they leave
    }
  }

  isHost(socketId) {
    return this.hostId === socketId;
  }

  setArena(arenaId) {
    if (this.started) return false; // arena is locked once the round begins
    this.arena = getArenaById(arenaId); // getArenaById falls back to default on a bad id
    return true;
  }

  isObstacleCell(cell) {
    return this.arena.obstacles.some((o) => o.x === cell.x && o.y === cell.y);
  }

  isActiveHazard(cell, now) {
    if (!this.arena.hazards.some((h) => h.x === cell.x && h.y === cell.y)) return false;
    return Math.floor(now / HAZARD_BLINK_MS) % 2 === 0;
  }

  getSpawnPoint(index) {
    const spawns = [
      { x: 2, y: 2, direction: { x: 1, y: 0 } },
      { x: GRID_SIZE - 3, y: 2, direction: { x: -1, y: 0 } },
      { x: 2, y: GRID_SIZE - 3, direction: { x: 1, y: 0 } },
      { x: GRID_SIZE - 3, y: GRID_SIZE - 3, direction: { x: -1, y: 0 } },
      { x: Math.floor(GRID_SIZE / 2), y: 2, direction: { x: 0, y: 1 } },
      { x: Math.floor(GRID_SIZE / 2), y: GRID_SIZE - 3, direction: { x: 0, y: -1 } }
    ];
    return spawns[index] || { x: 5, y: 5, direction: { x: 1, y: 0 } };
  }

  randomFreeCell() {
    let cell;
    let attempts = 0;
    do {
      cell = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      attempts++;
    } while (
      (this.isCellOccupied(cell) || this.isInDangerZone(cell) || this.isPowerUpCell(cell) || this.isObstacleCell(cell)) &&
      attempts < 1000
    );
    return cell;
  }

  randomFreePowerUpCell() {
    let cell;
    let attempts = 0;
    do {
      cell = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
      attempts++;
    } while (
      attempts < 1000 &&
      (this.isCellOccupied(cell) ||
        this.isInDangerZone(cell) ||
        this.isPowerUpCell(cell) ||
        this.isObstacleCell(cell) ||
        (this.food.x === cell.x && this.food.y === cell.y))
    );
    return attempts < 1000 ? cell : null;
  }

  isCellOccupied(cell) {
    return Object.values(this.players).some((p) => p.snake.some((seg) => seg.x === cell.x && seg.y === cell.y));
  }

  isPowerUpCell(cell) {
    return this.powerUps.some((p) => p.x === cell.x && p.y === cell.y);
  }

  spawnPowerUp() {
    if (this.powerUps.length >= MAX_POWERUPS_ON_BOARD) return;
    const cell = this.randomFreePowerUpCell();
    if (!cell) return;
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    this.powerUpIdCounter += 1;
    this.powerUps.push({ id: this.powerUpIdCounter, type, x: cell.x, y: cell.y });
  }

  applyPowerUp(player, type, now) {
    if (type === 'speed') {
      player.speedBoostUntil = now + SPEED_BOOST_DURATION_MS;
    } else if (type === 'shield') {
      player.shielded = true;
    } else if (type === 'magnet') {
      player.magnetUntil = now + MAGNET_DURATION_MS;
    }
  }

  setDirection(socketId, dir) {
    const player = this.players[socketId];
    if (!player || !player.alive) return;
    const current = player.direction;
    if (dir.x === -current.x && dir.y === -current.y) return;
    player.pendingDirection = dir;
  }

  start() {
    this.started = true;
    this.tickInterval = setInterval(() => this.tick(), TICK_RATE_MS);
    this.shrinkInterval = setInterval(() => this.shrinkArena(), SHRINK_INTERVAL_MS);

    // Broadcast a warning shortly before each shrink so the client can
    // shake the board / flash a banner ahead of time, not just after.
    const leadTime = Math.max(SHRINK_INTERVAL_MS - DANGER_WARNING_LEAD_MS, 0);
    this.warningTimeout = setTimeout(() => {
      this.emitShrinkWarning();
      this.warningInterval = setInterval(() => this.emitShrinkWarning(), SHRINK_INTERVAL_MS);
    }, leadTime);
  }

  stop() {
    clearInterval(this.tickInterval);
    clearInterval(this.shrinkInterval);
    clearTimeout(this.warningTimeout);
    clearInterval(this.warningInterval);
  }

  emitShrinkWarning() {
    this.io.to(this.roomCode).emit('dangerZoneWarning', {});
  }

  resetForRematch() {
    const ids = Object.keys(this.players);
    ids.forEach((id, index) => {
      const spawn = this.getSpawnPoint(index);
      const p = this.players[id];
      p.snake = [{ x: spawn.x, y: spawn.y }];
      p.direction = spawn.direction;
      p.pendingDirection = spawn.direction;
      p.alive = true;
      p.speedBoostUntil = 0;
      p.shielded = false;
      p.magnetUntil = 0;
    });
    this.dangerRing = 0;
    this.powerUps = [];
    this.food = this.randomFreeCell();
    this.started = false;
    this.rematchReady.clear();
    // arena is intentionally left as-is, so it persists across a rematch
    // unless the host explicitly picks a new one via setArena()
  }

  shrinkArena() {
    this.dangerRing += 1;
    if (this.isInDangerZone(this.food)) {
      this.food = this.randomFreeCell();
    }
    this.powerUps = this.powerUps.filter((p) => !this.isInDangerZone(p));
    this.spawnPowerUp(); // a power-up appears each time the zone shrinks, up to the cap
    this.io.to(this.roomCode).emit('arenaShrink', { dangerRing: this.dangerRing });
  }

  isInDangerZone(cell) {
    return (
      cell.x < this.dangerRing ||
      cell.y < this.dangerRing ||
      cell.x >= GRID_SIZE - this.dangerRing ||
      cell.y >= GRID_SIZE - this.dangerRing
    );
  }

  tick() {
    const now = Date.now();

    for (const player of Object.values(this.players)) {
      if (!player.alive) continue;
      player.direction = player.pendingDirection;

      const steps = player.speedBoostUntil > now ? 2 : 1;

      for (let step = 0; step < steps; step++) {
        if (!player.alive) break;

        const head = player.snake[0];
        const newHead = { x: head.x + player.direction.x, y: head.y + player.direction.y };
        player.snake.unshift(newHead);

        let grew = false;

        if (newHead.x === this.food.x && newHead.y === this.food.y) {
          this.food = this.randomFreeCell();
          grew = true;
        } else if (player.magnetUntil > now) {
          const dist = Math.abs(newHead.x - this.food.x) + Math.abs(newHead.y - this.food.y);
          if (dist <= MAGNET_RADIUS) {
            this.food = this.randomFreeCell();
            grew = true;
          }
        }

        const hitIndex = this.powerUps.findIndex((p) => p.x === newHead.x && p.y === newHead.y);
        if (hitIndex !== -1) {
          this.applyPowerUp(player, this.powerUps[hitIndex].type, now);
          this.powerUps.splice(hitIndex, 1);
        }

        if (!grew) {
          player.snake.pop();
        }

        const stepHead = player.snake[0];
        const outOfBounds =
          stepHead.x < 0 || stepHead.y < 0 || stepHead.x >= GRID_SIZE || stepHead.y >= GRID_SIZE;
        const inDanger = this.isInDangerZone(stepHead);
        const hitObstacle = this.isObstacleCell(stepHead);
        const hitActiveHazard = this.isActiveHazard(stepHead, now);
        const hitSelf = player.snake.slice(1).some((seg) => seg.x === stepHead.x && seg.y === stepHead.y);

        if (outOfBounds || inDanger || hitObstacle || hitActiveHazard || hitSelf) {
          if (player.shielded) {
            player.shielded = false;
          } else {
            player.alive = false;
          }
        }
      }
    }

    for (const [id, player] of Object.entries(this.players)) {
      if (!player.alive) continue;
      const head = player.snake[0];

      for (const [otherId, other] of Object.entries(this.players)) {
        if (otherId === id || !other.alive) continue;
        if (other.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
          if (player.shielded) {
            player.shielded = false;
          } else {
            player.alive = false;
          }
        }
      }
    }

    this.io.to(this.roomCode).emit('gameState', this.getState(now));

    const aliveCount = Object.values(this.players).filter((p) => p.alive).length;
    if (aliveCount <= 1 && Object.keys(this.players).length > 1) {
      const winnerEntry = Object.values(this.players).find((p) => p.alive);
      this.io.to(this.roomCode).emit('gameOver', { winner: winnerEntry ? winnerEntry.username : null });
      this.saveMatchResult(winnerEntry);
      this.stop();
    }
  }

  getState(now = Date.now()) {
    return {
      players: Object.fromEntries(
        Object.entries(this.players).map(([id, p]) => [
          id,
          {
            username: p.username,
            snake: p.snake,
            alive: p.alive,
            skin: p.skin,
            effects: {
              speed: p.speedBoostUntil > now,
              shield: p.shielded,
              magnet: p.magnetUntil > now
            }
          }
        ])
      ),
      food: this.food,
      powerUps: this.powerUps,
      dangerRing: this.dangerRing,
      hostId: this.hostId,
      arena: {
        id: this.arena.id,
        name: this.arena.name,
        theme: this.arena.theme,
        obstacles: this.arena.obstacles,
        hazards: this.arena.hazards.map((h) => ({
          x: h.x,
          y: h.y,
          active: this.isActiveHazard(h, now)
        }))
      }
    };
  }

  async saveMatchResult(winnerEntry) {
    const playerSnapshot = Object.values(this.players)
      .filter((p) => !p.isGuest)
      .map((p) => ({
        username: p.username,
        userId: p.userId,
        length: p.snake.length,
        alive: p.alive
      }));

    if (playerSnapshot.length === 0) {
      console.log(`Match in room ${this.roomCode} had no registered players — skipping save.`);
      return;
    }

    try {
      const matchResult = await pool.query(
        'INSERT INTO matches (room_code, arena_id, ended_at) VALUES ($1, $2, NOW()) RETURNING id',
        [this.roomCode, this.arena.id]
      );
      const matchId = matchResult.rows[0].id;

      for (const player of playerSnapshot) {
        await pool.query(
          'INSERT INTO match_players (match_id, guest_name, user_id, final_length, placement) VALUES ($1, $2, $3, $4, $5)',
          [matchId, player.username, player.userId, player.length, player.alive ? 1 : null]
        );
      }
      console.log(`Match ${matchId} saved (${playerSnapshot.length} registered players).`);

      // Costume-pack / custom-designer unlocks — only the winner earns
      // anything, and only if they're a registered (non-guest) player.
      if (winnerEntry && !winnerEntry.isGuest && winnerEntry.userId) {
        await this.checkAndGrantUnlocks(winnerEntry.userId);
      }
    } catch (err) {
      console.error('Failed to save match:', err);
    }
  }

  async checkAndGrantUnlocks(userId) {
    const earned = [];

    if (this.arena.id === 'rocky_canyon') earned.push('canyon_pack');
    if (this.arena.id === 'frozen_lake') earned.push('frost_pack');

    const winCountResult = await pool.query(
      'SELECT COUNT(*) FROM match_players WHERE user_id = $1 AND placement = 1',
      [userId]
    );
    const totalWins = parseInt(winCountResult.rows[0].count, 10);
    if (totalWins >= 5) earned.push('custom_designer');

    for (const unlockId of earned) {
      await pool.query(
        'INSERT INTO user_unlocks (user_id, unlock_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [userId, unlockId]
      );
    }
  }
}

module.exports = GameRoom;
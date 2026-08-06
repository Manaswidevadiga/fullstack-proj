const pool = require('../config/db');
const { GRID_SIZE, TICK_RATE_MS, SHRINK_INTERVAL_MS } = require('./constants');

class GameRoom {
  constructor(roomCode, io) {
    this.roomCode = roomCode;
    this.io = io;
    this.players = {};
    this.food = { x: 10, y: 10 };
    this.dangerRing = 0;
    this.tickInterval = null;
    this.shrinkInterval = null;
    this.started = false;
  }

 addPlayer(socketId, username) {
  const spawn = this.getSpawnPoint(Object.keys(this.players).length);
  this.players[socketId] = {
    username,
    snake: [{ x: spawn.x, y: spawn.y }],
    direction: spawn.direction,
    pendingDirection: spawn.direction,
    alive: true
  };
  this.food = this.randomFreeCell();
}

  removePlayer(socketId) {
    delete this.players[socketId];
  }

  getSpawnPoint(index) {
  const spawns = [
    { x: 2, y: 2, direction: { x: 1, y: 0 } },                                    // top-left, move right
    { x: GRID_SIZE - 3, y: 2, direction: { x: -1, y: 0 } },                       // top-right, move left
    { x: 2, y: GRID_SIZE - 3, direction: { x: 1, y: 0 } },                        // bottom-left, move right
    { x: GRID_SIZE - 3, y: GRID_SIZE - 3, direction: { x: -1, y: 0 } },           // bottom-right, move left
    { x: Math.floor(GRID_SIZE / 2), y: 2, direction: { x: 0, y: 1 } },            // top-mid, move down
    { x: Math.floor(GRID_SIZE / 2), y: GRID_SIZE - 3, direction: { x: 0, y: -1 } } // bottom-mid, move up
  ];
  return spawns[index] || { x: 5, y: 5, direction: { x: 1, y: 0 } };
}

  randomFreeCell() {
    let cell;
    do {
      cell = { x: Math.floor(Math.random() * GRID_SIZE), y: Math.floor(Math.random() * GRID_SIZE) };
    } while (this.isCellOccupied(cell));
    return cell;
  }

  isCellOccupied(cell) {
    return Object.values(this.players).some((p) => p.snake.some((seg) => seg.x === cell.x && seg.y === cell.y));
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
  }

  stop() {
    clearInterval(this.tickInterval);
    clearInterval(this.shrinkInterval);
  }

  shrinkArena() {
    this.dangerRing += 1;
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
    for (const player of Object.values(this.players)) {
      if (!player.alive) continue;
      player.direction = player.pendingDirection;
      const head = player.snake[0];
      const newHead = { x: head.x + player.direction.x, y: head.y + player.direction.y };
      player.snake.unshift(newHead);

      if (newHead.x === this.food.x && newHead.y === this.food.y) {
        this.food = this.randomFreeCell();
      } else {
        player.snake.pop();
      }
    }

    for (const [id, player] of Object.entries(this.players)) {
      if (!player.alive) continue;
      const head = player.snake[0];

      if (head.x < 0 || head.y < 0 || head.x >= GRID_SIZE || head.y >= GRID_SIZE || this.isInDangerZone(head)) {
        player.alive = false;
        continue;
      }

      if (player.snake.slice(1).some((seg) => seg.x === head.x && seg.y === head.y)) {
        player.alive = false;
        continue;
      }

      for (const [otherId, other] of Object.entries(this.players)) {
        if (otherId === id || !other.alive) continue;
        if (other.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
          player.alive = false;
        }
      }
    }

    this.io.to(this.roomCode).emit('gameState', this.getState());

    const aliveCount = Object.values(this.players).filter((p) => p.alive).length;
if (aliveCount <= 1 && Object.keys(this.players).length > 1) {
  const winnerEntry = Object.values(this.players).find((p) => p.alive);
  this.io.to(this.roomCode).emit('gameOver', { winner: winnerEntry ? winnerEntry.username : null });
  this.saveMatchResult(winnerEntry);
  this.stop();
}
  }

  getState() {
    return {
      players: Object.fromEntries(
        Object.entries(this.players).map(([id, p]) => [id, { username: p.username, snake: p.snake, alive: p.alive }])
      ),
      food: this.food,
      dangerRing: this.dangerRing
    };
  }
async saveMatchResult(winnerEntry) {
  const playerSnapshot = Object.values(this.players).map((p) => ({
    username: p.username,
    length: p.snake.length,
    alive: p.alive
  }));

  try {
    const matchResult = await pool.query(
      'INSERT INTO matches (room_code, ended_at) VALUES ($1, NOW()) RETURNING id',
      [this.roomCode]
    );
    const matchId = matchResult.rows[0].id;

    for (const player of playerSnapshot) {
      await pool.query(
        'INSERT INTO match_players (match_id, guest_name, final_length, placement) VALUES ($1, $2, $3, $4)',
        [matchId, player.username, player.length, player.alive ? 1 : null]
      );
    }
    console.log(`Match ${matchId} saved (${playerSnapshot.length} players).`);
  } catch (err) {
    console.error('Failed to save match:', err);
  }
}
}

module.exports = GameRoom;
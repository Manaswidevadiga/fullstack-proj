const { io } = require('socket.io-client');

const SERVER_URL = 'http://localhost:5000';
const NUM_PLAYERS = 3;
const players = [];
let roomCode = null;

function createPlayer(index) {
  const socket = io(SERVER_URL);
  const name = `Player${index}`;

  socket.on('connect', () => {
    console.log(`${name} connected (${socket.id})`);

    if (index === 0) {
      socket.emit('createRoom', { username: name }, (res) => {
        roomCode = res.roomCode;
        console.log(`Room created: ${roomCode}`);
        joinRestOfPlayers();
      });
    }
  });

  socket.on('gameState', (state) => {
    const me = state.players[socket.id];
    if (me) {
      console.log(`${name} | alive: ${me.alive} | length: ${me.snake.length} | head: (${me.snake[0].x},${me.snake[0].y})`);
    }
  });

  socket.on('gameOver', (data) => {
    console.log(`\n GAME OVER — Winner: ${data.winner}\n`);
    setTimeout(() => process.exit(0), 1000);
  });

  socket.on('arenaShrink', (data) => {
    console.log(`Arena shrinking — dangerRing: ${data.dangerRing}`);
  });

  players.push({ socket, name });
}

function joinRestOfPlayers() {
  for (let i = 1; i < NUM_PLAYERS; i++) {
    const p = players[i];
    p.socket.emit('joinRoom', { roomCode, username: p.name }, () => {
      console.log(`${p.name} joined room ${roomCode}`);
    });
  }

  setTimeout(() => {
    console.log('\nStarting game...\n');
    players[0].socket.emit('startGame');
    randomizeMoves();
  }, 1000);
}

function randomizeMoves() {
  const directions = ['UP', 'DOWN', 'LEFT', 'RIGHT'];
  setInterval(() => {
    players.forEach((p) => {
      const dir = directions[Math.floor(Math.random() * directions.length)];
      p.socket.emit('changeDirection', dir);
    });
  }, 500);
}

for (let i = 0; i < NUM_PLAYERS; i++) {
  createPlayer(i);
}
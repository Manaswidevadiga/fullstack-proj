const jwt = require('jsonwebtoken');
const GameRoom = require('../game/GameRoom');
const { DIRECTIONS, MAX_PLAYERS_PER_ROOM } = require('../game/constants');

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

function findOpenRoom() {
  return Object.values(rooms).find(
    (room) => !room.started && Object.keys(room.players).length < MAX_PLAYERS_PER_ROOM
  );
}

module.exports = function (io) {
  // Verifies the JWT sent in the socket handshake (if any), once per
  // connection — so unlocks/custom skins can be tied to a real account
  // instead of trusting whatever username the client claims in its event
  // payloads. Missing or invalid/expired tokens fall back to guest rather
  // than rejecting the connection outright.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      socket.data.userId = null;
      socket.data.verifiedUsername = null;
      return next();
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.data.userId = decoded.id;
      socket.data.verifiedUsername = decoded.username;
    } catch {
      socket.data.userId = null;
      socket.data.verifiedUsername = null;
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log('connected:', socket.id);

    // The server-verified identity from the handshake always wins over
    // whatever the client's event payload claims — this is what actually
    // prevents someone from spoofing another account's username.
    function resolveIdentity(payload) {
      if (socket.data.userId) {
        return { username: socket.data.verifiedUsername, isGuest: false, userId: socket.data.userId };
      }
      return { username: payload.username, isGuest: true, userId: null };
    }

    socket.on('createRoom', ({ username, isGuest, skin }, callback) => {
      const identity = resolveIdentity({ username, isGuest });
      const roomCode = generateRoomCode();
      rooms[roomCode] = new GameRoom(roomCode, io);
      rooms[roomCode].addPlayer(socket.id, identity.username, identity.isGuest, skin, identity.userId);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      callback({ roomCode });
      io.to(roomCode).emit('lobbyUpdate', rooms[roomCode].getState());
    });

    socket.on('joinRoom', ({ roomCode, username, isGuest, skin }, callback) => {
      console.log(`joinRoom attempt: roomCode="${roomCode}", username="${username}"`);
      const room = rooms[roomCode];
      if (!room) return callback({ error: 'Room not found' });
      if (room.started) return callback({ error: 'Game already in progress' });
      if (Object.keys(room.players).length >= MAX_PLAYERS_PER_ROOM) {
        return callback({ error: 'Room is full' });
      }
      const identity = resolveIdentity({ username, isGuest });
      room.addPlayer(socket.id, identity.username, identity.isGuest, skin, identity.userId);
      console.log('Players in room after join:', Object.keys(room.players));
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      callback({ success: true });
      io.to(roomCode).emit('lobbyUpdate', room.getState());
    });

    socket.on('quickJoin', ({ username, isGuest, skin }, callback) => {
      const identity = resolveIdentity({ username, isGuest });
      let room = findOpenRoom();
      let roomCode;

      if (room) {
        roomCode = room.roomCode;
      } else {
        roomCode = generateRoomCode();
        room = new GameRoom(roomCode, io);
        rooms[roomCode] = room;
      }

      room.addPlayer(socket.id, identity.username, identity.isGuest, skin, identity.userId);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      callback({ roomCode });
      io.to(roomCode).emit('lobbyUpdate', room.getState());
    });

    socket.on('startGame', () => {
      const room = rooms[socket.data.roomCode];
      console.log(`startGame called. Room: ${socket.data.roomCode}, players:`, room ? Object.keys(room.players) : 'ROOM NOT FOUND');
      if (!room) return;
      if (!room.isHost(socket.id)) {
        socket.emit('startGameError', { error: 'Only the room host can start the game' });
        return;
      }
      if (!room.started) room.start();
    });

    socket.on('selectArena', (arenaId) => {
      const room = rooms[socket.data.roomCode];
      if (!room) return;
      if (!room.isHost(socket.id)) {
        socket.emit('selectArenaError', { error: 'Only the room host can change the arena' });
        return;
      }
      const applied = room.setArena(arenaId);
      if (!applied) {
        socket.emit('selectArenaError', { error: 'Arena cannot be changed once the game has started' });
        return;
      }
      io.to(socket.data.roomCode).emit('lobbyUpdate', room.getState());
    });

    socket.on('playAgain', () => {
      const room = rooms[socket.data.roomCode];
      if (!room) return;

      room.rematchReady.add(socket.id);
      const totalPlayers = Object.keys(room.players).length;
      const readyCount = room.rematchReady.size;

      io.to(socket.data.roomCode).emit('rematchStatus', { ready: readyCount, total: totalPlayers });

      if (readyCount >= totalPlayers) {
        room.resetForRematch();
        io.to(socket.data.roomCode).emit('rematchReady', room.getState());
        room.start();
      }
    });

    socket.on('changeDirection', (dirName) => {
      const room = rooms[socket.data.roomCode];
      if (room && DIRECTIONS[dirName]) {
        room.setDirection(socket.id, DIRECTIONS[dirName]);
      }
    });

    socket.on('disconnect', () => {
      const room = rooms[socket.data.roomCode];
      if (room) {
        room.removePlayer(socket.id);
        if (Object.keys(room.players).length === 0) {
          room.stop();
          delete rooms[socket.data.roomCode];
          return;
        }
        io.to(socket.data.roomCode).emit('lobbyUpdate', room.getState());
        io.to(socket.data.roomCode).emit('rematchStatus', {
          ready: room.rematchReady.size,
          total: Object.keys(room.players).length
        });
      }
    });
  });
};
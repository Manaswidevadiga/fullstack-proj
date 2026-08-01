const GameRoom = require('../game/GameRoom');
const { DIRECTIONS } = require('../game/constants');

const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

module.exports = function (io) {
  io.on('connection', (socket) => {
    console.log('connected:', socket.id);

    socket.on('createRoom', ({ username }, callback) => {
      const roomCode = generateRoomCode();
      rooms[roomCode] = new GameRoom(roomCode, io);
      rooms[roomCode].addPlayer(socket.id, username);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      callback({ roomCode });
      io.to(roomCode).emit('lobbyUpdate', rooms[roomCode].getState());
    });

    socket.on('joinRoom', ({ roomCode, username }, callback) => {
      const room = rooms[roomCode];
      if (!room) return callback({ error: 'Room not found' });
      room.addPlayer(socket.id, username);
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      callback({ success: true });
      io.to(roomCode).emit('lobbyUpdate', room.getState());
    });

    socket.on('startGame', () => {
      const room = rooms[socket.data.roomCode];
      if (room && !room.started) room.start();
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
        io.to(socket.data.roomCode).emit('lobbyUpdate', room.getState());
      }
    });
  });
};

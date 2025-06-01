const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

let rooms = {};

io.on('connection', (socket) => {
  console.log("User connected:", socket.id);

  socket.on('joinRoom', (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) {
      rooms[roomId] = { players: [] };
    }

    const players = rooms[roomId].players;

    if (players.length >= 2) {
      socket.emit('roomFull');
      return;
    }

    const playerSymbol = players.length === 0 ? "X" : "O";
    players.push({ id: socket.id, symbol: playerSymbol });

    socket.emit('playerJoined', { playerSymbol });
  });

  socket.on('makeMove', ({ roomId, board, turn }) => {
    socket.to(roomId).emit('updateGame', { board, turn });
  });

  socket.on('restartGame', (roomId) => {
    io.to(roomId).emit('gameRestarted');
  });

  socket.on('disconnecting', () => {
    const joinedRooms = Array.from(socket.rooms).filter(r => r !== socket.id);
    for (const roomId of joinedRooms) {
      const room = rooms[roomId];
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          delete rooms[roomId];
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(3000, () => {
  console.log('Server listening on http://localhost:3000');
});

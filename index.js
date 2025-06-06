const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
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

    socket.emit('playerJoined', { playerSymbol, playersInRoom: players.length });

    // Notify both players how many have joined
    io.to(roomId).emit('playersUpdate', { playersInRoom: players.length });

    if (players.length === 2) {
      io.to(roomId).emit('updateGame', { board: Array(9).fill(""), turn: "X" });
    }
  });

  socket.on('makeMove', ({ roomId, board, turn }) => {
    const players = rooms[roomId]?.players || [];

    // Only allow moves if both players are present
    if (players.length < 2) return;

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
        } else {
          // Notify remaining player of player count
          io.to(roomId).emit('playersUpdate', { playersInRoom: room.players.length });
        }
      }
    }
  });

  socket.on('disconnect', () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins for now; for production, specify client URL
    methods: ["GET", "POST"]
  }
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    if (!rooms[roomId]) {
      rooms[roomId] = { players: [] };
    }

    rooms[roomId].players.push(socket.id);
    io.to(roomId).emit("room_data", rooms[roomId].players);

    if (rooms[roomId].players.length === 2) {
      io.to(roomId).emit("start_game");
    }
  });

  socket.on("make_move", ({ roomId, board, turn }) => {
    socket.to(roomId).emit("receive_move", { board, turn });
  });

  socket.on("disconnecting", () => {
    const roomsJoined = [...socket.rooms].filter(r => r !== socket.id);
    roomsJoined.forEach(roomId => {
      if (rooms[roomId]) {
        rooms[roomId].players = rooms[roomId].players.filter(p => p !== socket.id);
        if (rooms[roomId].players.length === 0) {
          delete rooms[roomId];
        } else {
          io.to(roomId).emit("room_data", rooms[roomId].players);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

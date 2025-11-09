import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "https://group-chat-frontend-65dp.vercel.app",
    methods: ["GET", "POST"],
  },
});



const PORT = process.env.PORT || 4000;

// Store connected users
const users = new Map();

io.on("connection", (socket) => {
  console.log(`🟢 New user connected: ${socket.id}`);

  // Login event
  socket.on("login", (username, callback) => {
    username = username?.trim();
    if (!username) {
      return callback({ status: "error", message: "Invalid username" });
    }
    if (users.has(username)) {
      return callback({ status: "error", message: "Username already taken" });
    }

    users.set(username, socket.id);
    socket.data.username = username;

    callback({ status: "ok", message: "Login successful" });
    socket.broadcast.emit("info", `${username} connected`);
    console.log(`${username} logged in`);
  });

  // Handle public messages
  socket.on("message", (msg) => {
    const username = socket.data.username;
    if (!username) return;
    const text = msg.trim();
    if (text.length > 0) {
      io.emit("message", { username, text });
    }
  });

  // Handle private message
  socket.on("dm", ({ to, text }) => {
    const from = socket.data.username;
    const targetSocketId = users.get(to);
    if (targetSocketId) {
      io.to(targetSocketId).emit("message", { username: `${from} (DM)`, text });
      socket.emit("message", { username: `To ${to}`, text });
    } else {
      socket.emit("info", `User ${to} not found`);
    }
  });

  // List all connected users
  socket.on("who", () => {
    socket.emit("users", Array.from(users.keys()));
  });

  // Disconnect event
  socket.on("disconnect", () => {
    const username = socket.data.username;
    if (username) {
      users.delete(username);
      socket.broadcast.emit("info", `${username} disconnected`);
      console.log(`${username} disconnected`);
    }
  });
});

app.get("/", (req, res) => {
  res.send("✅ Socket.IO Chat Server Running.........");
});

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

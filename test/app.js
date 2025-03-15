// app-server.js - Application server that handles requests with Socket.IO
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3001;

// Create HTTP server
const server = http.createServer(app);

// Create Socket.IO server
const io = new Server(server, {
  // path: '/api/socket.io/',
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    // credentials: true
  },
});

// server.on("upgrade", (req, socket, head) => {
//   console.log("⬆️ [HTTP UPGRADE] Raw HTTP upgrade request received");
//   console.log(`   Path: ${req.url}`);
//   console.log(`   Headers:`, JSON.stringify(req.headers, null, 2));

//   // You can inspect the upgrade headers here
//   if (req.headers["sec-websocket-protocol"]) {
//     console.log(
//       `   WebSocket Protocol: ${req.headers["sec-websocket-protocol"]}`
//     );
//   }

//   // Don't end the socket here - let Socket.IO handle it
// });

// io.use((socket, next) => {
//   // Get connection details
//   const url = socket.handshake.url;
//   const initialProtocol =
//     socket.conn.transport.name === "polling" ? "HTTP" : "WebSocket";

//   // Log initial connection
//   console.log(
//     `[CONNECT] ${initialProtocol} - ${url} - Socket ID: ${socket.id}`
//   );

//   // Monitor transport upgrade (HTTP polling → WebSocket)
//   socket.conn.on("upgrade", () => {
//     console.log(
//       `[UPGRADE] HTTP → WebSocket - ${url} - Socket ID: ${socket.id}`
//     );
//   });

//   // Continue to next middleware
//   next();
// });

app.post("/id", (req, res) => {
  return res.status(200).json({ id: crypto.randomBytes(16).toString("hex") });
});

app.get("/hello", (req, res) => {
  res.status(200).json({ message: "Hello from the application server!" });
});

io.on("connection", (socket) => {
  console.log("A client connected", socket.id);

  socket.on("message", (data) => {
    console.log("Received message:", data);

    socket.emit("response", {
      message: `Server received: ${data.text}`,
      timestamp: new Date().toISOString(),
    });

    socket.broadcast.emit("broadcast", {
      message: `Message from ${socket.id}: ${data.text}`,
      timestamp: new Date().toISOString(),
    });
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected", socket.id);
  });
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});

server.listen(PORT, () => {
  console.log(`Application server running on http://localhost:${PORT}`);
});

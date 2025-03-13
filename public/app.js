const winston = require("winston");

// Create a custom log format
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Configure the logger
const logger = winston.createLogger({
  level: "info", // Minimum level to log
  format: winston.format.combine(winston.format.timestamp(), logFormat),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    // File transport
    new winston.transports.File({ filename: "app.log" }),
  ],
});

require("dotenv").config();

const HOST = process.env.HOST;
if (!HOST) {
  console.error("HOST environment variable undefined. Check your .env file.");
  process.exit(1);
} else {
  console.log(`Using HOST=${HOST}.`);
}

const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require("http-proxy-middleware");
const http = require("http");
const socketIo = require("socket.io");

const app = express();
const server = http.createServer(app);

// Attach Socket.IO to the HTTP server
const io = socketIo(server);

// Setup Socket.IO events
io.on("connection", (socket) => {
  console.log("A user connected");

  // Send a message to the client
  socket.emit("welcome", "Hello from server!");

  // Listen for messages from the client
  socket.on("message", (data) => {
    console.log("Received message:", data);
  });

  // Disconnect event
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
});

app.use(express.static(path.join(__dirname, "static")));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

app.use(
  "/api",
  createProxyMiddleware({
    // To send requests within internal network, we have to use the name of the service
    // https://docs.docker.com/compose/how-tos/networking/
    target: `http://${HOST}:8000/api`, // URL of the API service
  })
);

app.use((req, res, next) => {
  res.status(404).json({ message: "Resource not found 404." });
});

const PORT = 7000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

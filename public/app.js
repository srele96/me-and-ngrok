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

const app = express();


app.use(express.static(path.join(__dirname, "static")));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

app.use(
  createProxyMiddleware({
    pathFilter: "/api",
    // To send requests within internal network, we have to use the name of the service
    // https://docs.docker.com/compose/how-tos/networking/
    target: `http://${HOST}:8000/`, // URL of the API service
    ws: true,
    logger: logger,
  })
);

app.use((req, res, next) => {
  res.status(404).json({ message: "Resource not found 404." });
});

const PORT = 7000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

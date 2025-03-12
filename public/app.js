const winston = require('winston');

// Create a custom log format
const logFormat = winston.format.printf(({ timestamp, level, message }) => {
  return `${timestamp} [${level}]: ${message}`;
});

// Configure the logger
const logger = winston.createLogger({
  level: 'info', // Minimum level to log
  format: winston.format.combine(
    winston.format.timestamp(),
    logFormat
  ),
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // File transport
    new winston.transports.File({ filename: 'app.log' })
  ]
});

require('dotenv').config();

const HOST = process.env.HOST;
if (!HOST) {
  console.error('HOST environment variable undefined. Check your .env file.');
  process.exit(1);
} else {
  console.log(`Using HOST=${HOST}.`);
}

const express = require('express');
const path = require('path');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
const port = 7000; 

app.use(express.static(path.join(__dirname, 'static')));

app.use((req, res, next) => {
  logger.info(`${req.method} ${req.originalUrl}`);
  next();
});

app.use('/api', createProxyMiddleware({
  // To send requests within internal network, we have to use the name of the service
  // https://docs.docker.com/compose/how-tos/networking/
  target: `http://${process.env.HOST}:8000/api`, // URL of the API service
}));

app.use((req, res, next) => {
  res.status(404).json({ message: 'Resource not found 404.' });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

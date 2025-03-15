const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const http = require("http");

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_SERVER_URL = "http://localhost:3001/";

app.use(express.static(path.join(__dirname, "public")));

app.use(
  // "/socket.io",
  createProxyMiddleware({
    pathFilter: "/api/socket.io/",
    // pathRewrite: {
    //   '^/'
    // },
    target: TARGET_SERVER_URL,
    changeOrigin: true,
    ws: true, // Enable WebSocket support
    logger: console,
    pathRewrite: {
      // "^/api/socket.io/": "/socket.io/", // Explicitly preserve the /socket.io path
      "^/api/": "/",
    },
  })
);

// Proxy for API requests - strip the '/api' prefix
// app.use(
//   "/api",
//   createProxyMiddleware({
//     target: TARGET_SERVER_URL,
//     changeOrigin: true,
//     logger: console,
//     pathRewrite: {
//       "^/api": "", // Remove the /api prefix when forwarding
//     },
//   })
// );

// Server startup
const server = http.createServer(app);

server.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
  console.log(`Proxying requests to ${TARGET_SERVER_URL}`);
});

// ---------------------------------------------------------

// function generateRequestId(bytes = 16) {
//   return crypto.randomBytes(bytes).toString("hex");
// }

// // Create proxy middleware for HTTP and WebSocket
// const proxyOptions = {
//   target: TARGET_SERVER_URL,
//   changeOrigin: true,
//   ws: true,
//   logger: console,
//   onProxyReq: (proxyReq, req, res) => {
//     // Generate unique ID for this request
//     const requestId = generateRequestId();

//     // Store on request object for logging
//     req.uniqueRequestId = requestId;

//     // Add as header to the proxied request
//     proxyReq.setHeader("unique-request-id", requestId);

//     // Call the original onProxyReq if provided
//     if (options.onProxyReq) {
//       options.onProxyReq(proxyReq, req, res);
//     }

//     // Log the request with its ID
//     console.log(`[HTTP] ${req.method} ${req.url} | ID: ${requestId}`);
//   },
//   // Also add request ID to WebSocket requests
//   onProxyReqWs: (proxyReq, req, socket, options, head) => {
//     // Generate unique ID for this WebSocket request
//     const requestId = generateRequestId();

//     // Store on request object for logging
//     req.uniqueRequestId = requestId;

//     // Add as header to the proxied WebSocket request
//     proxyReq.setHeader("unique-request-id", requestId);

//     // Call the original onProxyReqWs if provided
//     if (options.onProxyReqWs) {
//       options.onProxyReqWs(proxyReq, req, socket, options, head);
//     }

//     // Log the WebSocket request with its ID
//     console.log(`[WS] WebSocket upgrade ${req.url} | ID: ${requestId}`);
//   },
// };

// const wsProxy = createProxyMiddleware(proxyOptions);

// // Apply proxy middleware to all routes starting with /api
// app.use("/api/", wsProxy);

// // Create HTTP server from Express app
// const server = http.createServer(app);

// // Start the server
// server.listen(PORT, () => {
//   console.log(`Proxy server running on http://localhost:${PORT}`);
//   console.log(`Proxying requests to ${TARGET_SERVER_URL}`);
// });

// // Handling WebSocket upgrade events in Express + http-proxy-middleware setup
// server.on("upgrade", (req, socket, head) => {
//   // Log the upgrade request
//   console.log(`[UPGRADE] WebSocket upgrade requested: ${req.url}`);

//   console.log(`[UPGRADE] Forwarding WebSocket upgrade for: ${req.url}`);

//   // Generate a unique request ID directly in the upgrade handler
//   const requestId = generateRequestId();

//   // Add the request ID as a property on the request object
//   req.uniqueRequestId = requestId;

//   // Check if unique-request-id is already set
//   if (!req.headers["unique-request-id"]) {
//     // Generate a new ID if not present
//     const requestId = generateRequestId();

//     // Set the ID in the headers
//     req.headers["unique-request-id"] = requestId;

//     // Log that we're setting a new ID
//     console.log(`[UPGRADE] No request ID found, setting new ID: ${requestId}`);
//   }

//   // Log important headers for debugging
//   console.log(`[UPGRADE] Headers:`, {
//     upgrade: req.headers.upgrade,
//     connection: req.headers.connection,
//     protocol: req.headers["sec-websocket-protocol"],
//     uniqueRequestId: req.headers["unique-request-id"],
//   });

//   // Forward the upgrade event to the proxy
//   wsProxy.upgrade(req, socket, head);
// });

/*

const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const path = require("path");
const http = require("http");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const TARGET_SERVER_URL = "http://localhost:3001/";

app.use(express.static(path.join(__dirname, "public")));

// proxy /socket.io requests to "http://localhost:3001/" and keep /socket.io
// proxy /api requests to "http://localhost:3001/" and strip away api

*/

/*

Does socket.io depend anyhow on the initial '/' http request to the server?

*/

const express = require("express");
const { createProxyMiddleware, debugProxyErrorsPlugin } = require("http-proxy-middleware");

const wsProxy = createProxyMiddleware({
  target: 'ws://echo.websocket.org',
  changeOrigin: true,
  logger: console 
});

const app = express();

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  return next();
})

app.use(wsProxy);

const server = app.listen(3500);
server.on('upgrade', wsProxy.upgrade); // <-- subscribe to http 'upgrade'




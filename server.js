const { createServer } = require("http");
const next = require("next");
const { Server } = require("socket.io");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "localhost";
const port = Number(process.env.PORT || 3000);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);
  const io = new Server(httpServer, {
    cors: { origin: "*" },
    path: "/socket.io"
  });

  global.shadowIo = io;

  io.on("connection", (socket) => {
    socket.emit("STATS_UPDATED", { connected: true });
  });

  httpServer.listen(port, () => {
    console.log(`ShadowShield ready on http://${hostname}:${port}`);
  });
});

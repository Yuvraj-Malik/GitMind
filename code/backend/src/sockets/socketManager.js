const jwt = require("jsonwebtoken");
const env = require("../config/env");

let ioRef = null;

function initSocket(io) {
  ioRef = io;
  // Only authenticated dashboards receive live events.
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    try {
      socket.user = jwt.verify(token, env.jwtSecret);
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });
  io.on("connection", (socket) => {
    console.log(`[backend] socket connected: ${socket.id} (${socket.user?.username || "?"})`);
  });
}

function emitEvent(eventName, payload) {
  if (!ioRef) return;
  ioRef.emit(eventName, payload);
}

module.exports = { initSocket, emitEvent };

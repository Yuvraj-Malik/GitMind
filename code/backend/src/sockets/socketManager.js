const jwt = require("jsonwebtoken");
const env = require("../config/env");

let ioRef = null;
const room = (userId) => `user:${userId}`;

function initSocket(io) {
  ioRef = io;
  // Only authenticated dashboards receive live events, and each user only their own.
  io.use((socket, next) => {
    try {
      socket.user = jwt.verify(socket.handshake.auth?.token, env.jwtSecret);
      return next();
    } catch {
      return next(new Error("unauthorized"));
    }
  });
  io.on("connection", (socket) => {
    if (socket.user?.id) socket.join(room(socket.user.id));
  });
}

/** Send an event to one user's dashboards. Events with no known owner are dropped (never broadcast). */
function emitToUser(userId, eventName, payload) {
  if (!ioRef || !userId) return;
  ioRef.to(room(String(userId))).emit(eventName, payload);
}

module.exports = { initSocket, emitToUser };

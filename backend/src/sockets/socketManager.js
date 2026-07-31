let ioRef = null;

function initSocket(io) {
  ioRef = io;
  io.on("connection", (socket) => {
    console.log(`[backend] socket connected: ${socket.id}`);
  });
}

function emitEvent(eventName, payload) {
  if (!ioRef) return;
  ioRef.emit(eventName, payload);
}

module.exports = { initSocket, emitEvent };

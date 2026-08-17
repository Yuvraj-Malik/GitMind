import { io } from "socket.io-client";

export const isSocketEnabled = import.meta.env.VITE_ENABLE_SOCKET === "true";

const socket = io(import.meta.env.VITE_SOCKET_URL || "http://localhost:4000", {
  autoConnect: false,
  reconnection: isSocketEnabled,
  reconnectionAttempts: isSocketEnabled ? Infinity : 0,
  timeout: 4000,
});

export default socket;

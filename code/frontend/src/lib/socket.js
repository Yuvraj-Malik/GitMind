import { io } from "socket.io-client";
import { API_URL, getToken } from "./api";

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || API_URL).replace(/\/$/, "");

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      auth: (cb) => cb({ token: getToken() }),
      reconnectionDelayMax: 10000,
    });
  }
  return socket;
}

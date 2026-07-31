import { useEffect } from "react";
import socket, { isSocketEnabled } from "../services/socket";

function useWebSocket(onEvent, eventHandlers = {}) {
  useEffect(() => {
    if (!isSocketEnabled) {
      return undefined;
    }

    socket.connect();

    if (onEvent) {
      socket.onAny(onEvent);
    }

    const handlerEntries = Object.entries(eventHandlers);
    handlerEntries.forEach(([eventName, handler]) => {
      socket.on(eventName, handler);
    });

    return () => {
      if (onEvent) {
        socket.offAny(onEvent);
      }
      handlerEntries.forEach(([eventName, handler]) => {
        socket.off(eventName, handler);
      });
      socket.disconnect();
    };
  }, [onEvent, eventHandlers]);
}

export default useWebSocket;

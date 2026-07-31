import { useEffect } from "react";
import socket from "../services/socket";

function useWebSocket(onEvent) {
  useEffect(() => {
    if (!onEvent) return undefined;
    socket.onAny(onEvent);

    return () => {
      socket.offAny(onEvent);
    };
  }, [onEvent]);
}

export default useWebSocket;

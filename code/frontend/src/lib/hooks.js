import { useCallback, useEffect, useRef, useState } from "react";
import useStore from "../store";
import { errorMessage } from "./api";
import { getSocket } from "./socket";

/** The selected repository object (or null). */
export function useActiveRepo() {
  const repos = useStore((s) => s.repos);
  const id = useStore((s) => s.activeRepoId);
  return repos.find((r) => r.id === id) || null;
}

/**
 * Fetch data from the backend. Refetches automatically whenever a live event arrives
 * (dataVersion bump), without flashing a loading state on refresh.
 */
export function useApi(loader, deps = []) {
  const dataVersion = useStore((s) => s.dataVersion);
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: s.data == null, error: null }));
    try {
      const data = await loaderRef.current();
      setState({ data, error: null, loading: false });
    } catch (e) {
      setState((s) => ({ ...s, error: errorMessage(e), loading: false }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => { load(); }, [load, dataVersion]);
  return { ...state, reload: load };
}

const LIVE_EVENTS = ["AI_FIX_STARTED", "AI_FIX_COMPLETED", "AI_FIX_FAILED", "NEW_PR_CREATED", "NEW_NODE_ADDED"];

/** One socket connection for the whole app; mirrors live events into the store. */
export function useLiveEvents(enabled) {
  useEffect(() => {
    if (!enabled) return undefined;
    const s = getSocket();
    const st = useStore.getState();
    const onConnect = () => st.setConnection("live");
    const onDisconnect = () => st.setConnection("offline");
    const onError = () => st.setConnection("offline");
    const onAny = (event, payload) => {
      const store = useStore.getState();
      if (event === "NOTIFICATION") return store.pushNotification(payload);
      if (!LIVE_EVENTS.includes(event)) return;
      if (event === "AI_FIX_STARTED") store.jobStarted(payload);
      if (event === "AI_FIX_COMPLETED" || event === "AI_FIX_FAILED") store.jobFinished(payload);
      store.bump();
    };
    st.setConnection("connecting");
    s.on("connect", onConnect);
    s.on("disconnect", onDisconnect);
    s.on("connect_error", onError);
    s.onAny(onAny);
    s.connect();
    return () => {
      s.off("connect", onConnect);
      s.off("disconnect", onDisconnect);
      s.off("connect_error", onError);
      s.offAny(onAny);
      s.disconnect();
    };
  }, [enabled]);
}

import { useEffect } from "react";

import { useAuth } from "./useAuth";
import { collectLiveContext } from "../services/signalCollectionService";

const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

/** Starts after authentication and keeps live signals current without UI controls. */
export function useLiveContextCollection() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return undefined;
    const collect = () => void collectLiveContext(session).catch((error: unknown) => console.warn("Live context collection failed", error));
    collect();
    const interval = window.setInterval(collect, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [session]);
}

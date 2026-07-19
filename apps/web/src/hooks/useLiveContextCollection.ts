import { useEffect } from "react";

import { useAuth } from "./useAuth";
import { collectLiveContext } from "../services/signalCollectionService";
import { requestPersonalizationRefresh } from "../services/personalizationRefresh";

/** Collects live browser signals once after authentication; later refreshes are event-driven. */
export function useLiveContextCollection() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session) return undefined;
    void collectLiveContext(session).then(requestPersonalizationRefresh).catch(() => undefined);
    return undefined;
  }, [session]);
}

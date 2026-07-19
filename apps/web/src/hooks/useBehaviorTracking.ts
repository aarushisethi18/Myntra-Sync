import { useCallback } from "react";

import { useAuth } from "./useAuth";
import { trackBehaviorEvent, type BehaviorEvent } from "../services/behaviorTrackingService";

/** Supplies existing and future UI controls with a non-blocking event tracker. */
export function useBehaviorTracking() {
  const { session } = useAuth();
  return useCallback((event: BehaviorEvent) => trackBehaviorEvent(session, event), [session]);
}

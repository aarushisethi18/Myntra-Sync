import { useCallback } from "react";
import { useAuth } from "./useAuth";
import { trackEvent, type AnalyticsEvent } from "../services/analyticsService";
export function useAnalyticsTracking() { const { session } = useAuth(); return useCallback((event: AnalyticsEvent) => trackEvent(session, event), [session]); }

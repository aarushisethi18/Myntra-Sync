import type { Session } from "@supabase/supabase-js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export type BehaviorEventType =
  | "PRODUCT_VIEW" | "PRODUCT_CLICK" | "PRODUCT_DWELL" | "WISHLIST_ADD" | "WISHLIST_REMOVE"
  | "ADD_TO_CART" | "REMOVE_FROM_CART" | "PURCHASE" | "SEARCH" | "CATEGORY_OPEN"
  | "BRAND_OPEN" | "COLOR_FILTER" | "STYLE_FILTER" | "FABRIC_FILTER" | "HOME_SECTION_CLICK"
  | "RECOMMENDATION_CLICK" | "RECOMMENDATION_IGNORE";

export interface BehaviorEvent {
  eventType: BehaviorEventType;
  eventId?: string;
  productId?: string;
  brand?: string;
  category?: string;
  color?: string;
  fabric?: string;
  fit?: string;
  style?: string;
  occasion?: string;
  price?: number;
  metadata?: Record<string, unknown>;
}

/** Deliberately does not await network completion or affect the calling UI. */
export function trackBehaviorEvent(session: Session | null, event: BehaviorEvent): void {
  if (!session?.access_token) return;
  const eventId = event.eventId ?? (typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
  void fetch(`${API_BASE_URL}/behavior/event`, {
    method: "POST",
    keepalive: true,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ ...event, eventId }),
  }).catch(() => undefined);
}

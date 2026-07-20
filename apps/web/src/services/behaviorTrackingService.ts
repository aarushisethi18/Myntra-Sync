import type { Session } from "@supabase/supabase-js";

import { requestPersonalizationRefresh } from "./personalizationRefresh";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const DISPATCH_DELAY_MS = Math.max(0, Number(import.meta.env.VITE_BEHAVIOR_DISPATCH_DELAY_MS) || 150);
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

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

type QueuedBehaviorEvent = {
  accessToken: string;
  event: BehaviorEvent & { eventId: string };
  attempts: number;
};

const queue: QueuedBehaviorEvent[] = [];
const queuedImpressions = new Set<string>();
let isDispatching = false;

const wait = (milliseconds: number) => new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

function createEventId(): string {
  return typeof crypto?.randomUUID === "function" ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
}

function impressionKey(event: BehaviorEvent): string | undefined {
  return event.metadata?.interaction === "PRODUCT_IMPRESSION" && typeof event.metadata.impressionKey === "string"
    ? event.metadata.impressionKey
    : undefined;
}

async function dispatchQueuedEvents(): Promise<void> {
  if (isDispatching) return;
  isDispatching = true;

  try {
    while (queue.length > 0) {
      const queuedEvent = queue[0];
      let delivered = false;

      try {
        const response = await fetch(`${API_BASE_URL}/behavior/event`, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${queuedEvent.accessToken}` },
          body: JSON.stringify(queuedEvent.event),
        });
        delivered = response.ok;
      } catch {
        delivered = false;
      }

      if (delivered) {
        queue.shift();
        requestPersonalizationRefresh();
        if (queue.length > 0) await wait(DISPATCH_DELAY_MS);
        continue;
      }

      queuedEvent.attempts += 1;
      if (queuedEvent.attempts >= MAX_RETRY_ATTEMPTS) {
        queue.shift();
        if (queue.length > 0) await wait(DISPATCH_DELAY_MS);
        continue;
      }

      await wait(RETRY_BASE_DELAY_MS * 2 ** (queuedEvent.attempts - 1));
    }
  } finally {
    isDispatching = false;
  }
}

/** Deliberately does not await network completion or affect the calling UI. */
export function trackBehaviorEvent(session: Session | null, event: BehaviorEvent): void {
  if (!session?.access_token) return;
  const key = impressionKey(event);
  if (key && queuedImpressions.has(key)) return;
  if (key) queuedImpressions.add(key);

  queue.push({
    accessToken: session.access_token,
    event: { ...event, eventId: event.eventId ?? createEventId() },
    attempts: 0,
  });
  void dispatchQueuedEvents();
}
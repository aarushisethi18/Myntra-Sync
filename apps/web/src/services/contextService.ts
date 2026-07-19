import type { ContextResponse } from "../types/context";
import type { Session } from "@supabase/supabase-js";

import { collectLiveContext, type LiveContext } from "./signalCollectionService";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export async function getContext(): Promise<ContextResponse> {
  const response = await fetch(`${API_BASE_URL}/context`);

  if (!response.ok) {
    throw new Error("Failed to fetch context");
  }

  return response.json();
}

/** Collect browser signals first, then fetch the persisted live snapshot. */
export async function collectAndGetLiveContext(session: Session): Promise<LiveContext> {
  await collectLiveContext(session);
  const response = await fetch(`${API_BASE_URL}/context/live`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Unable to load live context.");
  return response.json() as Promise<LiveContext>;
}

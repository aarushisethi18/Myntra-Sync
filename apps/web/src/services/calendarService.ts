import type { Session } from "@supabase/supabase-js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

export interface CalendarStatusResponse {
  connected: boolean;
  email?: string;
  next_event?: any;
  event_count?: number;
}

export async function getCalendarStatus(session: Session): Promise<CalendarStatusResponse> {
  const response = await fetch(`${API_BASE_URL}/calendar/status`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) {
    if (response.status === 404) {
      return { connected: false };
    }
    throw new Error("Failed to fetch calendar status.");
  }
  return response.json();
}

export async function connectCalendar(session: Session): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/calendar/connect`, {
    method: "POST",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Failed to start calendar integration.");
  const data = await response.json();
  return data.authorization_url;
}

export async function disconnectCalendar(session: Session): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/calendar/disconnect`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Failed to disconnect calendar.");
}

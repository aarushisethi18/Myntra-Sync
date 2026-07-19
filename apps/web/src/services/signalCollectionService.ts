import type { Session } from "@supabase/supabase-js";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const DELHI_LOCATION = { latitude: 28.6139, longitude: 77.209, city: "Delhi", state: "Delhi", country: "IN", timezone: browserTimeZone, fallback: true };

export interface LiveContext {
  location: { city: string; state: string; country: string; latitude: number; longitude: number; timezone?: string; locationFallback?: boolean; fallback?: boolean };
  weather: { temperature?: number; feelsLike?: number; humidity?: number; condition?: string; icon?: string; rainProbability?: number; windSpeed?: number } | null;
  calendar: { events: Array<{ id?: string; title?: string; type?: string; location?: string; start?: string }> };
  festival: { name?: string; daysRemaining?: number; priority?: string } | null;
  time: { currentTime?: string; day?: string; month?: string; season?: string };
  warning?: string;
  warnings?: string[];
}

function browserLocation(): Promise<LiveContext["location"]> {
  if (!navigator.geolocation) return Promise.resolve(DELHI_LOCATION);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude, city: "", state: "", country: "", timezone: browserTimeZone, fallback: false }),
      () => resolve(DELHI_LOCATION),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 15 * 60_000 },
    );
  });
}

export async function collectLiveContext(session: Session): Promise<LiveContext> {
  const location = await browserLocation();
  const response = await fetch(`${API_BASE_URL}/context/live`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(location),
  });
  if (!response.ok) throw new Error("Unable to collect live context.");
  return response.json() as Promise<LiveContext>;
}


import type { Session } from "@supabase/supabase-js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type BlendResult = {
  sessionId: string; score: number; people: { name: string; initials: string; image: string; labels: { name: string; confidence: number }[] }[];
  breakdown: { name: string; value: number; color: string }[]; reasons: string[];
  styleDna: { name: string; initials: string; image: string; labels: { name: string; confidence: number }[] }[];
  sharedDna: { name: string; confidence: number }[]; palette: { name: string; hex: string }[];
  moodboard: { keywords: string[]; visualStyle: string; images?: string[] }; outfits: { id: string; title: string; occasion: string; weather: string; price: string; match: number; yours: number; image: string; pieces: string[]; explanation: string }[];
  insights: { value: string; label: string }[];
};

async function request<T>(path: string, session: Session, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}`, ...init?.headers } });
  if (!response.ok) { const detail = await response.json().catch(() => null); throw new Error(detail?.detail ?? "Blend could not be loaded."); }
  return response.json() as Promise<T>;
}

export const blendService = {
  create: (session: Session) => request<{ inviteCode: string; inviteUrl: string }>("/blend/sessions", session, { method: "POST" }),
  inspect: (code: string, session: Session) => request<{ status: string; hostName?: string }>(`/blend/invites/${code}`, session),
  accept: (code: string, session: Session) => request(`/blend/invites/${code}/accept`, session, { method: "POST" }),
  result: (code: string, session: Session) => request<BlendResult>(`/blend/sessions/${code}/result`, session),
  regenerate: (code: string, session: Session, controls: Record<string, string>) => request<BlendResult>(`/blend/sessions/${code}/regenerate`, session, { method: "POST", body: JSON.stringify(controls) }),
};

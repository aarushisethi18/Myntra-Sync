import type { Session } from "@supabase/supabase-js";
import type {
  BlendSession,
  OutfitVote,
  SharedClosetItem,
  SharedWishlistItem,
  TwinLookResponse,
} from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type BlendResult = {
  sessionId: string;
  score: number;
  blendName: string;
  blendDescription: string;
  people: { name: string; initials: string; image: string; labels: { name: string; confidence: number }[] }[];
  breakdown: { name: string; value: number; color: string }[];
  reasons: string[];
  whyYouMatch: string[];
  styleDna: { name: string; initials: string; image: string; labels: { name: string; confidence: number }[] }[];
  sharedDna: { name: string; confidence: number }[];
  palette: { name: string; hex: string }[];
  moodboard: {
    keywords: string[];
    visualStyle: string;
    images?: string[];
    aestheticDescription?: string;
    styleSignals?: string[];
    sharedBrands?: string[];
  };
  outfits: {
    id: string;
    title: string;
    occasion: string;
    weather: string;
    price: string;
    match: number;
    yours: number;
    image: string;
    pieces: string[];
    explanation: string;
    brand?: string;
    category?: string;
  }[];
  insights: { value: string; label: string }[];
  sharedWishlist: SharedWishlistItem[];
  updatedAt: string;
};

async function request<T>(path: string, session: Session, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const detail = await response.json().catch(() => null);
    throw new Error(detail?.detail ?? "Blend could not be loaded.");
  }
  return response.json() as Promise<T>;
}

export const blendService = {
  // ── Core flow ────────────────────────────────────────────────────────────
  create: (session: Session) =>
    request<{ inviteCode: string; inviteUrl: string }>("/blend/sessions", session, { method: "POST" }),

  inspect: (code: string, session: Session) =>
    request<{ status: string; hostName?: string }>(`/blend/invites/${code}`, session),

  accept: (code: string, session: Session) =>
    request(`/blend/invites/${code}/accept`, session, { method: "POST" }),

  result: (code: string, session: Session) =>
    request<BlendResult>(`/blend/sessions/${code}/result`, session),

  regenerate: (code: string, session: Session, controls: Record<string, string>) =>
    request<BlendResult>(`/blend/sessions/${code}/regenerate`, session, {
      method: "POST",
      body: JSON.stringify(controls),
    }),

  // ── My Blends ────────────────────────────────────────────────────────────
  myBlends: (session: Session) =>
    request<BlendSession[]>("/blend/my-blends", session),

  // ── Shared Closet ────────────────────────────────────────────────────────
  getCloset: (code: string, session: Session) =>
    request<SharedClosetItem[]>(`/blend/sessions/${code}/shared-closet`, session),

  saveToCloset: (
    code: string,
    session: Session,
    data: {
      productId?: string;
      productSnapshot: Record<string, unknown>;
      occasion?: string;
      occasionType?: string;
      occasionLabel?: string;
      notes?: string;
    },
  ) =>
    request<SharedClosetItem>(`/blend/sessions/${code}/shared-closet`, session, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  removeFromCloset: (code: string, session: Session, itemId: string) =>
    request<void>(`/blend/sessions/${code}/shared-closet/${itemId}`, session, { method: "DELETE" }),

  getMoreLooks: (
    code: string,
    session: Session,
    data: { excludeProductIds: string[]; occasion?: string },
  ) =>
    request<any[]>(`/blend/sessions/${code}/more-looks`, session, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Outfit Voting ────────────────────────────────────────────────────────
  getVotes: (code: string, session: Session) =>
    request<OutfitVote[]>(`/blend/sessions/${code}/votes`, session),

  vote: (code: string, session: Session, data: { outfitKey: string; vote: "love" | "wear_soon" | "skip" }) =>
    request<OutfitVote>(`/blend/sessions/${code}/votes`, session, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ── Shared Wishlist ──────────────────────────────────────────────────────
  getSharedWishlist: (code: string, session: Session) =>
    request<SharedWishlistItem[]>(`/blend/sessions/${code}/shared-wishlist`, session),

  // ── Twin Looks ───────────────────────────────────────────────────────────
  getTwinLooks: (code: string, session: Session, outfitKey: string) =>
    request<TwinLookResponse>(`/blend/sessions/${code}/twin/${outfitKey}`, session, { method: "POST" }),
};

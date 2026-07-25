export type BlendStatus = "loading" | "ready" | "empty" | "error";

export type BlendControls = {
  occasion: string;
  mood: string;
  budget: string;
  weather: string;
};

export type BlendSession = {
  id: string;
  inviteCode: string;
  status: string;
  blendName?: string;
  blendDescription?: string;
  compatibilityScore?: number;
  partnerName?: string;
  createdAt: string;
  lastOpenedAt?: string;
  lastComputedAt?: string;
};

export type SharedClosetItem = {
  id: string;
  sessionId: string;
  productId?: string;
  productSnapshot: Record<string, unknown>;
  occasion?: string;
  occasionType?: string;
  occasionLabel?: string;
  notes?: string;
  savedBy: string;
  savedByName?: string;
  createdAt: string;
};

export type OutfitVote = {
  id: string;
  sessionId: string;
  outfitKey: string;
  userId: string;
  userName?: string;
  vote: "love" | "wear_soon" | "skip";
  createdAt: string;
  updatedAt: string;
};

export type SharedWishlistItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  price: number;
  originalPrice: number;
  image: string;
  rating?: number;
  aiReason: string;
};

export type TwinLookPiece = {
  id: string;
  name: string;
  brand: string;
  category: string;
  color: string;
  price: number;
  image: string;
};

export type TwinLookResponse = {
  outfitKey: string;
  lookA: { owner: string; pieces: TwinLookPiece[]; vibe: string };
  lookB: { owner: string; pieces: TwinLookPiece[]; vibe: string };
};

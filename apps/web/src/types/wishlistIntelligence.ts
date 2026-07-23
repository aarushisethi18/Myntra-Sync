import type { PreferredBudget, RankedBrand, RankedCategory } from "./orderHistory";

export type WishlistActivity = {
  firstSavedAt: string;
  mostRecentSavedAt: string;
};

export type WishlistIntelligence = {
  status: "ok";
  wishlistPersona: string;
  wishlistSize: number;
  favoriteBrands: RankedBrand[];
  favoriteCategories: RankedCategory[];
  preferredBudget: PreferredBudget;
  favoriteStyles: string[];
  favoriteColors: string[];
  wishlistActivity: WishlistActivity;
  recommendationReasons: string[];
};

export type EmptyWishlistIntelligence = {
  status: "empty";
  message: string;
};

export type WishlistIntelligenceResponse = WishlistIntelligence | EmptyWishlistIntelligence;

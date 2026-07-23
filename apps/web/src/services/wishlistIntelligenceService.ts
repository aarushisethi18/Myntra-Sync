import type { Session } from "@supabase/supabase-js";

import type { WishlistIntelligenceResponse } from "../types/wishlistIntelligence";
import { apiClient } from "./apiClient";

export function getWishlistIntelligence(session: Session): Promise<WishlistIntelligenceResponse> {
  return apiClient<WishlistIntelligenceResponse>("/wishlist/intelligence", session);
}

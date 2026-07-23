import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { getWishlistIntelligence } from "../services/wishlistIntelligenceService";

export function useWishlistIntelligence(session: Session | null) {
  return useQuery({
    queryKey: ["wishlist-intelligence", session?.user.id],
    queryFn: () => getWishlistIntelligence(session as Session),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  });
}

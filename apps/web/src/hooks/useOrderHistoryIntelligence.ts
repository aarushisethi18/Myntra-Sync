import { useQuery } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { getOrderHistoryIntelligence } from "../services/orderHistoryService";

export function useOrderHistoryIntelligence(session: Session | null, recommendationId?: string) {
  return useQuery({
    queryKey: ["order-history-intelligence", session?.user.id, recommendationId],
    queryFn: () => getOrderHistoryIntelligence(session as Session, recommendationId),
    enabled: Boolean(session),
    staleTime: 5 * 60_000,
  });
}

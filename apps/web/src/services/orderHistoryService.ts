import type { Session } from "@supabase/supabase-js";
import { apiClient } from "./apiClient";
import type { OrderHistoryResponse } from "../types/orderHistory";

export function getOrderHistoryIntelligence(session: Session, recommendationId?: string): Promise<OrderHistoryResponse> {
  const query = recommendationId ? `?recommendation_id=${encodeURIComponent(recommendationId)}` : "";
  return apiClient<OrderHistoryResponse>(`/order-history/intelligence${query}`, session);
}

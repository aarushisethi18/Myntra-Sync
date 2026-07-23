export type NotificationType = "weather" | "festival" | "calendar" | "wishlist" | "sale" | "style" | "wardrobe" | "budget" | "system";
export type NotificationPriority = "low" | "medium" | "high" | "critical";

export interface NotificationAction {
  label: string;
  deep_link: string | null;
  cta_type: "navigate" | "external" | "none";
}

export interface RecommendationContext {
  occasion: string | null;
  weather: string | null;
  category: string | null;
  reason: string | null;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: NotificationPriority;
  icon: string;
  source: string;
  action: NotificationAction | null;
  created_at: string;
  metadata: Record<string, unknown>;
  recommendation_context: RecommendationContext | null;
  read: boolean;
}

export interface NotificationsResponse {
  count: number;
  total: number;
  notifications: NotificationItem[];
}

import type { Session } from "@supabase/supabase-js";

import { apiClient } from "./apiClient";
import type { NotificationsResponse } from "../types/notifications";

export function getNotifications(session: Session): Promise<NotificationsResponse> {
  return apiClient<NotificationsResponse>("/notifications?limit=100", session);
}

export function markNotificationRead(session: Session, notificationId: string): Promise<void> {
  return apiClient<void>(`/notifications/${encodeURIComponent(notificationId)}/read`, session, { method: "PATCH" });
}

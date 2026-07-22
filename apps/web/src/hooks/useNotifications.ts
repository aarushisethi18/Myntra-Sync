import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";

import { getNotifications, markNotificationRead } from "../services/notificationService";
import type { NotificationsResponse } from "../types/notifications";

const POLL_INTERVAL_MS = 30_000;

export function notificationsQueryKey(userId: string | undefined) {
  return ["notifications", userId] as const;
}

export function useNotifications(session: Session | null) {
  const queryClient = useQueryClient();
  const queryKey = notificationsQueryKey(session?.user.id);
  const query = useQuery({
    queryKey,
    queryFn: () => getNotifications(session as Session),
    enabled: Boolean(session),
    staleTime: POLL_INTERVAL_MS,
    refetchInterval: () => document.visibilityState === "visible" ? POLL_INTERVAL_MS : false,
    refetchIntervalInBackground: false,
  });
  const markRead = useMutation({
    mutationFn: (notificationId: string) => markNotificationRead(session as Session, notificationId),
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<NotificationsResponse>(queryKey);
      queryClient.setQueryData<NotificationsResponse>(queryKey, (current) => current ? {
        ...current,
        notifications: current.notifications.map((item) => item.id === notificationId ? { ...item, read: true } : item),
      } : current);
      return { previous };
    },
    onError: (_error, _notificationId, context) => {
      queryClient.setQueryData(queryKey, context?.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey });
    },
  });
  const unreadCount = query.data?.notifications.reduce((count, item) => count + Number(!item.read), 0) ?? 0;
  return { ...query, unreadCount, markRead };
}

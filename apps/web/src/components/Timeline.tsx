import type { ContextResponse } from "../types/context";
import TimelineItem, { type TimelineEntry } from "./TimelineItem";
import type { DisplayNotification } from "./NotificationCard";

const formatDate = (value?: string) => {
  if (!value) return "Upcoming";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Upcoming" : date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
};

export default function Timeline({ weather, events, notifications }: { weather?: ContextResponse["weather"]; events?: ContextResponse["upcomingEvents"]; notifications: DisplayNotification[] }) {
  const entries: TimelineEntry[] = [
    { id: "weather", label: "Today", title: weather?.condition || "Today's weather", detail: weather ? `${weather.temperature}°C${weather.city ? ` in ${weather.city}` : ""}` : "Weather details unavailable", kind: "weather" as const, timestamp: 0 },
    ...(events ?? []).map((event) => ({ id: `event-${event.id}`, label: formatDate(event.startTime), title: event.title || "Upcoming event", detail: event.startTime ? new Date(event.startTime).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : "Time to be confirmed", kind: "event" as const, timestamp: Date.parse(event.startTime) || Number.MAX_SAFE_INTEGER })),
    ...notifications.map((notification, index) => ({ id: `notification-${index}`, label: notification.dateLabel || "Reminder", title: notification.title, detail: notification.message, kind: "notification" as const, timestamp: notification.timestamp ?? Number.MAX_SAFE_INTEGER })),
  ].sort((a, b) => (a.timestamp ?? Number.MAX_SAFE_INTEGER) - (b.timestamp ?? Number.MAX_SAFE_INTEGER));

  return <ol className="timeline">{entries.map((item, index) => <TimelineItem key={item.id} item={item} isLast={index === entries.length - 1} />)}</ol>;
}

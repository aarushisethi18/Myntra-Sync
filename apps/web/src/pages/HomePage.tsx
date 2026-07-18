import { useEffect, useMemo, useState } from "react";

import GreetingCard from "../components/GreetingCard";
import NotificationCard, { type DisplayNotification } from "../components/NotificationCard";
import RecommendationCard from "../components/RecommendationCard";
import RecommendationReason from "../components/RecommendationReason";
import Timeline from "../components/Timeline";
import WeatherCard from "../components/WeatherCard";
import { getContext } from "../services/contextService";
import type { ContextResponse } from "../types/context";

function normalizeNotifications(notifications: unknown[]): DisplayNotification[] {
  return notifications.map((item) => {
    if (typeof item === "string") return { title: "Reminder", message: item };
    if (!item || typeof item !== "object") return { title: "Notification", message: String(item ?? "") };
    const value = item as Record<string, unknown>;
    const title = [value.title, value.heading, value.type].find((field) => typeof field === "string") as string | undefined;
    const message = [value.message, value.body, value.text, value.description].find((field) => typeof field === "string") as string | undefined;
    const date = [value.date, value.timestamp, value.createdAt, value.remindAt].find((field) => typeof field === "string") as string | undefined;
    const timestamp = date ? Date.parse(date) : NaN;
    return { title: title || "Reminder", message: message || "You have a new update.", dateLabel: date && !Number.isNaN(timestamp) ? new Date(timestamp).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) : undefined, timestamp: Number.isNaN(timestamp) ? undefined : timestamp };
  });
}

export default function HomePage() {
  const [context, setContext] = useState<ContextResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadContext() {
      try {
        setContext(await getContext());
      } catch (err) {
        console.error(err);
        setError("We couldn't load your context right now. Please try again shortly.");
      } finally {
        setLoading(false);
      }
    }

    loadContext();
  }, []);

  const notifications = useMemo(
    () => normalizeNotifications(context?.notifications ?? []),
    [context],
  );

  if (loading) {
    return <main className="dashboard-shell"><div className="loading-card">Loading your day…</div></main>;
  }

  if (error || !context) {
    return <main className="dashboard-shell"><div className="loading-card text-[#d9426a]">{error || "No context available."}</div></main>;
  }

  const recommendation = context.recommendations[0];
  const upcomingEvent = context.upcomingEvents[0];

  return (
    <main className="dashboard-shell">
      <div className="dashboard-content">
        <GreetingCard name={context.user?.name} eventTitle={upcomingEvent?.title} />

        <section aria-labelledby="current-context-heading">
          <div className="section-heading">
            <p className="eyebrow">Your day at a glance</p>
            <h2 id="current-context-heading">Current context</h2>
          </div>
          <div className="context-grid">
            <WeatherCard weather={context.weather} />
            <div className="event-summary-card">
              <span className="card-icon" aria-hidden="true">◷</span>
              <div>
                <p className="card-label">Up next</p>
                <h3>{upcomingEvent?.title ?? "Nothing planned yet"}</h3>
                <p>{upcomingEvent?.startTime ? new Date(upcomingEvent.startTime).toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" }) : "Your plans will appear here"}</p>
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby="timeline-heading">
          <div className="section-heading"><p className="eyebrow">Plan with confidence</p><h2 id="timeline-heading">Life timeline</h2></div>
          <Timeline weather={context.weather} events={context.upcomingEvents} notifications={notifications} />
        </section>

        <section aria-labelledby="recommendations-heading">
          <div className="section-heading"><p className="eyebrow">Styled for your context</p><h2 id="recommendations-heading">Recommended for you</h2></div>
          <RecommendationCard recommendation={recommendation} />
        </section>

        <section className="insight-grid" aria-label="Recommendation details and notifications">
          <RecommendationReason recommendation={recommendation} />
          <NotificationCard notifications={notifications} />
        </section>
      </div>
    </main>
  );
}

import type { ContextResponse } from "../types/context";

interface ContextCardProps {
  context: ContextResponse;
}

export default function ContextCard({ context }: ContextCardProps) {
  const upcomingEvent = context.upcomingEvents[0];
  const recommendation = context.recommendations[0];

  return (
    <div className="rounded-xl border p-6 shadow-md space-y-6">

      <h1 className="text-3xl font-bold">
        Hello, {context.user.name}
      </h1>

      <div>
        <h2 className="font-semibold">Upcoming Event</h2>
        <p>{upcomingEvent?.title ?? "No upcoming events"}</p>
      </div>

      <div>
        <h2 className="font-semibold">Weather</h2>

        <p>
          {context.weather.temperature}°C •{" "}
          {context.weather.condition} •{" "}
          {context.weather.city}
        </p>
      </div>

      <div>
        <h2 className="font-semibold">Today's Recommendation</h2>

        <p>{recommendation?.title ?? "No recommendation available"}</p>

        <p className="text-sm text-gray-500">
          {recommendation?.reason}
        </p>
      </div>

    </div>
  );
}
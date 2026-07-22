import type { LiveContext } from "../../services/signalCollectionService";
import { EmptyInsight, InsightCard, TabError, TabSkeleton } from "./shared";
export function WeatherTab({ context, loading, error, retry }: { context?: LiveContext; loading: boolean; error: boolean; retry: () => void }) {
  if (loading) return <TabSkeleton />; if (error) return <TabError onRetry={retry} />;
  const weather = context?.weather; if (!weather?.condition) return <EmptyInsight title="Weather is still syncing" body="We’ll explain its influence as soon as your local forecast is ready." />;
  const hot = (weather.temperature ?? 0) >= 28; const explanation = hot ? "The warmer temperature favours breathable, lightweight styles." : "The cooler conditions favour comfortable layers and versatile fabrics.";
  return <div className="space-y-4"><InsightCard label="Today’s weather"><strong>{weather.condition}</strong>{typeof weather.temperature === "number" && <> · {Math.round(weather.temperature)}°C</>}</InsightCard><InsightCard label="Why it shaped today’s recommendation">{explanation}</InsightCard></div>;
}

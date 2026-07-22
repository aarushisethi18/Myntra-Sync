import type { LiveContext } from "../../services/signalCollectionService";
import { EmptyInsight, InsightCard, TabError, TabSkeleton } from "./shared";
export function UpcomingEventTab({ context, loading, error, retry }: { context?: LiveContext; loading: boolean; error: boolean; retry: () => void }) {
 if (loading) return <TabSkeleton />; if (error) return <TabError onRetry={retry} />; const event = context?.calendar.events[0]; if (!event?.title) return <EmptyInsight title="No upcoming event found" body="Connect your calendar and we’ll factor upcoming moments into your edit." />;
 const formal = /interview|office|meeting/i.test(event.title); const dressCode = formal ? "Polished and professional" : "Occasion-ready and comfortable";
 return <div className="space-y-4"><InsightCard label="Upcoming event"><strong>{event.title}</strong>{event.type && <> · {event.type}</>}</InsightCard><InsightCard label="Recommended dress code">{dressCode}</InsightCard><InsightCard label="Why it shaped today’s recommendation">Today’s recommendation is selected to work naturally for this upcoming moment.</InsightCard></div>;
}

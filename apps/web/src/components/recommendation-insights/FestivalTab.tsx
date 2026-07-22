import type { LiveContext } from "../../services/signalCollectionService";
import { EmptyInsight, InsightCard, TabError, TabSkeleton } from "./shared";
export function FestivalTab({ context, loading, error, retry }: { context?: LiveContext; loading: boolean; error: boolean; retry: () => void }) {
 if (loading) return <TabSkeleton />; if (error) return <TabError onRetry={retry} />; const festival = context?.festival; if (!festival?.name) return <EmptyInsight title="No festival signal right now" body="When a festival is near, LifeOS will explain its styling influence here." />;
 return <div className="space-y-4"><InsightCard label="Detected festival"><strong>{festival.name}</strong>{festival.daysRemaining != null && <> · in {festival.daysRemaining} days</>}</InsightCard><InsightCard label="Why it shaped today’s recommendation">The festive moment favours celebratory colour, occasion-ready categories, and elevated styling.</InsightCard></div>;
}

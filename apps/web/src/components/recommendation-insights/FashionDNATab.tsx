import type { FashionDna } from "../../types/catalog";
import { EmptyInsight, InsightCard, TabError, TabSkeleton } from "./shared";
export function FashionDNATab({ data, loading, error, retry }: { data?: FashionDna | null; loading: boolean; error: boolean; retry: () => void }) {
 if (loading) return <TabSkeleton />; if (error) return <TabError onRetry={retry} />; if (!data) return <EmptyInsight title="Fashion DNA is still learning" body="As you browse and shop, we’ll explain the aesthetics shaping your edit." />;
 const values = (items: { value: string }[]) => items.slice(0, 3).map((item) => item.value).join(", ") || "Still learning";
 return <div className="space-y-4"><InsightCard label="Your style profile"><strong>Personalised style learner</strong></InsightCard><InsightCard label="Favourite aesthetics">{values(data.styleAffinity)}</InsightCard><InsightCard label="Colours, brands, and categories">{values(data.colorAffinity)} · {values(data.brandAffinity)} · {values(data.categoryAffinity)}</InsightCard><InsightCard label="Why it shaped today’s recommendation">Today’s recommendation reflects the aesthetics and affinities you engage with most.</InsightCard></div>;
}

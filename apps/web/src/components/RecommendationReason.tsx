import type { ContextResponse } from "../types/context";

type Recommendation = ContextResponse["recommendations"][number] & { reasons?: string[] };
export default function RecommendationReason({ recommendation }: { recommendation?: Recommendation }) {
  const reasons = recommendation?.reasons?.filter(Boolean) ?? (recommendation?.reason ? [recommendation.reason] : []);
  return <section className="detail-card"><p className="eyebrow">The details</p><h2>Why this recommendation</h2>{reasons.length ? <div className="reason-chips">{reasons.map((reason) => <span key={reason}>{reason}</span>)}</div> : <p className="muted-copy">Recommendation reasons will appear here when available.</p>}</section>;
}

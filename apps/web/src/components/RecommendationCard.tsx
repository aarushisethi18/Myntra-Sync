import type { ContextResponse } from "../types/context";

type Recommendation = ContextResponse["recommendations"][number] & { priority?: string; explanation?: string };

export default function RecommendationCard({ recommendation }: { recommendation?: Recommendation }) {
  if (!recommendation) return <article className="recommendation-card empty-state"><p className="card-label">Personalised picks</p><h3>Your next recommendation is on its way</h3><p>We'll use your context to bring the right styles here.</p></article>;
  const confidence = Number.isFinite(recommendation.confidence) ? `${Math.round(recommendation.confidence * (recommendation.confidence <= 1 ? 100 : 1))}% match` : undefined;
  return <article className="recommendation-card"><div className="recommendation-visual" aria-hidden="true"><span>✦</span></div><div className="recommendation-body"><div className="badges">{confidence && <span className="badge confidence">{confidence}</span>}{recommendation.priority && <span className="badge priority">{recommendation.priority}</span>}</div><p className="card-label">Picked for your moment</p><h3>{recommendation.title || "Recommended for you"}</h3><p>{recommendation.explanation || recommendation.reason || "Selected using your current context."}</p></div></article>;
}

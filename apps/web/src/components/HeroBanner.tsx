import heroImage from "../assets/hero.png";
import type { HeroMessage } from "../services/personalizationExplanationService";

export default function HeroBanner({ message, signals, onShop, loading = false }: { message?: HeroMessage; signals: string[]; onShop: () => void; loading?: boolean }) {
  if (loading) return <section className="hero hero-skeleton" aria-label="Loading personalized hero" />;
  return <section className="hero hero-premium"><img src={heroImage} alt="Myntra Sync personalized fashion collection" /><div className="hero-copy"><p>MYNTRA SYNC <span>AI EDIT</span></p><h1>{message?.title ?? "Your next look starts here."}</h1><span className="hero-description">{message?.description ?? "Fresh drops and fashion made personal."}</span>{signals.length > 0 && <div className="context-pills" aria-label="Live personalization signals">{signals.map((signal) => <span key={signal}>{signal}</span>)}</div>}<button onClick={onShop}>Shop the edit <b>{"\u2192"}</b></button></div></section>;
}

export default function HeroBanner({ event, onShop }: { event?: string; onShop: () => void }) {
  const wedding = event?.toLowerCase().includes("wedding");
  return <section className="hero"><img src="https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=1700&q=88" alt="Festive fashion collection" /><div><p>SYNC EDIT</p><h1>{wedding ? "Wedding, styled around you." : "Your next look starts here."}</h1><span>{wedding ? "Curated celebratory pieces for every moment." : "Fresh drops, intuitive edits and fashion made personal."}</span><button onClick={onShop}>Shop the edit <b>→</b></button></div></section>;
}

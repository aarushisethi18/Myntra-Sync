interface GreetingCardProps { name?: string; eventTitle?: string }

export default function GreetingCard({ name, eventTitle }: GreetingCardProps) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <section className="greeting-card"><div><p className="eyebrow">Myntra Sync</p><h1>{greeting}, {name || "there"}</h1><p>{eventTitle ? `A little preparation for ${eventTitle} goes a long way.` : "Your personal style context, all in one place."}</p></div><span className="greeting-mark" aria-hidden="true">✦</span></section>;
}

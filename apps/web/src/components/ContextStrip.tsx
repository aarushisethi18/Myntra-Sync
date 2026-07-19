export default function ContextStrip({ weather, event }: { weather?: string; event?: string }) {
  return <aside className="context-strip"><span>✦</span><div><b>Your Sync edit</b><p>{event ? `Dressing for ${event}? We pulled together a considered edit.` : `It’s ${weather || "a good day"}. Here are pieces aligned with your moment.`}</p></div><button>Explore <b>→</b></button></aside>;
}

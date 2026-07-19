export default function ContextStrip({ signals, summary, loading = false }: { signals: string[]; summary?: string; loading?: boolean }) {
  if (loading) return <aside className="context-strip context-strip-skeleton" aria-label="Loading live context"><span>{"\u2726"}</span><div><b>Your Sync edit</b><p /></div></aside>;
  return <aside className="context-strip"><span>{"\u2726"}</span><div><b>Your AI Sync edit</b>{summary && <p>{summary}</p>}{signals.length > 0 && <div className="sync-signals">{signals.map((signal) => <small key={signal}>{signal}</small>)}</div>}</div><button>Explore <b>{"\u2192"}</b></button></aside>;
}


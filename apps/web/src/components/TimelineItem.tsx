export interface TimelineEntry { id: string; label: string; title: string; detail: string; kind: "weather" | "event" | "notification"; timestamp?: number }

export default function TimelineItem({ item, isLast }: { item: TimelineEntry; isLast: boolean }) {
  return <li className="timeline-item"><div className={`timeline-marker ${item.kind}`} aria-hidden="true">{item.kind === "weather" ? "☀" : item.kind === "event" ? "◷" : "!"}</div>{!isLast && <div className="timeline-line" aria-hidden="true" />}<div className="timeline-copy"><p className="timeline-label">{item.label}</p><h3>{item.title}</h3><p>{item.detail}</p></div></li>;
}

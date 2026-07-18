export interface DisplayNotification { title: string; message: string; dateLabel?: string; timestamp?: number }

export default function NotificationCard({ notifications }: { notifications: DisplayNotification[] }) {
  return <section className="detail-card"><p className="eyebrow">Stay in sync</p><h2>Notifications</h2>{notifications.length ? <ul className="notification-list">{notifications.map((item, index) => <li key={`${item.title}-${index}`}><span aria-hidden="true">!</span><div><h3>{item.title}</h3><p>{item.message}</p></div></li>)}</ul> : <p className="muted-copy">You're all caught up.</p>}</section>;
}

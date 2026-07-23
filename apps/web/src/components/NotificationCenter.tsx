import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Session } from "@supabase/supabase-js";

import { Button } from "./ui/button";
import { useNotifications } from "../hooks/useNotifications";
import type { NotificationItem, NotificationPriority } from "../types/notifications";

const priorityCopy: Record<NotificationPriority, string> = { critical: "Critical", high: "High", medium: "Medium", low: "Low" };
const priorityClass: Record<NotificationPriority, string> = { critical: "bg-red-50 text-red-700", high: "bg-orange-50 text-orange-700", medium: "bg-amber-50 text-amber-800", low: "bg-slate-100 text-slate-700" };
const notificationIcon: Record<string, string> = { "cloud-rain": "☔", sun: "☀", cloud: "☁", calendar: "◫", sparkles: "✦" };

function relativeTime(timestamp: string) {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3_600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3_600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

function NotificationCard({ item, onRead }: { item: NotificationItem; onRead: (id: string) => void }) {
  const action = item.action;
  return <article className={`rounded-2xl border p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${item.read ? "border-slate-100 bg-white/60 opacity-75" : "border-[#ffd9e5] bg-[#fff8fb] shadow-[0_5px_15px_rgba(255,63,108,.08)]"}`}>
    <div className="flex gap-3">
      <span aria-hidden="true" className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#fff0f4] text-lg">{notificationIcon[item.icon] ?? "●"}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <h3 className="flex-1 text-sm font-extrabold text-[#282C3F]">{item.title}</h3>
          {!item.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[#FF3F6C]" aria-label="Unread notification" />}
        </div>
        <div className="mt-1 flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${priorityClass[item.priority]}`}>{priorityCopy[item.priority]} priority</span>
          <time className="text-[11px] font-medium text-slate-500" dateTime={item.created_at}>{relativeTime(item.created_at)}</time>
        </div>
        <p className="mt-2 text-xs leading-5 text-slate-600">{item.message}</p>
        <div className="mt-3 flex items-center gap-2">
          {action && action.cta_type !== "none" && action.deep_link && <a className="text-xs font-extrabold text-[#FF3F6C] hover:underline" href={action.deep_link} target={action.cta_type === "external" ? "_blank" : undefined} rel={action.cta_type === "external" ? "noreferrer" : undefined}>{action.label}</a>}
          {!item.read && <button type="button" onClick={() => onRead(item.id)} className="ml-auto text-xs font-bold text-slate-500 transition-colors hover:text-[#FF3F6C]">Mark read</button>}
        </div>
      </div>
    </div>
  </article>;
}

export default function NotificationCenter({ session }: { session: Session | null }) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const { data, error, isLoading, refetch, unreadCount, markRead } = useNotifications(session);
  const badge = unreadCount > 9 ? "9+" : String(unreadCount);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const close = () => { setOpen(false); triggerRef.current?.focus(); };
  return <>
    <button ref={triggerRef} type="button" onClick={() => setOpen(true)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`} aria-haspopup="dialog" aria-expanded={open} className="relative flex flex-col items-center justify-center text-[#282C3F] transition-all duration-200 hover:text-[#FF3F6C] group">
      <span className="relative p-1 transition-transform duration-200 group-hover:scale-105"><svg className="size-[21px]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0a3 3 0 01-6 0" /></svg>{unreadCount > 0 && <span aria-hidden="true" className="absolute -right-2 -top-1 grid min-w-4 h-4 place-items-center rounded-full border-2 border-white bg-[#FF3F6C] px-1 text-[9px] font-extrabold text-white animate-[pulse_1.8s_ease-in-out_infinite]">{badge}</span>}</span>
      <span className="mt-0.5 text-[10px] font-bold tracking-wide">Alerts</span>
    </button>
    {open && createPortal(<div className="fixed inset-0 z-[100]" role="presentation">
      <button type="button" aria-label="Close notifications" className="absolute inset-0 cursor-default bg-[#282C3F]/25 backdrop-blur-[1px]" onClick={close} />
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="notification-center-title" className="absolute inset-x-0 bottom-0 max-h-[86vh] rounded-t-3xl bg-white shadow-2xl transition-transform duration-200 md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-none">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#FF3F6C]">Myntra Sync</p><h2 id="notification-center-title" className="text-lg font-extrabold text-[#282C3F]">Notifications</h2></div><Button variant="ghost" size="icon" onClick={close} aria-label="Close notifications">×</Button></div>
        <div className="max-h-[calc(86vh-84px)] overflow-y-auto p-4 md:max-h-[calc(100vh-84px)]">
          {isLoading && <div className="space-y-3" aria-label="Loading notifications">{[1, 2, 3].map((item) => <div key={item} className="h-28 animate-pulse rounded-2xl bg-slate-100" />)}</div>}
          {error && <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-center"><p className="text-sm font-bold text-red-700">Notifications could not load.</p><Button className="mt-3" size="sm" variant="outline" onClick={() => void refetch()}>Try again</Button></div>}
          {!isLoading && !error && data?.notifications.length === 0 && <div className="py-16 text-center"><div className="text-3xl" aria-hidden="true">✦</div><h3 className="mt-3 font-extrabold text-[#282C3F]">You’re all caught up</h3><p className="mt-1 text-sm text-slate-500">New style moments will appear here.</p></div>}
          {!isLoading && !error && data && <div className="space-y-3">{data.notifications.map((item) => <NotificationCard key={item.id} item={item} onRead={(id) => markRead.mutate(id)} />)}</div>}
        </div>
      </div>
    </div>, document.body)}
  </>;
}

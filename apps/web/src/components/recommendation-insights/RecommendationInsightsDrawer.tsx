import { createPortal } from "react-dom";
import { useEffect, useMemo, useRef } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Product } from "../../types/catalog";
import { useContextSnapshot } from "../../hooks/useContextSnapshot";
import { useOrderHistoryIntelligence } from "../../hooks/useOrderHistoryIntelligence";
import { FashionDNATab } from "./FashionDNATab";
import { FestivalTab } from "./FestivalTab";
import { OrderHistoryTab } from "./OrderHistoryTab";
import { RecommendationSidebar, type InsightTabId, type SidebarItem } from "./RecommendationSidebar";
import { UpcomingEventTab } from "./UpcomingEventTab";
import { WeatherTab } from "./WeatherTab";
import { WishlistPlaceholderTab } from "./WishlistPlaceholderTab";

type Props = { open: boolean; selectedTab: InsightTabId; onSelectedTabChange: (tab: InsightTabId) => void; onClose: () => void; session: Session | null; recommendation?: Product; triggerRef: React.RefObject<HTMLButtonElement | null> };

const TABS: SidebarItem[] = [
  { id: "weather", label: "Weather", icon: "🌦" }, { id: "festival", label: "Festival", icon: "🎉" },
  { id: "event", label: "Event", icon: "📅" }, { id: "fashion-dna", label: "Fashion DNA", icon: "🧬" },
  { id: "order-history", label: "Orders", icon: "🛍" }, { id: "wishlist", label: "Wishlist", icon: "♥", comingSoon: true },
];

export function RecommendationInsightsDrawer({ open, selectedTab, onSelectedTabChange, onClose, session, recommendation, triggerRef }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const contextQuery = useContextSnapshot(open ? session : null);
  const orderQuery = useOrderHistoryIntelligence(open ? session : null, recommendation?.id);
  useEffect(() => { if (!open) return; const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); if (event.key === "Tab" && dialogRef.current) { const nodes = dialogRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), [href], [tabindex]:not([tabindex="-1"])'); if (!nodes.length) return; const first = nodes[0]; const last = nodes[nodes.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }; document.addEventListener("keydown", onKeyDown); dialogRef.current?.querySelector<HTMLElement>("button")?.focus(); return () => document.removeEventListener("keydown", onKeyDown); }, [open, onClose]);
  const content = useMemo(() => ({
    weather: <WeatherTab context={contextQuery.data?.context} loading={contextQuery.isLoading} error={contextQuery.isError} retry={() => void contextQuery.refetch()} />,
    festival: <FestivalTab context={contextQuery.data?.context} loading={contextQuery.isLoading} error={contextQuery.isError} retry={() => void contextQuery.refetch()} />,
    event: <UpcomingEventTab context={contextQuery.data?.context} loading={contextQuery.isLoading} error={contextQuery.isError} retry={() => void contextQuery.refetch()} />,
    "fashion-dna": <FashionDNATab data={contextQuery.data?.fashionDna} loading={contextQuery.isLoading} error={contextQuery.isError} retry={() => void contextQuery.refetch()} />,
    "order-history": <OrderHistoryTab data={orderQuery.data} loading={orderQuery.isLoading} error={orderQuery.isError} retry={() => void orderQuery.refetch()} />,
    wishlist: <WishlistPlaceholderTab />,
  }), [contextQuery.data, contextQuery.isError, contextQuery.isLoading, orderQuery.data, orderQuery.isError, orderQuery.isLoading]);
  if (!open) return null;
  const close = () => { onClose(); window.setTimeout(() => triggerRef.current?.focus(), 0); };
  return createPortal(<div className="fixed inset-0 z-[100]" role="presentation"><button type="button" aria-label="Close recommendation insights" className="absolute inset-0 cursor-default bg-[#282C3F]/25 backdrop-blur-[1px]" onClick={close} /><div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="recommendation-insights-title" className="absolute inset-0 flex animate-fade-in-up flex-col bg-white shadow-2xl sm:left-auto sm:w-[80vw] md:w-[460px]"><header className="flex items-start justify-between border-b border-[#EAEAEC] px-5 py-4"><div><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#FF3F6C]">Myntra LifeOS</p><h2 id="recommendation-insights-title" className="text-lg font-extrabold text-[#282C3F]">Recommendation Insights</h2><p className="mt-1 text-xs text-slate-500">Understand why LifeOS generated today’s recommendation.</p></div><button type="button" onClick={close} aria-label="Close recommendation insights" className="grid size-9 place-items-center rounded-full border border-[#EAEAEC] text-lg hover:bg-[#FFF0F4] hover:text-[#FF3F6C]">×</button></header><div className="flex min-h-0 flex-1 flex-col md:flex-row"><RecommendationSidebar tabs={TABS} selected={selectedTab} onSelect={onSelectedTabChange} /><main className="min-h-0 flex-1 overflow-y-auto p-5"><div key={selectedTab} className="animate-fade-in-up">{content[selectedTab]}</div></main></div></div></div>, document.body);
}

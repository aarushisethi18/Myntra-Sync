export type InsightTabId = "weather" | "festival" | "event" | "fashion-dna" | "order-history" | "wishlist";
export type SidebarItem = { id: InsightTabId; label: string; icon: string; comingSoon?: boolean };

export function RecommendationSidebar({ tabs, selected, onSelect }: { tabs: SidebarItem[]; selected: InsightTabId; onSelect: (id: InsightTabId) => void }) {
  return <nav aria-label="Recommendation insight sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#EAEAEC] p-3 md:w-36 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
    {tabs.map((tab) => <button key={tab.id} type="button" disabled={tab.comingSoon} onClick={() => onSelect(tab.id)} aria-current={selected === tab.id ? "page" : undefined} className={`shrink-0 rounded-xl px-3 py-2 text-left text-xs font-bold transition-colors ${selected === tab.id ? "bg-[#FFF0F4] text-[#FF3F6C]" : "text-[#555] hover:bg-[#F5F5F6]"} disabled:cursor-not-allowed disabled:text-[#B5B6BA]`}><span aria-hidden="true">{tab.icon}</span><span className="ml-1.5">{tab.label}</span>{tab.comingSoon && <span className="mt-1 block text-[9px] uppercase tracking-wide">Soon</span>}</button>)}
  </nav>;
}

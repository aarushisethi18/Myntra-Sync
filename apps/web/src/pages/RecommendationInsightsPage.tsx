import { useCallback, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import ProductCard from "../components/ProductCard";
import ShoppingInsights from "./ShoppingInsights";
import ProductDetails from "../components/ProductDetails";
import ShopHeader from "../components/ShopHeader";
import { useAuth } from "../hooks/useAuth";
import { useContextSnapshot } from "../hooks/useContextSnapshot";
import { useOrderHistoryIntelligence } from "../hooks/useOrderHistoryIntelligence";
import { useWishlistIntelligence } from "../hooks/useWishlistIntelligence";
import { useAnalyticsTracking } from "../hooks/useAnalyticsTracking";
import { addToBag, addToWishlist, fetchRecommendations, removeFromWishlist } from "../services/catalogService";
import type { InsightSignal, RecommendationScope } from "../services/catalogService";
import type { Product } from "../types/catalog";
import type { WishlistIntelligence, WishlistIntelligenceResponse } from "../types/wishlistIntelligence";

type Tab = { id: InsightSignal | "shopping-insights"; label: string; icon: string };

const tabs: Tab[] = [
  { id: "weather", label: "Weather", icon: "🌦" },
  { id: "festival", label: "Festival", icon: "🎉" },
  { id: "event", label: "Upcoming Event", icon: "📅" },
  { id: "fashion-dna", label: "Fashion DNA", icon: "🧬" },
  { id: "order-history", label: "Order History", icon: "🛍" },
  { id: "wishlist", label: "Wishlist", icon: "❤️" },
  { id: 'shopping-insights', label: 'Shopping Insights', icon: '✦' },
];

const titles: Record<InsightSignal, string> = {
  weather: "Recommended because of Weather",
  festival: "Recommended because of Festival",
  event: "Recommended because of your Upcoming Event",
  "fashion-dna": "Recommended because of your Fashion DNA",
  "order-history": "Recommended because of your Order History",
  wishlist: "Recommended Because of Your Wishlist",
};

const insightScopes: Record<InsightSignal, RecommendationScope> = {
  weather: "weather",
  festival: "festival",
  event: "event",
  "fashion-dna": "fashionDna",
  wishlist: "wishlistAffinity",
  "order-history": "orderHistoryAffinity",
};

function hasWishlistIntelligence(
  response: WishlistIntelligenceResponse | undefined,
): response is WishlistIntelligence {
  return response?.status === "ok";
}

function Skeleton() {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-72 animate-pulse rounded-2xl bg-slate-100" />)}</div>;
}

function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#EAEAEC] bg-[#FAFAFA] px-6 py-14 text-center text-sm leading-6 text-[#777]">{children}</div>;
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return <div className="rounded-2xl border border-red-100 bg-red-50 p-5 text-sm text-red-700">Recommendations could not load. <button type="button" onClick={onRetry} className="font-bold underline">Try again</button></div>;
}

export default function RecommendationInsightsPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const trackAnalytics = useAnalyticsTracking();
  const [active, setActive] = useState<InsightSignal | "shopping-insights">("weather");
  const [selected, setSelected] = useState<Product | null>(null);
  const [wished, setWished] = useState(new Set<string>());
  const contextQuery = useContextSnapshot(session);
  const orderQuery = useOrderHistoryIntelligence(session);
  const wishlistQuery = useWishlistIntelligence(session);
  const isShopping = active === "shopping-insights";
  const isWishlist = active === "wishlist";
  const wishlistResponse = wishlistQuery.data;
  const wishlist = hasWishlistIntelligence(wishlistResponse) ? wishlistResponse : undefined;
  const insightReady = isWishlist
    ? wishlistQuery.data?.status === "ok"
    : !contextQuery.isLoading && !orderQuery.isLoading;
  const productQuery = useQuery({
    queryKey: ["insight-products", session?.user.id, active, contextQuery.data, orderQuery.data, wishlistQuery.data],
    queryFn: () => fetchRecommendations(session!, insightScopes[active as InsightSignal]),
    enabled: Boolean(session) && insightReady && !isShopping,
    staleTime: 10 * 60_000,
  });
  const close = useCallback(() => { navigate(-1); }, [navigate]);
  const toggleWish = useCallback(async (product: Product) => {
    if (!session) return;
    const exists = wished.has(product.id);
    if (exists) await removeFromWishlist(session, product.id);
    else await addToWishlist(session, product.id);
    setWished((value) => {
      const next = new Set(value);
      if (exists) next.delete(product.id);
      else next.add(product.id);
      return next;
    });
  }, [session, wished]);

  const context = contextQuery.data?.context;
  const weather = context?.weather;
  const event = context?.calendar.events[0];
  const festival = context?.festival;
  const dna = contextQuery.data?.fashionDna;
  const orders = orderQuery.data;
  const unavailable = active === "festival" && !festival?.name
    ? "No festival signal is active right now. When one is detected, its styling influence will appear here."
    : active === "event" && !event?.title
      ? "No upcoming event is available. Connect your calendar to personalise this edit for your next moment."
      : active === "weather" && !weather?.condition
        ? "Your local weather is still syncing. Enable location access to tailor this edit to today’s conditions."
        : null;
  const hero = isWishlist && wishlist
    ? {
        title: wishlist.wishlistPersona,
        chips: [wishlist.favoriteBrands[0]?.brand, wishlist.favoriteCategories[0]?.category, `₹${wishlist.preferredBudget.min.toLocaleString("en-IN")}–₹${wishlist.preferredBudget.max.toLocaleString("en-IN")}`],
        why: `Your saved products reveal a long-term preference for ${wishlist.favoriteStyles[0] ?? "your favourite"} styles and ${wishlist.favoriteColors[0] ?? "your preferred"} colours.`,
      }
    : active === "weather"
      ? { title: weather?.condition ? `${weather.condition}${weather.temperature != null ? ` · ${Math.round(weather.temperature)}°C` : ""}` : "Weather-aware style", chips: [context?.location.city, weather?.condition, weather?.temperature != null ? `${Math.round(weather.temperature)}°C` : undefined], why: weather?.temperature != null ? `${context?.location.city ?? "Your location"} is currently ${weather.condition?.toLowerCase() ?? "changing"} and ${Math.round(weather.temperature)}°C, so this edit favours practical fabrics and easy comfort.` : "Your local conditions help tune the day’s edit." }
      : active === "festival"
        ? { title: festival?.name ?? "Festival style", chips: [festival?.name, festival?.daysRemaining != null ? `${festival.daysRemaining} days away` : undefined, "Festive mood"], why: festival?.name ? `${festival.name} shapes a celebratory palette and occasion-ready categories.` : "Festival signals add colour and occasion context to your edit." }
        : active === "event"
          ? { title: event?.title ?? "Upcoming moment", chips: [event?.title, event?.type, event?.start], why: event?.title ? `Because you have ${event.title} coming up, these choices fit the occasion.` : "Calendar moments help Myntra-Sync prepare your look." }
          : active === "fashion-dna"
            ? { title: "Your Fashion DNA", chips: [dna?.brandAffinity[0]?.value, dna?.styleAffinity[0]?.value, dna?.colorAffinity[0]?.value], why: "Your favourite brands, aesthetics, and colours make this recommendation feel more like you." }
            : { title: orders?.status === "ok" ? orders.shoppingPersona : "Your shopping history", chips: orders?.status === "ok" ? [orders.favoriteBrands[0]?.brand, orders.favoriteCategories[0]?.category, `₹${orders.averageSpend.toLocaleString("en-IN")} average`] : [], why: orders?.status === "ok" ? "Past purchases help identify brands, categories, and price ranges that feel familiar." : "Your shopping history will become a stronger signal as you shop." };

  return <div className="min-h-screen bg-[#FAFAFA] text-[#282C3F]">
    <ShopHeader onSearch={() => {}} onCategory={() => {}} />
    <main className="mx-auto max-w-[1440px] px-4 py-6 md:px-10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div><p className="text-[10px] font-extrabold uppercase tracking-[.2em] text-[#FF3F6C]">Myntra-Sync</p><h1 className="font-editorial text-3xl md:text-4xl">Recommendation Insights</h1><p className="mt-1 text-sm text-[#777]">Understand why Myntra-Sync recommended today’s look.</p></div>
        <button type="button" onClick={close} className="rounded-full border border-[#EAEAEC] bg-white px-4 py-2 text-xs font-extrabold hover:border-[#FF3F6C] hover:text-[#FF3F6C]">← Back to home</button>
      </div>
      <div className="flex min-h-[650px] flex-col overflow-hidden rounded-3xl border border-[#EAEAEC] bg-white shadow-[0_12px_36px_rgba(40,44,63,0.06)] md:flex-row">
        <nav role="tablist" aria-label="Recommendation insight sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-[#EAEAEC] bg-[#FFFCFD] p-3 md:w-52 md:flex-col md:overflow-visible md:border-b-0 md:border-r">
          {tabs.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={active === tab.id} onClick={() => setActive(tab.id)} className={`rounded-xl px-3 py-3 text-left text-xs font-extrabold transition-colors ${active === tab.id ? "bg-[#FFF0F4] text-[#FF3F6C]" : "text-[#555] hover:bg-[#F5F5F6]"}`}><span aria-hidden="true">{tab.icon}</span><span className="ml-2">{tab.label}</span></button>)}
        </nav>
        <section role="tabpanel" className="min-w-0 flex-1 p-5 md:p-8">
          <div key={active} className="animate-fade-in-up">
            {isShopping ? <ShoppingInsights session={session} /> : isWishlist ? <>
              {wishlistQuery.isLoading ? <Skeleton /> : wishlistQuery.isError ? <ErrorState onRetry={() => void wishlistQuery.refetch()} /> : wishlistQuery.data?.status === "empty" ? <Empty><h2 className="text-lg font-extrabold text-[#282C3F]">❤️ Build Your Wishlist</h2><p className="mx-auto mt-2 max-w-md">Save products you love and Myntra-Sync will learn your long-term fashion preferences to deliver smarter recommendations.</p><button type="button" onClick={() => navigate("/catalog/all")} className="mt-5 rounded-full bg-[#FF3F6C] px-5 py-2.5 text-xs font-extrabold text-white hover:bg-[#e83761]">Browse Products</button></Empty> : wishlist ? <>
                <section className="rounded-2xl bg-gradient-to-br from-[#FFF0F4] via-[#FFF8FA] to-white p-5"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#FF3F6C]">❤️ Wishlist Intelligence</p><h2 className="mt-1 text-xl font-extrabold">{hero.title}</h2><div className="mt-3 flex flex-wrap gap-2">{hero.chips.filter(Boolean).map((chip) => <span key={String(chip)} className="rounded-full border border-[#FFD2DF] bg-white px-3 py-1 text-[11px] font-bold text-[#8E3450]">{chip}</span>)}</div><p className="mt-4 text-sm leading-6 text-[#5F5760]">{hero.why}</p></section>
                <section className="mt-5 grid gap-3 sm:grid-cols-3"><div className="rounded-2xl border border-[#EAEAEC] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#94969F]">Wishlist Persona</p><p className="mt-1 font-extrabold">{wishlist.wishlistPersona}</p></div><div className="rounded-2xl border border-[#EAEAEC] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#94969F]">Wishlist Size</p><p className="mt-1 font-extrabold">{wishlist.wishlistSize} saved {wishlist.wishlistSize === 1 ? "product" : "products"}</p></div><div className="rounded-2xl border border-[#EAEAEC] p-4"><p className="text-[10px] font-extrabold uppercase tracking-wide text-[#94969F]">Preferred Budget</p><p className="mt-1 font-extrabold">₹{wishlist.preferredBudget.min.toLocaleString("en-IN")}–₹{wishlist.preferredBudget.max.toLocaleString("en-IN")}</p></div></section>
                <section className="mt-5 grid gap-4 md:grid-cols-2"><div className="rounded-2xl bg-[#FAFAFA] p-4"><h3 className="font-extrabold">Favorite Brands</h3><p className="mt-2 text-sm text-[#777]">{wishlist.favoriteBrands.map((item) => item.brand).join(" · ") || "No brand signal yet"}</p></div><div className="rounded-2xl bg-[#FAFAFA] p-4"><h3 className="font-extrabold">Favorite Categories</h3><p className="mt-2 text-sm text-[#777]">{wishlist.favoriteCategories.map((item) => item.category).join(" · ") || "No category signal yet"}</p></div><div className="rounded-2xl bg-[#FAFAFA] p-4"><h3 className="font-extrabold">Favorite Styles</h3><p className="mt-2 text-sm text-[#777]">{wishlist.favoriteStyles.join(" · ") || "No style signal yet"}</p></div><div className="rounded-2xl bg-[#FAFAFA] p-4"><h3 className="font-extrabold">Favorite Colors</h3><p className="mt-2 text-sm text-[#777]">{wishlist.favoriteColors.join(" · ") || "No color signal yet"}</p></div></section>
                <section className="mt-5 rounded-2xl border border-[#EAEAEC] p-5"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#FF3F6C]">Why this matters</p><h2 className="mt-1 text-lg font-extrabold">Recommendation reasons</h2><ul className="mt-3 space-y-2 text-sm text-[#5F5760]">{wishlist.recommendationReasons.map((reason) => <li key={reason}>• {reason}</li>)}</ul><p className="mt-4 text-xs text-[#94969F]">Wishlist activity: {new Date(wishlist.wishlistActivity.firstSavedAt).toLocaleDateString("en-IN")} to {new Date(wishlist.wishlistActivity.mostRecentSavedAt).toLocaleDateString("en-IN")}</p></section>
                <section className="mt-6"><h2 className="mb-4 text-lg font-extrabold">{titles.wishlist}</h2>{productQuery.isLoading ? <Skeleton /> : productQuery.isError ? <ErrorState onRetry={() => void productQuery.refetch()} /> : productQuery.data?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{productQuery.data.map((product) => <ProductCard key={product.id} product={product} explanation={product.recommendationReasons?.[0]} wished={wished.has(product.id)} onOpen={() => setSelected(product)} onWish={() => void toggleWish(product)} onBrandOpen={() => {}} />)}</div> : <Empty>No live catalog products match your wishlist preferences yet.</Empty>}</section>
              </> : null}
            </> : <>
              <section className="rounded-2xl bg-gradient-to-br from-[#FFF0F4] via-[#FFF8FA] to-white p-5"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#FF3F6C]">Signal detected</p><h2 className="mt-1 text-xl font-extrabold">{hero.title}</h2><div className="mt-3 flex flex-wrap gap-2">{hero.chips.filter(Boolean).map((chip) => <span key={String(chip)} className="rounded-full border border-[#FFD2DF] bg-white px-3 py-1 text-[11px] font-bold text-[#8E3450]">{chip}</span>)}</div><p className="mt-4 text-sm leading-6 text-[#5F5760]">{hero.why}</p></section>
              <section className="mt-5"><p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-[#FF3F6C]">Why this matters</p><h2 className="mt-1 text-lg font-extrabold">Why these were chosen</h2><p className="mt-1 text-sm text-[#777]">Each product is ranked against this signal’s live attributes, separate from the homepage recommendation engine.</p></section>
              <section className="mt-5"><h2 className="mb-4 text-lg font-extrabold">{titles[active as InsightSignal]}</h2>{active === "order-history" && orders?.status === "insufficient_data" ? <Empty>Shop a little more and Myntra-Sync will begin personalizing recommendations from your shopping history.</Empty> : unavailable ? <Empty>{unavailable}</Empty> : productQuery.isLoading || contextQuery.isLoading ? <Skeleton /> : productQuery.isError ? <ErrorState onRetry={() => void productQuery.refetch()} /> : productQuery.data?.length ? <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">{productQuery.data.map((product) => <ProductCard key={product.id} product={product} explanation={product.recommendationReasons?.[0]} wished={wished.has(product.id)} onOpen={() => setSelected(product)} onWish={() => void toggleWish(product)} onBrandOpen={() => {}} />)}</div> : <Empty>No live catalog products match this signal yet. As catalog metadata grows, this edit will become more specific.</Empty>}</section>
            </>}
          </div>
        </section>
      </div>
    </main>
    {selected && <ProductDetails product={selected} onClose={() => setSelected(null)} onCart={async () => { if (session) { await addToBag(session, selected.id, selected.sizes[0] || "One Size"); trackAnalytics({ eventType: "BAG_ADD", productId: selected.id, brand: selected.brand, category: selected.category, price: selected.price }); setSelected(null); } }} onPurchase={() => navigate("/bag")} />}
  </div>;
}

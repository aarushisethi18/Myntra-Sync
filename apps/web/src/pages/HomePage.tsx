import { useCallback, useMemo, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import ContextStrip from "../components/ContextStrip";
import HeroBanner from "../components/HeroBanner";
import ProductCarousel from "../components/ProductCarousel";
import ProductDetails from "../components/ProductDetails";
import ShopHeader from "../components/ShopHeader";
import { useAuth } from "../hooks/useAuth";
import { useBehaviorTracking } from "../hooks/useBehaviorTracking";
import { useHomePersonalization } from "../hooks/useHomePersonalization";
import { 
  catalog, 
  personalize, 
  fetchWishlist, 
  addToWishlist, 
  removeFromWishlist, 
  fetchBag, 
  addToBag, 
  createOrder 
} from "../services/catalogService";
import { createPersonalizationExplanation } from "../services/personalizationExplanationService";
import type { Product } from "../types/catalog";
import ContextSimulator from "../components/ContextSimulator";
import AIExperiences from "../components/AIExperiences";
import { useAnalyticsTracking } from "../hooks/useAnalyticsTracking";
import { collectLiveContext } from "../services/signalCollectionService";
import { requestPersonalizationRefresh } from "../services/personalizationRefresh";
import { getCalendarStatus, connectCalendar, disconnectCalendar } from "../services/calendarService";


// Presentational component for section scroll reveals using native IntersectionObserver
function ScrollReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -50px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out transform ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </div>
  );
}

// Presentational Brand Promotion Spotlight
function BrandSpotlight() {
  return (
    <div className="my-12 mx-6 md:mx-12 rounded-3xl overflow-hidden bg-[#1D1E2A] text-white shadow-[0_12px_40px_rgba(0,0,0,0.12)] flex flex-col lg:flex-row items-center justify-between">
      <div className="p-8 md:p-12 lg:p-16 max-w-[500px]">
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-[#FF905A] uppercase block mb-3.5">
          Exclusive Spotlight
        </span>
        <h3 className="font-editorial text-[30px] md:text-[38px] leading-tight font-medium mb-4">
          The Roadster & PUMA Drop
        </h3>
        <p className="text-[13px] md:text-[14px] text-gray-300/95 leading-relaxed mb-7 font-sans-tight">
          Reworked classics from Roadster and PUMA. Elevate your everyday wardrobe with structured denim trucker jackets and lightweight statement soles, curated to match your aesthetic DNA.
        </p>
        <button
          onClick={() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth" })}
          className="px-6 py-3 bg-white text-[#282C3F] font-bold text-[12px] tracking-wide rounded-full hover:bg-[#FF3F6C] hover:text-white transition-all duration-300 cursor-pointer shadow-md active:scale-97"
        >
          Shop The Trend
        </button>
      </div>
      <div className="w-full lg:w-1/2 flex gap-4 p-6 md:p-8 overflow-hidden bg-[#242636]/60">
        <div className="w-1/2 aspect-portrait rounded-2xl overflow-hidden bg-[#1c0c18] relative group">
          <img
            src="https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=500&q=80"
            alt="Roadster Denim"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent p-4 flex flex-col justify-end">
            <span className="text-[9px] font-bold text-[#FF905A] tracking-wider uppercase">Roadster</span>
            <span className="text-[12px] font-bold text-white/95">Denim Trucker Jacket</span>
          </div>
        </div>
        <div className="w-1/2 aspect-portrait rounded-2xl overflow-hidden bg-[#1c0c18] relative group">
          <img
            src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=500&q=80"
            alt="PUMA RS-X"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent p-4 flex flex-col justify-end">
            <span className="text-[9px] font-bold text-[#FF905A] tracking-wider uppercase">PUMA</span>
            <span className="text-[12px] font-bold text-white/95">RS-X Elevated Sneakers</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Premium High-Density Footer
function Footer() {
  return (
    <footer className="bg-[#282C3F] text-[#94969F] text-[13px] mt-20 pt-16 pb-12 border-t border-[#EAEAEC]/15">
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-16">
        {/* Brand Meta */}
        <div className="space-y-4">
          <div className="flex items-center gap-2.5 text-white font-extrabold text-[18px] tracking-tight">
            <span className="flex items-center justify-center bg-[#FF3F6C] text-white w-6.5 h-6.5 rounded-[7px] font-serif italic font-bold">
              m
            </span>
            <span>Myntra <span className="text-[#FF3F6C] font-normal italic">Sync</span></span>
          </div>
          <p className="text-[12px] leading-relaxed text-gray-400 font-sans-tight max-w-[260px]">
            The next generation of style. An intelligent, context-aware shopping platform synchronized with your weather, calendar, and fashion DNA.
          </p>
        </div>

        {/* Links Column 1 */}
        <div className="space-y-3">
          <h4 className="text-white text-[11px] font-extrabold tracking-widest uppercase">
            Shop By Categories
          </h4>
          <ul className="space-y-2 text-[12.5px]">
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Men's Fashion</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Women's Fashion</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Kids & Toys</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Beauty & Wellness</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Home Essentials</a></li>
          </ul>
        </div>

        {/* Links Column 2 */}
        <div className="space-y-3">
          <h4 className="text-white text-[11px] font-extrabold tracking-widest uppercase">
            Platform Help
          </h4>
          <ul className="space-y-2 text-[12.5px]">
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Track Your Orders</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Shipping & Delivery</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Cancellations & Returns</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Terms of Use</a></li>
            <li><a href="#top" className="hover:text-white transition-colors duration-150">Privacy Policy</a></li>
          </ul>
        </div>

        {/* Trust Indicators */}
        <div className="space-y-4">
          <h4 className="text-white text-[11px] font-extrabold tracking-widest uppercase">
            Sync Guarantee
          </h4>
          <div className="space-y-3 text-[12px] text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-[#FF905A] text-[15px]">|</span>
              <span>100% Genuine Designer Apparel</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#FF3F6C] text-[15px]">|</span>
              <span>Hassle-Free 30-Day Returns</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#03A685] text-[15px]">|</span>
              <span>Contextual AI Wardrobe Match</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-8 border-t border-[#94969F]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11.5px] text-[#94969F]/80">
        <span>(c) {new Date().getFullYear()} Myntra Sync. Powered by Advanced Agentic Style Recommendation.</span>
        <span>Made for HackerRamp WeForShe Demo</span>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const track = useBehaviorTracking();
  const trackAnalytics = useAnalyticsTracking();
  const { context, dna, products: apiProducts, loading } = useHomePersonalization(session);
  
  const [selected, setSelected] = useState<Product | null>(null);
  const [wished, setWished] = useState<Set<string>>(new Set());
  const [bag, setBag] = useState(0);
  const [search, setSearch] = useState("");

  const [calendarConnected, setCalendarConnected] = useState(false);
  const [calendarEmail, setCalendarEmail] = useState("");
  const [notification, setNotification] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    const savedScroll = window.sessionStorage.getItem("myntra-sync:home-scroll-y");
    if (!savedScroll) return;
    window.sessionStorage.removeItem("myntra-sync:home-scroll-y");
    requestAnimationFrame(() => window.scrollTo({ top: Number(savedScroll), behavior: "auto" }));
  }, []);

  // Fetch calendar connection status
  useEffect(() => {
    if (session) {
      getCalendarStatus(session)
        .then((status) => {
          setCalendarConnected(status.connected);
          setCalendarEmail(status.email || "");
        })
        .catch((err) => console.error("Error fetching calendar status", err));
    }
  }, [session]);

  // Handle Google OAuth redirect callback search parameters
  useEffect(() => {
    const url = new URL(window.location.href);
    const calStatus = url.searchParams.get("calendar");
    if (calStatus) {
      if (calStatus === "connected") {
        setNotification({
          type: "success",
          message: "Google Calendar connected! Context & personalizations successfully synced."
        });
        if (session) {
          collectLiveContext(session)
            .then(() => {
              requestPersonalizationRefresh();
              getCalendarStatus(session).then((status) => {
                setCalendarConnected(status.connected);
                setCalendarEmail(status.email || "");
              });
            })
            .catch((err) => console.error("Error collecting live context on callback", err));
        }
      } else if (calStatus === "error") {
        const reason = url.searchParams.get("reason") || "authorization_failed";
        setNotification({
          type: "error",
          message: `Failed to connect calendar: ${decodeURIComponent(reason)}`
        });
      }
      url.searchParams.delete("calendar");
      url.searchParams.delete("reason");
      window.history.replaceState({}, document.title, url.pathname + url.search);
      
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [session]);

  const handleCalendarConnect = async () => {
    if (!session) return;
    try {
      const authUrl = await connectCalendar(session);
      window.location.href = authUrl;
    } catch (err) {
      alert("Failed to start calendar integration.");
    }
  };

  const handleCalendarDisconnect = async () => {
    if (!session) return;
    try {
      await disconnectCalendar(session);
      setCalendarConnected(false);
      setCalendarEmail("");
      setNotification({
        type: "success",
        message: "Google Calendar successfully disconnected."
      });
      await collectLiveContext(session);
      requestPersonalizationRefresh();
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      alert("Failed to disconnect calendar.");
    }
  };

  // Sync wishlist and bag states on mount or session change
  useEffect(() => {
    if (session) {
      fetchWishlist(session)
        .then((items) => setWished(new Set(items.map((i) => i.product.id))))
        .catch(() => {});
      fetchBag(session)
        .then((items) => setBag(items.reduce((acc, i) => acc + i.quantity, 0)))
        .catch(() => {});
    }
  }, [session]);

  const products = useMemo(() => personalize(apiProducts.length > 0 ? apiProducts : catalog, dna, context), [apiProducts, dna, context]);
  const explanation = useMemo(() => createPersonalizationExplanation(context, dna), [context, dna]);

  const contextPills = useMemo(() => {
    const weather = context?.weather;
    const weatherCondition = weather?.condition && weather.condition !== "Unknown" && weather.condition !== "Unavailable" ? weather.condition : undefined;
    return [
      context?.location.city ? `Location: ${context.location.city}` : undefined,
      typeof weather?.temperature === "number" ? `Temperature: ${Math.round(weather.temperature)}\u00B0C` : undefined,
      weatherCondition ? `Weather: ${weatherCondition}` : undefined,
      context?.festival?.name ? `Festival: ${context.festival.name}` : undefined,
    ].filter((signal): signal is string => Boolean(signal));
  }, [context]);

  const filtered = search ? products.filter((product) => `${product.brand} ${product.title} ${product.category}`.toLowerCase().includes(search.toLowerCase())) : products;
  // Keep the gateway focused: this is the only product rail on the homepage.
  const recommendedProducts = useMemo(() => filtered.slice(0, 15), [filtered]);
  const open = useCallback((product: Product, recommendation = false) => {
    const productEvent = { productId: product.id, brand: product.brand, category: product.category, color: product.color, style: product.style, price: product.price };
    track({ eventType: "PRODUCT_CLICK", ...productEvent, metadata: { interaction: "PRODUCT_CLICK" } });
    
    if (recommendation) track({ eventType: "RECOMMENDATION_CLICK", ...productEvent });
    setSelected(product);
    
  }, [track, trackAnalytics]);
  
  

  const wish = useCallback(async (product: Product) => {
    if (!session) return;
    const had = wished.has(product.id);
    try {
      if (had) {
        await removeFromWishlist(session, product.id);
        setWished((current) => { const next = new Set(current); next.delete(product.id); return next; });
      } else {
        await addToWishlist(session, product.id);
        setWished((current) => { const next = new Set(current); next.add(product.id); return next; });
      }
      track({ eventType: had ? "WISHLIST_REMOVE" : "WISHLIST_ADD", productId: product.id, brand: product.brand, category: product.category, color: product.color, style: product.style, price: product.price });
      trackAnalytics({
  eventType: had ? "WISHLIST_REMOVE" : "WISHLIST_ADD",
  productId: product.id,
  brand: product.brand,
  category: product.category,
  style: product.style,
  price: product.price,
});
    } catch (err) {
      console.error("Wishlist action failed", err);
    }
  }, [session, track, trackAnalytics, wished]);

  // Visibility is not intent: impressions deliberately do not create PRODUCT_VIEW analytics events.
  const trackImpression = useCallback((_product: Product, _carouselTitle: string) => undefined, []);
  const trackBrandOpen = useCallback(
  (product: Product) => {
    track({
      eventType: "BRAND_OPEN",
      productId: product.id,
      brand: product.brand,
      metadata: { interaction: "BRAND_INTERACTION" },
    });

    trackAnalytics({
      eventType: "BRAND_VIEW",
      productId: product.id,
      brand: product.brand,
      category: product.category,
      style: product.style,
      price: product.price,
    });
  },
  [track, trackAnalytics]
);
const trackCarouselInteraction = useCallback((carouselTitle: string) => track({ eventType: "HOME_SECTION_CLICK", metadata: { interaction: "CAROUSEL_INTERACTION", carouselTitle } }), [track]);
  const category = useCallback((name: string) => {
  track({
    eventType: "CATEGORY_OPEN",
    category: name,
  });

  trackAnalytics({
    eventType: "CATEGORY_VIEW",
    category: name,
  });

  setSearch(
    name === "Home" || name === "Gen Z" || name === "Studio"
      ? ""
      : name
  );
}, [track, trackAnalytics]);
  
 const doSearch = useCallback((value: string) => {
  setSearch(value);

  track({
    eventType: "SEARCH",
    metadata: { query: value },
  });

  trackAnalytics({
    eventType: "SEARCH",
    metadata: {
      query: value,
    },
  });
}, [track, trackAnalytics]);

  return (
    <main id="top" className="bg-white min-h-screen text-[#282C3F] font-sans selection:bg-[#FF3F6C]/20 overflow-x-hidden">
      {/* Sticky Header */}
      <ShopHeader onSearch={doSearch} onCategory={category} bagCount={bag} />

      {/* Toast Notification */}
      {notification && (
        <div 
          className={`fixed top-20 right-6 z-50 p-4 rounded-xl shadow-xl border flex items-center gap-3 animate-fade-in-up transition-all ${
            notification.type === "success" 
              ? "bg-[#ECFDF5] border-[#A7F3D0] text-[#047857]" 
              : "bg-[#FEF2F2] border-[#FCA5A5] text-[#B91C1C]"
          }`}
        >
          <span className="text-lg">{notification.type === "success" ? "OK" : "!"}</span>
          <span className="text-[13px] font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-700 font-extrabold text-[12px] cursor-pointer ml-2">x</button>
        </div>
      )}

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-0 sm:px-6 md:px-12 py-5 md:py-8">
        
        {/* Hero Section */}
        <ScrollReveal>
          <HeroBanner 
            loading={loading} 
            message={explanation.hero} 
            signals={contextPills} products={products}
            onShop={() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth" })} 
          />
        </ScrollReveal>

        <ScrollReveal>
          <AIExperiences />
        </ScrollReveal>

        {/* AI Stylist Strip */}
        <ScrollReveal>
          <ContextStrip 
            loading={loading} 
            signals={explanation.syncEdit} 
            summary={explanation.syncSummary} 
            onExplore={() => { window.sessionStorage.setItem("myntra-sync:home-scroll-y", String(window.scrollY)); navigate("/recommendation-insights"); }}
          />
        </ScrollReveal>

        {/* Calendar Connection Banner CTA */}
        {!calendarConnected && !search && (
          <ScrollReveal>
            <div className="my-6 mx-0 sm:mx-0 p-5 rounded-2xl border border-dashed border-[#FF3F6C]/40 bg-[#FFF0F4]/15 flex flex-col md:flex-row items-center justify-between gap-5 transition-all duration-300 hover:bg-[#FFF0F4]/25">
              <div className="flex items-center gap-4.5">
                <span className="flex-shrink-0 flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-[#FF3F6C] to-[#FF905A] text-white shadow-sm text-xl">CAL</span>
                <div>
                  <h4 className="text-[14px] font-extrabold text-[#282C3F]">Sync your Google Calendar</h4>
                  <p className="text-[12px] text-gray-500 font-medium leading-normal mt-0.5 max-w-[580px]">
                    Let Myntra Sync curate outfits for your upcoming weddings, interviews, travel, meetings, and parties automatically from your actual schedule.
                  </p>
                </div>
              </div>
              <button
                onClick={handleCalendarConnect}
                className="px-6 py-2.5 rounded-full bg-[#FF3F6C] hover:bg-[#FF3F6C]/90 text-white text-[12.5px] font-extrabold cursor-pointer transition-all duration-200 shadow-md hover:shadow-[0_4px_12px_rgba(255,63,108,0.25)] active:scale-97 whitespace-nowrap"
              >
                Connect Google Calendar
              </button>
            </div>
          </ScrollReveal>
        )}

        {calendarConnected && !search && (
          <ScrollReveal>
            <div className="text-[11.5px] text-gray-500 flex items-center gap-1.5 justify-end mb-6 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#03A685]" />
              <span>Google Calendar synced: <strong className="text-gray-700">{calendarEmail}</strong></span>
              <button 
                onClick={handleCalendarDisconnect} 
                className="text-red-500 hover:underline font-extrabold cursor-pointer border-0 bg-transparent p-0 ml-2"
              >
                Disconnect
              </button>
            </div>
          </ScrollReveal>
        )}

        {/* Dynamic / Recommended Rail */}
        <div id="recommendations">
          <ScrollReveal>
            <ProductCarousel 
              loading={loading} 
              title={search ? `Results for '${search}'` : "Recommended for you"} 
              eyebrow="MADE FOR YOUR MOMENT" 
              explanation={explanation.carousel} 
              products={recommendedProducts} 
              viewAllTo="/catalog/recommended"
              wished={wished} 
              onOpen={(product) => open(product, true)} 
              onWish={wish} 
              onImpression={trackImpression} 
              onBrandOpen={trackBrandOpen} 
              onInteraction={trackCarouselInteraction} 
            />
          </ScrollReveal>
        </div>

        {/* One editorial campaign provides context without duplicating product rails. */}
        {!search && (
          <ScrollReveal>
            <BrandSpotlight />
          </ScrollReveal>
        )}
      </div>

      {/* Product Details Sheet Modal */}
      {selected && (
        <ProductDetails 
          product={selected} 
          onClose={() => setSelected(null)} 
          onCart={async () => { 
            if (!session) return;
            try {
              await addToBag(session, selected.id, selected.sizes[0] || "M", 1);
              setBag((count) => count + 1); 
              track({ eventType: "ADD_TO_CART", productId: selected.id, brand: selected.brand, category: selected.category, color: selected.color, style: selected.style, price: selected.price }); 
              trackAnalytics({
    eventType: "BAG_ADD",
    productId: selected.id,
    brand: selected.brand,
    category: selected.category,
    style: selected.style,
    price: selected.price,
});
              setSelected(null);
            } catch (err) {
              alert("Failed to add to bag.");
            }
          }} 
          onPurchase={async () => { 
            if (!session) return;
            try {
              const orderItems = [{
                product_id: selected.id,
                size: selected.sizes[0] || "M",
                quantity: 1,
                price: selected.price
              }];
              await createOrder(session, orderItems);
              track({ eventType: "PURCHASE", productId: selected.id, brand: selected.brand, category: selected.category, color: selected.color, style: selected.style, price: selected.price }); 
              setSelected(null);
              alert("Order placed successfully!");
            } catch (err) {
              alert("Failed to purchase item.");
            }
          }} 
        />
      )}

      {/* Premium Footer */}
      <Footer />

      {/* AI Context Simulator */}
      {(import.meta.env.DEV || new URLSearchParams(window.location.search).get("debug") === "1") && <ContextSimulator />}
    </main>
  );
}

import { useCallback, useMemo, useState, useEffect, useRef } from "react";
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

// Presentational Seasonal Campaign Divider
function FestiveCampaign({ festivalName }: { festivalName?: string }) {
  return (
    <div className="my-12 mx-6 md:mx-12 rounded-3xl overflow-hidden bg-gradient-to-r from-[#5B1C2A] to-[#8C3A4A] text-white shadow-[0_12px_40px_rgba(91,28,42,0.15)] flex flex-col md:flex-row items-center justify-between">
      <div className="p-8 md:p-12 lg:p-16 max-w-[500px]">
        <span className="text-[10px] font-extrabold tracking-[0.2em] text-white/80 uppercase block mb-3.5">
          Seasonal Spotlight
        </span>
        <h3 className="font-editorial text-[30px] md:text-[38px] leading-tight font-medium mb-4">
          The {festivalName ?? "Seasonal"} Collection
        </h3>
        <p className="text-[13px] md:text-[14px] text-gray-200/90 leading-relaxed mb-6 font-sans-tight">
          Celebrate in style. Rich magenta hues, delicate embroidery, and fluid, comfortable drapes handpicked to match the rhythm of your festive calendar plans.
        </p>
      </div>
      <div className="w-full md:w-[340px] lg:w-[440px] h-[260px] md:h-[340px] relative overflow-hidden bg-[#7F2636] flex-shrink-0">
        <img
          src="https://images.unsplash.com/photo-1583391733956-6c78276477e2?auto=format&fit=crop&w=700&q=80"
          alt="Festive Ethnic Kurta Wear"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#5B1C2A] via-[#5B1C2A]/20 to-transparent pointer-events-none" />
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
              <span className="text-[#FF905A] text-[15px]">✦</span>
              <span>100% Genuine Designer Apparel</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#FF3F6C] text-[15px]">✦</span>
              <span>Hassle-Free 30-Day Returns</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#03A685] text-[15px]">✦</span>
              <span>Contextual AI Wardrobe Match</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright */}
      <div className="max-w-[1440px] mx-auto px-6 md:px-12 pt-8 border-t border-[#94969F]/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11.5px] text-[#94969F]/80">
        <span>© {new Date().getFullYear()} Myntra Sync. Powered by Advanced Agentic Style Recommendation.</span>
        <span>Made for HackerRamp WeForShe Demo</span>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const { session } = useAuth();
  const track = useBehaviorTracking();
  const { context, dna, products: apiProducts, loading } = useHomePersonalization(session);
  
  const [selected, setSelected] = useState<Product | null>(null);
  const [wished, setWished] = useState<Set<string>>(new Set());
  const [bag, setBag] = useState(0);
  const [search, setSearch] = useState("");

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

  const products = useMemo(() => personalize(apiProducts.length > 0 ? apiProducts : catalog, dna), [apiProducts, dna]);
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
  const event = context?.calendar.events[0]?.title;
  const festival = context?.festival?.name;

  // Filtered lists for distinct rails supporting Task 8 (Personalization Verification)
  const recommendedProducts = useMemo(() => {
    // Show top personalized items, limited to 15 for performance
    return filtered.slice(0, 15);
  }, [filtered]);

  const festivalCollectionProducts = useMemo(() => {
    if (!festival) return products.slice(0, 8);
    // Find products suitable for active festival, boosting them
    const matched = products.filter(p => p.festivalSuitability?.includes(festival));
    return matched.length > 0 ? matched.slice(0, 12) : products.slice(0, 8);
  }, [products, festival]);

  const occasionEditProducts = useMemo(() => {
    if (!event) return products.slice(0, 8);
    // Categorize by keywords in the event title
    const text = event.toLowerCase();
    let styleFilter = "";
    if (text.includes("wedding") || text.includes("festive") || text.includes("marriage")) styleFilter = "ethnic";
    else if (text.includes("interview") || text.includes("office") || text.includes("meeting")) styleFilter = "formal";
    else if (text.includes("party") || text.includes("birthday")) styleFilter = "party";
    else if (text.includes("trip") || text.includes("travel") || text.includes("vacation")) styleFilter = "outdoor";

    const matched = products.filter(p => p.style?.toLowerCase() === styleFilter);
    return matched.length > 0 ? matched.slice(0, 12) : products.slice(0, 8);
  }, [products, event]);

  const trendingProducts = useMemo(() => {
    // Boost trending badge products or top rated products
    const matched = products.filter(p => p.badge === "Trending" || p.trendTags?.includes("Trending") || (p.rating ?? 0) >= 4.5);
    return matched.slice(0, 12);
  }, [products]);

  const complementProducts = useMemo(() => {
    // Accessories and footwear to complete outfit
    return products.filter(p => ["Footwear", "Accessories"].includes(p.category)).slice(0, 12);
  }, [products]);

  const open = useCallback((product: Product, recommendation = false) => {
    const productEvent = { productId: product.id, brand: product.brand, category: product.category, color: product.color, style: product.style, price: product.price };
    track({ eventType: "PRODUCT_CLICK", ...productEvent, metadata: { interaction: "PRODUCT_CLICK" } });
    track({ eventType: recommendation ? "RECOMMENDATION_CLICK" : "PRODUCT_VIEW", ...productEvent });
    setSelected(product);
  }, [track]);

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
    } catch (err) {
      console.error("Wishlist action failed", err);
    }
  }, [session, track, wished]);

  const trackImpression = useCallback((product: Product, carouselTitle: string) => track({ eventType: "PRODUCT_VIEW", productId: product.id, brand: product.brand, category: product.category, color: product.color, style: product.style, price: product.price, metadata: { interaction: "PRODUCT_IMPRESSION", carouselTitle, impressionKey: `${carouselTitle}:${product.id}` } }), [track]);
  const trackBrandOpen = useCallback((product: Product) => track({ eventType: "BRAND_OPEN", productId: product.id, brand: product.brand, metadata: { interaction: "BRAND_INTERACTION" } }), [track]);
  const trackCarouselInteraction = useCallback((carouselTitle: string) => track({ eventType: "HOME_SECTION_CLICK", metadata: { interaction: "CAROUSEL_INTERACTION", carouselTitle } }), [track]);
  const trackDwell = useCallback((product: Product, durationSeconds: number) => track({ eventType: "PRODUCT_DWELL", productId: product.id, brand: product.brand, category: product.category, color: product.color, style: product.style, price: product.price, metadata: { durationSeconds } }), [track]);
  
  const category = useCallback((name: string) => { 
    track({ eventType: "CATEGORY_OPEN", category: name }); 
    setSearch(name === "Home" || name === "Gen Z" || name === "Studio" ? "" : name); 
  }, [track]);
  
  const doSearch = useCallback((value: string) => { 
    setSearch(value); 
    track({ eventType: "SEARCH", metadata: { query: value } }); 
  }, [track]);

  return (
    <main id="top" className="bg-white min-h-screen text-[#282C3F] font-sans selection:bg-[#FF3F6C]/20 overflow-x-hidden">
      {/* Sticky Header */}
      <ShopHeader onSearch={doSearch} onCategory={category} bagCount={bag} />

      {/* Main Container */}
      <div className="max-w-[1440px] mx-auto px-0 sm:px-6 md:px-12 py-6">
        
        {/* Hero Section */}
        <ScrollReveal>
          <HeroBanner 
            loading={loading} 
            message={explanation.hero} 
            signals={contextPills} 
            onShop={() => document.getElementById("recommendations")?.scrollIntoView({ behavior: "smooth" })} 
          />
        </ScrollReveal>

        {/* AI Stylist Strip */}
        <ScrollReveal>
          <ContextStrip 
            loading={loading} 
            signals={explanation.syncEdit} 
            summary={explanation.syncSummary} 
          />
        </ScrollReveal>

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

        {/* Alternate Background / Sections below */}
        {!search && (
          <>
            <ScrollReveal className="bg-[#FAFAFA]/75 border-y border-[#EAEAEC]/55 my-4">
              <ProductCarousel 
                loading={loading} 
                title="Continue browsing" 
                products={products.slice(0, 5)} 
                viewAllTo="/catalog/recently-viewed"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>

            <ScrollReveal>
              <ProductCarousel 
                loading={loading} 
                title="Complete your outfit" 
                eyebrow="PAIR IT WITH" 
                explanation={explanation.carousel} 
                products={complementProducts} 
                viewAllTo="/catalog/complete-your-outfit"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>

            {/* AI Merchandising Dual Spotlight Card */}
            <ScrollReveal>
              <BrandSpotlight />
            </ScrollReveal>

            <ScrollReveal className="bg-[#FAFAFA]/75 border-y border-[#EAEAEC]/55 my-4">
              <ProductCarousel 
                loading={loading} 
                title="Trending near you" 
                explanation={explanation.carousel} 
                products={trendingProducts} 
                viewAllTo="/catalog/trending"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>

            {/* AI Merchandising Festive Showcase Card */}
            <ScrollReveal>
              <FestiveCampaign festivalName={festival} />
            </ScrollReveal>

            <ScrollReveal>
              <ProductCarousel 
                loading={loading} 
                title={event ? `${event} edit` : "Occasion edit"} 
                eyebrow="OCCASION EDIT" 
                explanation={event ? `Selected for your upcoming event: ${event}.` : undefined} 
                products={occasionEditProducts} 
                viewAllTo="/catalog/all"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>

            <ScrollReveal className="bg-gradient-to-r from-[#FFF0F4]/15 via-[#FAF5FF]/15 to-[#FAFAFA]/15 border-y border-[#EAEAEC]/55 my-4">
              <ProductCarousel 
                loading={loading} 
                title={festival ? `${festival} collection` : "Seasonal collection"} 
                eyebrow="CELEBRATE IN COLOUR" 
                explanation={festival ? `Selected for ${festival}.` : undefined} 
                products={festivalCollectionProducts} 
                viewAllTo="/catalog/festival"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>

            <ScrollReveal>
              <ProductCarousel 
                loading={loading} 
                title="New arrivals" 
                products={products.slice(0, 15).reverse()} 
                viewAllTo="/catalog/new-arrivals"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>

            <ScrollReveal className="bg-[#FAFAFA]/75 border-y border-[#EAEAEC]/55 my-4">
              <ProductCarousel 
                loading={loading} 
                title="Popular brands" 
                explanation={explanation.carousel} 
                products={products.slice(0, 5)} 
                viewAllTo="/catalog/all"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>

            <ScrollReveal>
              <ProductCarousel 
                loading={loading} 
                title="Recently viewed" 
                products={products.slice(1, 7)} 
                viewAllTo="/catalog/recently-viewed"
                wished={wished} 
                onOpen={open} 
                onWish={wish} 
                onImpression={trackImpression} 
                onBrandOpen={trackBrandOpen} 
                onInteraction={trackCarouselInteraction} 
              />
            </ScrollReveal>
          </>
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
          onDwell={trackDwell} 
        />
      )}

      {/* Premium Footer */}
      <Footer />

      {/* AI Context Simulator */}
      {(import.meta.env.DEV || new URLSearchParams(window.location.search).get("debug") === "1") && <ContextSimulator />}
    </main>
  );
}

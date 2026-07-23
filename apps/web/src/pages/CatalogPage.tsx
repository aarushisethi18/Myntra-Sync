import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ShopHeader from "../components/ShopHeader";
import ProductCard from "../components/ProductCard";
import ProductDetails from "../components/ProductDetails";
import { useAuth } from "../hooks/useAuth";
import { useAnalyticsTracking } from "../hooks/useAnalyticsTracking";
import { addToBag, addToWishlist, fetchCatalogPage, fetchWishlist, removeFromWishlist } from "../services/catalogService";
import type { Product } from "../types/catalog";

const titles: Record<string, string> = { all: "All products", recommended: "Recommended for you", trending: "Trending near you", festival: "Festival collection", "new-arrivals": "New arrivals", "complete-your-outfit": "Complete your outfit", "recently-viewed": "Recently viewed" };
const railDefaults: Record<string, { sort?: string; category?: string }> = { trending: { sort: "rating_desc" }, "complete-your-outfit": { category: "Accessories" }, "new-arrivals": { sort: "price_desc" } };

export default function CatalogPage() {
  const { session } = useAuth(); const trackAnalytics = useAnalyticsTracking(); const navigate = useNavigate(); const { collection = "all" } = useParams();
  const [page, setPage] = useState(1); const [searchInput, setSearchInput] = useState(""); const [search, setSearch] = useState("");
  const [category, setCategory] = useState(""); const [festival, setFestival] = useState(""); const [weather, setWeather] = useState(""); const [occasion, setOccasion] = useState(""); const [sort, setSort] = useState("");
  const [products, setProducts] = useState<Product[]>([]); const [total, setTotal] = useState(0); const [loading, setLoading] = useState(true); const [wished, setWished] = useState(new Set<string>()); const [selected, setSelected] = useState<Product | null>(null);
  const defaults = railDefaults[collection] ?? {};
  useEffect(() => { const timeout = window.setTimeout(() => { setSearch(searchInput); setPage(1); }, 300); return () => window.clearTimeout(timeout); }, [searchInput]);
  useEffect(() => { setPage(1); }, [collection, category, festival, weather, occasion, sort]);
  useEffect(() => { if (!session) return; setLoading(true); void fetchCatalogPage(session, { page, search, category: category || defaults.category, festival, weather, occasion, sort: sort || defaults.sort }).then((result) => { setProducts(result.items); setTotal(result.total); }).catch(() => setProducts([])).finally(() => setLoading(false)); }, [session, page, search, category, festival, weather, occasion, sort, defaults.category, defaults.sort]);
  useEffect(() => { if (category || defaults.category) trackAnalytics({ eventType: "CATEGORY_VIEW", category: category || defaults.category }); }, [category, defaults.category, trackAnalytics]);
  useEffect(() => { if (search.trim()) trackAnalytics({ eventType: "SEARCH" }); }, [search, trackAnalytics]);
  useEffect(() => { if (session) void fetchWishlist(session).then((items) => setWished(new Set(items.map((item) => item.product.id)))); }, [session]);
  const pages = Math.max(1, Math.ceil(total / 24));
  const wish = useCallback(async (product: Product) => { if (!session) return; const exists = wished.has(product.id); if (exists) await removeFromWishlist(session, product.id); else { await addToWishlist(session, product.id); trackAnalytics({ eventType: "WISHLIST_ADD", productId: product.id, brand: product.brand, category: product.category }); } setWished((current) => { const next = new Set(current); exists ? next.delete(product.id) : next.add(product.id); return next; }); }, [session, wished, trackAnalytics]);
  const filters = useMemo(() => [
    ["Category", category, setCategory, ["", "Men", "Women", "Kids", "Home", "Beauty", "Sports", "Accessories"]],
    ["Festival", festival, setFestival, ["", "Diwali", "Holi", "Eid", "Christmas"]],
    ["Weather", weather, setWeather, ["", "Sunny", "Rainy", "Cold", "Hot"]],
    ["Occasion", occasion, setOccasion, ["", "Casual", "Formal", "Party", "Festive"]],
  ], [category, festival, weather, occasion]);
  return <div className="min-h-screen bg-white text-[#282C3F]"><ShopHeader onSearch={(value) => setSearchInput(value)} onCategory={(value) => setCategory(value)} />
    <main className="max-w-[1440px] mx-auto px-6 md:px-12 py-9"><div className="flex flex-wrap items-end justify-between gap-4 mb-7"><div><p className="text-[10px] font-extrabold tracking-[.2em] text-[#FF3F6C] uppercase">Discover more</p><h1 className="font-editorial text-3xl mt-1">{titles[collection] ?? titles.all}</h1><p className="text-sm text-[#94969F] mt-1">{total} matching products</p></div><select value={sort} onChange={(e) => setSort(e.target.value)} className="border border-[#EAEAEC] rounded-lg px-3 py-2 text-sm"><option value="">Sort by</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option><option value="rating_desc">Rating: high to low</option></select></div>
      <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search this collection" className="w-full mb-4 bg-[#F5F5F6] rounded-lg px-4 py-3 text-sm outline-none focus:ring-1 focus:ring-[#FF3F6C]" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-7">{filters.map(([label, value, update, options]) => <label key={String(label)} className="text-xs font-bold text-[#555]"><span className="block mb-1">{String(label)}</span><select value={String(value)} onChange={(e) => (update as (v: string) => void)(e.target.value)} className="w-full border border-[#EAEAEC] rounded-lg p-2 bg-white">{(options as string[]).map((option) => <option key={option} value={option}>{option || `All ${label}`}</option>)}</select></label>)}</div>
      {loading ? <div className="py-24 text-center text-[#94969F]">Loading productsâ€¦</div> : products.length === 0 ? <div className="py-24 text-center text-[#94969F]">No products match these filters.</div> : <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">{products.map((product) => <ProductCard key={product.id} product={product} wished={wished.has(product.id)} onOpen={() => setSelected(product)} onWish={() => void wish(product)} onBrandOpen={() => { setSearchInput(product.brand); trackAnalytics({ eventType: "BRAND_VIEW", brand: product.brand }); }} />)}</div>}
      <div className="flex justify-center items-center gap-4 mt-10"><button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-4 py-2 border rounded-lg disabled:opacity-40">Previous</button><span className="text-sm">Page {page} of {pages}</span><button disabled={page === pages} onClick={() => setPage((p) => p + 1)} className="px-4 py-2 border rounded-lg disabled:opacity-40">Next</button></div>
    </main>{selected && <ProductDetails product={selected} onClose={() => setSelected(null)} onCart={async () => { if (session) { await addToBag(session, selected.id, selected.sizes[0] || "One Size"); setSelected(null); } }} onPurchase={() => navigate("/bag")} onDwell={(product, durationSeconds) => trackAnalytics({ eventType: "PRODUCT_VIEW", productId: product.id, brand: product.brand, category: product.category, color: product.color, style: product.style, price: product.price, durationSeconds })} />}</div>;
}

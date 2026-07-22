import type { FashionDna, Product, BagItem, WishlistItem, OrderItem } from "../types/catalog";
import type { Session } from "@supabase/supabase-js";
import type { LiveContext } from "./signalCollectionService";
import type { OrderHistoryResponse } from "../types/orderHistory";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=82`;

// Legacy fallback catalog in case the server catalog is unavailable
export const catalog: Product[] = [
  { id: "p-overshirt", brand: "Myntra Studio", title: "Linen Blend Relaxed Overshirt", category: "Men", color: "Ivory", style: "Casual", price: 1799, originalPrice: 2999, rating: 4.5, reviews: 1240, image: image("photo-1516826957135-700dedea698c"), sizes: ["S", "M", "L", "XL"], description: "An effortless linen-blend layer, cut with a relaxed shoulder and soft washed finish.", badge: "Bestseller" },
  { id: "p-dress", brand: "SASSAFRAS", title: "Satin Drape Midi Dress", category: "Women", color: "Rose", style: "Party", price: 2199, originalPrice: 3999, rating: 4.4, reviews: 842, image: image("photo-1566174053879-31528523f8ae"), sizes: ["XS", "S", "M", "L"], description: "Fluid satin with a sculpted drape for every RSVP on your calendar.", badge: "New" },
  { id: "p-sneaker", brand: "PUMA", title: "RS-X Elevated Sneakers", category: "Footwear", color: "White", style: "Sports", price: 3499, originalPrice: 6999, rating: 4.6, reviews: 2021, image: image("photo-1542291026-7eec264c27ff"), sizes: ["6", "7", "8", "9", "10"], description: "A plush, everyday sneaker with a lightweight statement sole.", badge: "Trending" },
  { id: "p-kurta", brand: "Anouk", title: "Embro Embro Festive Kurta Set", category: "Ethnic Wear", color: "Magenta", style: "Festive", price: 2599, originalPrice: 4999, rating: 4.7, reviews: 3890, image: image("photo-1583391733956-6c78276477e2"), sizes: ["S", "M", "L", "XL"], description: "A luminous kurta set with delicate embroidery and an easy silhouette.", badge: "Festive pick" },
  { id: "p-jacket", brand: "Roadster", title: "Washed Denim Trucker Jacket", category: "Men", color: "Blue", style: "Casual", price: 1999, originalPrice: 3499, rating: 4.3, reviews: 1960, image: image("photo-1521572163474-6864f9cf17ab"), sizes: ["S", "M", "L", "XL"], description: "Classic blue denim reworked with a soft lived-in wash.", badge: "Only a few left" },
  { id: "p-tote", brand: "Accessorize", title: "Structured Everyday Tote", category: "Accessories", color: "Black", style: "Minimal", price: 1499, originalPrice: 2499, rating: 4.5, reviews: 623, image: image("photo-1584917865442-de89df76afd3"), sizes: ["One size"], description: "A polished carryall with room for your daily essentials.", badge: "Editor’s choice" },
  { id: "p-running", brand: "Nike", title: "Dri-FIT Training Tee", category: "Sports Wear", color: "Black", style: "Sports", price: 1299, originalPrice: 1999, rating: 4.6, reviews: 3301, image: image("photo-1517836357463-d25dfeac3438"), sizes: ["S", "M", "L", "XL"], description: "Sweat-wicking comfort designed to move from training to the rest of your day.", badge: "Top rated" },
  { id: "p-beauty", brand: "MAC", title: "Glow Play Blush", category: "Beauty", color: "Coral", style: "Beauty", price: 1899, originalPrice: 2450, rating: 4.5, reviews: 758, image: image("photo-1596462502278-27bfdc403348"), sizes: ["One size"], description: "A bouncy cream blush with buildable, fresh colour.", badge: "Just in" },
];

export async function fetchCatalog(session: Session | null): Promise<Product[]> {
  if (!session?.access_token) return catalog;
  try {
    const response = await fetch(`${API}/products`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!response.ok) return catalog;
    const dbCatalog = await response.json();
    return dbCatalog.length > 0 ? dbCatalog : catalog;
  } catch (err) {
    console.error("Failed to load catalog from database, falling back to static catalog.", err);
    return catalog;
  }
}

export type CatalogQuery = { page: number; pageSize?: number; search?: string; category?: string; festival?: string; weather?: string; occasion?: string; sort?: string };
export type CatalogPage = { items: Product[]; page: number; pageSize: number; total: number };
export async function fetchCatalogPage(session: Session | null, query: CatalogQuery): Promise<CatalogPage> {
  if (!session?.access_token) return { items: catalog.slice(0, query.pageSize ?? 24), page: 1, pageSize: query.pageSize ?? 24, total: catalog.length };
  const params = new URLSearchParams({ page: String(query.page), page_size: String(query.pageSize ?? 24) });
  Object.entries(query).forEach(([key, value]) => { if (value && key !== "page" && key !== "pageSize") params.set(key, String(value)); });
  const response = await fetch(`${API}/products?${params}`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) throw new Error("Failed to load catalog.");
  return response.json() as Promise<CatalogPage>;
}

export async function getFashionDna(session: Session | null): Promise<FashionDna | null> {
  if (!session?.access_token) return null;
  const response = await fetch(`${API}/fashion-dna`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  return response.ok ? response.json() as Promise<FashionDna> : null;
}

export function personalize(products: Product[], dna: FashionDna | null, context?: LiveContext | null): Product[] {
  const scores = new Map<string, number>();
  for (const item of [...(dna?.brandAffinity ?? []), ...(dna?.categoryAffinity ?? []), ...(dna?.colorAffinity ?? []), ...(dna?.styleAffinity ?? [])]) {
    scores.set(item.value.toLowerCase(), item.score);
  }

  // Occasion boost from calendar event
  const event = context?.calendar?.events?.[0]?.title;
  let eventStyle = "";
  if (event) {
    const text = event.toLowerCase();
    if (text.includes("wedding") || text.includes("festive") || text.includes("marriage")) eventStyle = "ethnic";
    else if (text.includes("interview") || text.includes("office") || text.includes("meeting")) eventStyle = "formal";
    else if (text.includes("party") || text.includes("birthday")) eventStyle = "party";
    else if (text.includes("trip") || text.includes("travel") || text.includes("vacation")) eventStyle = "outdoor";
  }

  // Weather boost
  const weatherCond = context?.weather?.condition?.toLowerCase();

  return [...products].sort((a, b) => {
    const getProductScore = (product: Product) => {
      let score = (scores.get(product.brand.toLowerCase()) ?? 0) + 
                  (scores.get(product.category.toLowerCase()) ?? 0) + 
                  (scores.get(product.color.toLowerCase()) ?? 0) + 
                  (scores.get(product.style.toLowerCase()) ?? 0);
      
      // Boost if it matches the upcoming calendar event style
      if (eventStyle && product.style?.toLowerCase() === eventStyle) {
        score += 3.0; // Give it a significant boost
      }
      
      // Boost if it matches weather suitability
      if (weatherCond && product.weatherSuitability?.some(w => w.toLowerCase() === weatherCond)) {
        score += 1.5;
      }
      
      return score;
    };
    
    return getProductScore(b) - getProductScore(a) || (b.rating ?? 0) - (a.rating ?? 0);
  });
}

export type InsightSignal = "weather" | "festival" | "event" | "fashion-dna" | "order-history";
export type InsightProduct = { product: Product; explanation: string };

/** Ranks the live catalog for one explainability signal without changing homepage recommendation logic. */
export async function fetchInsightProducts(
  session: Session,
  signal: InsightSignal,
  context: LiveContext | null | undefined,
  dna: FashionDna | null | undefined,
  orderHistory: OrderHistoryResponse | undefined,
): Promise<InsightProduct[]> {
  const products = await fetchCatalog(session);
  const weather = context?.weather?.condition?.toLowerCase() ?? "";
  const event = context?.calendar.events[0]?.title ?? "";
  const festival = context?.festival?.name ?? "";
  const has = (values: string[] | undefined, needle: string) => values?.some((value) => value.toLowerCase().includes(needle)) ?? false;
  const eventStyle = /pooja|wedding|marriage|festive/i.test(event) ? "festive" : /office|meeting|interview/i.test(event) ? "formal" : /gym|workout/i.test(event) ? "sports" : "";
  const affinity = new Map<string, number>();
  for (const value of [...(dna?.brandAffinity ?? []), ...(dna?.categoryAffinity ?? []), ...(dna?.colorAffinity ?? []), ...(dna?.styleAffinity ?? [])]) affinity.set(value.value.toLowerCase(), value.score);
  const orders = orderHistory?.status === "ok" ? orderHistory : undefined;
  const score = (product: Product) => {
    const searchable = `${product.category} ${product.style} ${product.color}`.toLowerCase();
    if (signal === "weather") return (has(product.weatherSuitability, weather) ? 8 : 0) + ((weather.includes("rain") && /footwear|shoe/.test(searchable)) ? 4 : 0) + ((weather.includes("hot") || weather.includes("sun")) && has(product.fabrics, "cotton") ? 3 : 0);
    if (signal === "festival") return (festival && has(product.festivalSuitability, festival) ? 8 : 0) + (/ethnic|festive|kurta/.test(searchable) ? 4 : 0);
    if (signal === "event") return (eventStyle && product.style.toLowerCase().includes(eventStyle) ? 8 : 0) + (eventStyle === "festive" && /ethnic|kurta/.test(searchable) ? 4 : 0);
    if (signal === "fashion-dna") return (affinity.get(product.brand.toLowerCase()) ?? 0) + (affinity.get(product.category.toLowerCase()) ?? 0) + (affinity.get(product.color.toLowerCase()) ?? 0) + (affinity.get(product.style.toLowerCase()) ?? 0);
    return (orders?.favoriteBrands.some((item) => item.brand === product.brand) ? 8 : 0) + (orders?.favoriteCategories.some((item) => item.category === product.category) ? 6 : 0) + (orders && product.price >= orders.preferredBudget.min && product.price <= orders.preferredBudget.max ? 4 : 0);
  };
  const explanation = (product: Product): string => {
    if (signal === "weather") return has(product.fabrics, "cotton") ? `Breathable cotton suits today’s ${weather || "current"} weather.` : "Fits the weather-appropriate picks for today.";
    if (signal === "festival") return festival ? `Matches ${festival} styling through its category and mood.` : "Fits the festive edit for today.";
    if (signal === "event") return event ? `Suitable for your upcoming ${event}.` : "Fits your upcoming-event style edit.";
    if (signal === "fashion-dna") return `Matches your preference for ${product.brand} and ${product.style || product.category}.`;
    return "Similar to brands, categories, and price ranges you’ve purchased before.";
  };
  return products.map((product) => ({ product, score: score(product) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score || (b.product.rating ?? 0) - (a.product.rating ?? 0)).slice(0, 8).map(({ product }) => ({ product, explanation: explanation(product) }));
}

// ----------------- SHOPPING BAG SERVICES -----------------

export async function fetchBag(session: Session): Promise<BagItem[]> {
  const response = await fetch(`${API}/bag`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Failed to load bag items.");
  return response.json();
}

export async function addToBag(session: Session, productId: string, size: string, quantity: number = 1): Promise<void> {
  const response = await fetch(`${API}/bag`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ product_id: productId, size, quantity }),
  });
  if (!response.ok) throw new Error("Failed to add item to bag.");
}

export async function updateBagQuantity(session: Session, id: string, quantity: number): Promise<void> {
  const response = await fetch(`${API}/bag/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ quantity }),
  });
  if (!response.ok) throw new Error("Failed to update quantity.");
}

export async function removeFromBag(session: Session, id: string): Promise<void> {
  const response = await fetch(`${API}/bag/${id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Failed to remove item from bag.");
}

// ----------------- WISHLIST SERVICES -----------------

export async function fetchWishlist(session: Session): Promise<WishlistItem[]> {
  const response = await fetch(`${API}/wishlist`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Failed to load wishlist.");
  return response.json();
}

export async function addToWishlist(session: Session, productId: string): Promise<void> {
  const response = await fetch(`${API}/wishlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ product_id: productId }),
  });
  if (!response.ok) throw new Error("Failed to add to wishlist.");
}

export async function removeFromWishlist(session: Session, productId: string): Promise<void> {
  const response = await fetch(`${API}/wishlist/${productId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Failed to remove from wishlist.");
}

// ----------------- ORDERS SERVICES -----------------

export async function fetchOrders(session: Session): Promise<OrderItem[]> {
  const response = await fetch(`${API}/orders`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!response.ok) throw new Error("Failed to load orders.");
  return response.json();
}

export async function createOrder(session: Session, items: Array<{ product_id: string; size: string; quantity: number; price: number }>): Promise<void> {
  const response = await fetch(`${API}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) throw new Error("Failed to create order.");
}

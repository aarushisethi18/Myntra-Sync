import type { ContextResponse } from "../types/context";
import type { FashionDna, Product } from "../types/catalog";
import type { Session } from "@supabase/supabase-js";

const API = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";
const image = (id: string) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=82`;

export const catalog: Product[] = [
  { id: "p-overshirt", brand: "Myntra Studio", title: "Linen Blend Relaxed Overshirt", category: "Men", color: "Ivory", style: "Casual", price: 1799, originalPrice: 2999, rating: 4.5, reviews: 1240, image: image("photo-1516826957135-700dedea698c"), sizes: ["S", "M", "L", "XL"], description: "An effortless linen-blend layer, cut with a relaxed shoulder and soft washed finish.", badge: "Bestseller" },
  { id: "p-dress", brand: "SASSAFRAS", title: "Satin Drape Midi Dress", category: "Women", color: "Rose", style: "Party", price: 2199, originalPrice: 3999, rating: 4.4, reviews: 842, image: image("photo-1566174053879-31528523f8ae"), sizes: ["XS", "S", "M", "L"], description: "Fluid satin with a sculpted drape for every RSVP on your calendar.", badge: "New" },
  { id: "p-sneaker", brand: "PUMA", title: "RS-X Elevated Sneakers", category: "Footwear", color: "White", style: "Sports", price: 3499, originalPrice: 6999, rating: 4.6, reviews: 2021, image: image("photo-1542291026-7eec264c27ff"), sizes: ["6", "7", "8", "9", "10"], description: "A plush, everyday sneaker with a lightweight statement sole.", badge: "Trending" },
  { id: "p-kurta", brand: "Anouk", title: "Embroidered Festive Kurta Set", category: "Ethnic Wear", color: "Magenta", style: "Festive", price: 2599, originalPrice: 4999, rating: 4.7, reviews: 3890, image: image("photo-1583391733956-6c78276477e2"), sizes: ["S", "M", "L", "XL"], description: "A luminous kurta set with delicate embroidery and an easy silhouette.", badge: "Festive pick" },
  { id: "p-jacket", brand: "Roadster", title: "Washed Denim Trucker Jacket", category: "Men", color: "Blue", style: "Casual", price: 1999, originalPrice: 3499, rating: 4.3, reviews: 1960, image: image("photo-1521572163474-6864f9cf17ab"), sizes: ["S", "M", "L", "XL"], description: "Classic blue denim reworked with a soft lived-in wash.", badge: "Only a few left" },
  { id: "p-tote", brand: "Accessorize", title: "Structured Everyday Tote", category: "Accessories", color: "Black", style: "Minimal", price: 1499, originalPrice: 2499, rating: 4.5, reviews: 623, image: image("photo-1584917865442-de89df76afd3"), sizes: ["One size"], description: "A polished carryall with room for your daily essentials.", badge: "Editor’s choice" },
  { id: "p-running", brand: "Nike", title: "Dri-FIT Training Tee", category: "Sports Wear", color: "Black", style: "Sports", price: 1299, originalPrice: 1999, rating: 4.6, reviews: 3301, image: image("photo-1517836357463-d25dfeac3438"), sizes: ["S", "M", "L", "XL"], description: "Sweat-wicking comfort designed to move from training to the rest of your day.", badge: "Top rated" },
  { id: "p-beauty", brand: "MAC", title: "Glow Play Blush", category: "Beauty", color: "Coral", style: "Beauty", price: 1899, originalPrice: 2450, rating: 4.5, reviews: 758, image: image("photo-1596462502278-27bfdc403348"), sizes: ["One size"], description: "A bouncy cream blush with buildable, fresh colour.", badge: "Just in" },
];

export async function getFashionDna(session: Session | null): Promise<FashionDna | null> {
  if (!session?.access_token) return null;
  const response = await fetch(`${API}/fashion-dna`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  return response.ok ? response.json() as Promise<FashionDna> : null;
}

export function personalize(products: Product[], context: ContextResponse | null, dna: FashionDna | null): Product[] {
  const event = context?.upcomingEvents?.[0]?.title?.toLowerCase() ?? "";
  const weather = context?.weather?.condition?.toLowerCase() ?? "";
  const scores = new Map<string, number>();
  for (const item of [...(dna?.brandAffinity ?? []), ...(dna?.categoryAffinity ?? []), ...(dna?.colorAffinity ?? []), ...(dna?.styleAffinity ?? [])]) scores.set(item.value.toLowerCase(), item.score);
  return [...products].sort((a, b) => {
    const value = (p: Product) => (scores.get(p.brand.toLowerCase()) ?? 0) + (scores.get(p.category.toLowerCase()) ?? 0) + (scores.get(p.color.toLowerCase()) ?? 0) + (scores.get(p.style.toLowerCase()) ?? 0) + (event.includes("wedding") && p.style === "Festive" ? 12 : 0) + (weather.includes("rain") && p.category === "Footwear" ? 5 : 0);
    return value(b) - value(a) || b.rating - a.rating;
  });
}

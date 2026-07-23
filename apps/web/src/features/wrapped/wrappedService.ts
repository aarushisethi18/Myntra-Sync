import type { Session } from "@supabase/supabase-js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export type WrappedData = {
  name: string; hasEnoughData: boolean; personality: string; personalityExplanation: string;
  evolution: { month: string; label: string }[]; palette: { name: string; hex: string }[];
  brands: { name: string; count: number }[]; statistics: { orders: number; wishlist: number; categories: number; averageSpend: number; peakMonth: string };
  categories: { name: string; value: number }[]; blend: { count: number; headline: string; dna: string[] };
  coach: string; forecast: string; achievements: string[]; analytics: { topCategories: { name: string; value: number }[]; favoriteBrands: { name: string; value: number }[]; peakShoppingHour: string; shoppingStyle: string; totalBrowsingTime: number }; shoppingInsight: string;
};

export async function fetchWrapped(session: Session): Promise<WrappedData> {
  const response = await fetch(`${API_URL}/wrapped`, { headers: { Authorization: `Bearer ${session.access_token}` } });
  if (!response.ok) { const error = await response.json().catch(() => null); throw new Error(error?.detail ?? "Your Wrapped could not be prepared."); }
  return response.json() as Promise<WrappedData>;
}

export type Product = {
  id: string; 
  brand: string; 
  title: string; 
  category: string; 
  color: string; 
  style: string;
  price: number; 
  originalPrice: number; 
  rating?: number; 
  reviews: number; 
  image: string;
  sizes: string[]; 
  description: string; 
  badge?: string;
  
  // Extended Metadata
  occasions?: string[];
  fabrics?: string[];
  weatherSuitability?: string[];
  festivalSuitability?: string[];
  trendTags?: string[];
  fashionAffinityScore?: number;
  recentBehaviorScore?: number;
  relevanceScore?: number;
  recommendationScore?: number;
  recommendationReasons?: string[];
  signalScores?: Record<string, number>;
};

export type FashionDna = {
  brandAffinity: { value: string; score: number }[];
  categoryAffinity: { value: string; score: number }[];
  colorAffinity: { value: string; score: number }[];
  styleAffinity: { value: string; score: number }[];
  budgetRange: { min: number | null; max: number | null };
  trendScore: number; 
  experimentationScore: number;
};

export type BagItem = {
  id: string;
  size: string;
  quantity: number;
  createdAt: string;
  product: Product;
};

export type WishlistItem = {
  id: string;
  createdAt: string;
  product: Product;
};

export type OrderItem = {
  id: string;
  size: string;
  quantity: number;
  price: number;
  status: "Processing" | "Out for Delivery" | "Delivered" | "Cancelled";
  createdAt: string;
  product: Product;
};

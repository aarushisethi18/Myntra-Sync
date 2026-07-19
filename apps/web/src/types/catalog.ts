export type Product = {
  id: string; brand: string; title: string; category: string; color: string; style: string;
  price: number; originalPrice: number; rating: number; reviews: number; image: string;
  sizes: string[]; description: string; badge?: string;
};

export type FashionDna = {
  brandAffinity: { value: string; score: number }[];
  categoryAffinity: { value: string; score: number }[];
  colorAffinity: { value: string; score: number }[];
  styleAffinity: { value: string; score: number }[];
  budgetRange: { min: number | null; max: number | null };
  trendScore: number; experimentationScore: number;
};

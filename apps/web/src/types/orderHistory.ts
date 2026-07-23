export type RankedBrand = { brand: string; score: number };
export type RankedCategory = { category: string; score: number };

export type PreferredBudget = { min: number; max: number };

export type OrderHistoryIntelligence = {
  status: "ok";
  shoppingPersona: string;
  favoriteBrands: RankedBrand[];
  favoriteCategories: RankedCategory[];
  preferredBudget: PreferredBudget;
  averageSpend: number;
  shoppingFrequencyDays: number | null;
  preferredSizes: Record<string, string>;
  returnRate: number;
  recommendationReasons: string[];
};

export type InsufficientOrderHistory = { status: "insufficient_data"; ordersAnalyzed: number; minimumRequired: number };
export type OrderHistoryResponse = OrderHistoryIntelligence | InsufficientOrderHistory;

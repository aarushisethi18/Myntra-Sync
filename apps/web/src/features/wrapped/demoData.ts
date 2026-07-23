import type { WrappedData } from "./wrappedService";

export const demoWrapped: WrappedData = {
  name: "Aarushi", hasEnoughData: true, personality: "Capsule Curator", personalityExplanation: "You have a gift for making a few beautifully chosen pieces feel infinitely personal.",
  evolution: [{ month: "January", label: "Quiet neutrals" }, { month: "April", label: "Soft tailoring" }, { month: "August", label: "Statement sneakers" }, { month: "December", label: "The signature edit" }],
  palette: [{ name: "Ink", hex: "#20242f" }, { name: "Blush", hex: "#ef9dad" }, { name: "Butter", hex: "#f4d992" }, { name: "Sage", hex: "#93ad8a" }, { name: "Cloud", hex: "#f5f0ea" }],
  brands: [{ name: "Mango", count: 12 }, { name: "Roadster", count: 10 }, { name: "Nike", count: 8 }, { name: "H&M", count: 7 }],
  statistics: { orders: 28, wishlist: 64, categories: 9, averageSpend: 2380, peakMonth: "October" },
  categories: [{ name: "Tops", value: 32 }, { name: "Footwear", value: 24 }, { name: "Dresses", value: 18 }, { name: "Accessories", value: 14 }],
  blend: { count: 3, headline: "Your shared style moments", dna: ["Minimal", "Contemporary"] },
  coach: "You’ve mastered timeless essentials. Next, let an earthy tone or tactile fabric bring a little surprise to your clean, confident wardrobe.",
  forecast: "Your 2027 wardrobe will lean into soft structure: wide-leg silhouettes, sculptural bags, and warm neutrals with a bright, playful accent.",
  achievements: ["Wishlist Wizard", "Neutral Icon", "Weekend Shopper", "Sneaker Collector"],
  analytics: { topCategories: [{ name: "Footwear", value: 1680 }, { name: "Tops", value: 1320 }], favoriteBrands: [{ name: "Nike", value: 8 }], peakShoppingHour: "9 PM", shoppingStyle: "Night Browser", totalBrowsingTime: 4380 },
  shoppingInsight: "Your night browsing sessions return to footwear and elevated everyday layers."
};

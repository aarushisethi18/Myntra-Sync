export type BlendPerson = {
  name: string;
  initials: string;
  image: string;
  labels: { name: string; confidence: number }[];
};

export type BlendOutfit = {
  id: string;
  title: string;
  occasion: string;
  weather: string;
  price: string;
  match: number;
  yours: number;
  image: string;
  pieces: string[];
  explanation: string;
};

export const blendPeople: BlendPerson[] = [
  {
    name: "Aarushi",
    initials: "AS",
    image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=500&q=85",
    labels: [
      { name: "Clean girl", confidence: 91 },
      { name: "Minimalist", confidence: 86 },
      { name: "Old money", confidence: 74 },
    ],
  },
  {
    name: "Ananya",
    initials: "AN",
    image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=85",
    labels: [
      { name: "Street luxe", confidence: 93 },
      { name: "Oversized", confidence: 82 },
      { name: "Y2K", confidence: 68 },
    ],
  },
];

export const compatibility = [
  { name: "Colour harmony", value: 92, color: "#ff5c8a" },
  { name: "Style similarity", value: 84, color: "#b18cff" },
  { name: "Brand affinity", value: 85, color: "#ffab6b" },
  { name: "Budget match", value: 76, color: "#77d6ba" },
  { name: "Trend alignment", value: 88, color: "#5f9cff" },
];

export const moodboardImages = [
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1551028719-00167b16eac5?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1485230895905-ec40ba36b9bc?auto=format&fit=crop&w=800&q=85",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=800&q=85",
];

export const blendOutfits: BlendOutfit[] = [
  {
    id: "cafe",
    title: "The espresso edit",
    occasion: "Cafe date",
    weather: "Warm · 28°C",
    price: "₹4,298 together",
    match: 96,
    yours: 58,
    image: "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85",
    pieces: ["Linen shirt", "Wide-leg denim", "Suede sneakers"],
    explanation: "Aarushi's warm neutrals meet Ananya's relaxed proportions for a look that feels effortless from first coffee to last light.",
  },
  {
    id: "concert",
    title: "After-dark denim",
    occasion: "Concert night",
    weather: "Clear · 24°C",
    price: "₹5,846 together",
    match: 93,
    yours: 42,
    image: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=900&q=85",
    pieces: ["Structured jacket", "Black denim", "Silver accents"],
    explanation: "A sharp monochrome base gives Ananya's edge room to play, finished with Aarushi's love for clean, elevated detail.",
  },
  {
    id: "weekend",
    title: "Sunday gallery",
    occasion: "Weekend plans",
    weather: "Breezy · 26°C",
    price: "₹3,996 together",
    match: 91,
    yours: 50,
    image: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=900&q=85",
    pieces: ["Soft knit", "Tailored trousers", "Retro trainers"],
    explanation: "The perfect fifty-fifty: polished silhouettes for Aarushi, playful trainers and texture for Ananya.",
  },
  {
    id: "airport",
    title: "The soft landing",
    occasion: "Airport day",
    weather: "Cool day",
    price: "Rs. 4,670 together",
    match: 90,
    yours: 63,
    image: "https://images.unsplash.com/photo-1485968579580-b6d095142e6e?auto=format&fit=crop&w=900&q=85",
    pieces: ["Ribbed co-ord", "Longline coat", "Leather tote"],
    explanation: "Comfort is the starting point, with a tailored outer layer for polish.",
  },
  {
    id: "dinner",
    title: "Candlelight contrast",
    occasion: "Dinner plans",
    weather: "Mild evening",
    price: "Rs. 6,120 together",
    match: 94,
    yours: 47,
    image: "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=900&q=85",
    pieces: ["Bias-cut satin", "Cropped blazer", "Sculptural heels"],
    explanation: "After-dark instinct meets a restrained palette and precise tailoring.",
  },
];

export const occasions = ["College", "Office", "Wedding", "Party", "Date", "Concert", "Vacation", "Cafe", "Gym"];

import { blendOutfits, blendPeople, compatibility, moodboardImages } from "./blendData";
import type { BlendResult } from "./services/blendService";

/** Local-only judge experience. It deliberately never touches the API. */
export const demoResult: BlendResult = {
  sessionId: "demo", score: 89, people: blendPeople, styleDna: blendPeople,
  breakdown: compatibility, reasons: ["You both return to softened neutral tones.", "Your saved pieces balance polish with relaxed proportions.", "Your shared palette works beautifully for casual plans."],
  sharedDna: [{ name: "Elevated casual", confidence: 94 }, { name: "Modern classic", confidence: 90 }, { name: "Off-duty luxe", confidence: 82 }],
  palette: [{ name: "Rose cloud", hex: "#e9b6ba" }, { name: "Espresso", hex: "#563e37" }, { name: "Butter", hex: "#f2d580" }, { name: "Ink", hex: "#24242d" }, { name: "Moss", hex: "#738174" }],
  moodboard: { keywords: ["old money", "street luxe", "soft structure"], visualStyle: "Old money × street luxe", images: moodboardImages },
  outfits: blendOutfits, insights: [{ value: "92%", label: "colour compatibility" }, { value: "85%", label: "brand affinity" }, { value: "01", label: "shared styling ritual: black" }],
};

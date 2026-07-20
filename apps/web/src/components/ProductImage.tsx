import { useState } from "react";

const placeholders: Record<string, string> = {
  Men: "https://placehold.co/600x800/F1F2F6/282C3F?text=Men",
  Women: "https://placehold.co/600x800/FFF0F4/282C3F?text=Women",
  Kids: "https://placehold.co/600x800/FFF8E7/282C3F?text=Kids",
  Home: "https://placehold.co/600x800/F2F7F4/282C3F?text=Home",
  Beauty: "https://placehold.co/600x800/FDF1F6/282C3F?text=Beauty",
  Sports: "https://placehold.co/600x800/EEF5FF/282C3F?text=Sports",
  Accessories: "https://placehold.co/600x800/F5F5F6/282C3F?text=Accessories",
};

function placeholderFor(category?: string) {
  const normalized = (category || "").toLowerCase();
  const key = Object.keys(placeholders).find((name) => normalized.includes(name.toLowerCase()));
  return placeholders[key ?? "Accessories"];
}

export default function ProductImage({ src, alt, category, className, loading = "lazy" }: { src?: string; alt: string; category?: string; className: string; loading?: "lazy" | "eager" }) {
  const [hasFallenBack, setHasFallenBack] = useState(!src);
  const [hide, setHide] = useState(false);
  const displayedSrc = hasFallenBack ? placeholderFor(category) : src;
  return hide ? <div aria-label={`${alt} image unavailable`} className={`${className} bg-[#F5F5F6]`} /> : (
    <img src={displayedSrc} alt={alt} loading={loading} className={className} onError={() => {
      // A placeholder gets one chance only: this prevents an onError fallback loop.
      if (hasFallenBack) setHide(true); else setHasFallenBack(true);
    }} />
  );
}

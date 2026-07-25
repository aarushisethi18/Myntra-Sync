import { memo } from "react";
import type { Product } from "../types/catalog";
import ProductImage from "./ProductImage";

// Map of personalized reasons for each static catalog product to explain "Why"
const personalizationReasons: Record<string, string> = {
  "p-overshirt": "Fits your relaxed casual style",
  "p-dress": "Perfect for your RSVP event",
  "p-sneaker": "Matches your active lifestyle",
  "p-kurta": "Curated for the festive season",
  "p-jacket": "Classic layer for cool evenings",
  "p-tote": "Polished everyday essential",
  "p-running": "Priority workout wear choice",
  "p-beauty": "Fresh glow natural finish",
};

function ProductCard({ product, wished, onOpen, onWish, onBrandOpen, explanation }: { product: Product; wished: boolean; onOpen: () => void; onWish: () => void; onBrandOpen: () => void; explanation?: string }) {
  const discount = product.originalPrice > product.price ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;
  const hasAi = Boolean(!product.fallbackUsed && product.aiMatchScore != null);
  const aiReason = product.whyRecommended || explanation || personalizationReasons[product.id] || "Personalized for you";

  return (
    <article 
      className="product-card flex flex-col bg-white rounded-2xl border border-[#EAEAEC]/60 hover:border-transparent hover:shadow-[0_12px_28px_rgba(40,44,63,0.09)] transition-all duration-300 overflow-hidden group shrink-0 w-[190px] sm:w-[210px] md:w-[220px] scroll-snap-align-start relative"
      data-product-id={product.id}
    >
      {/* Product Image Container */}
      <div className="relative w-full aspect-portrait overflow-hidden bg-[#F5F5F6] flex-shrink-0">
        <button 
          className="w-full h-full p-0 border-0 outline-none cursor-pointer" 
          onClick={onOpen} 
          aria-label={`View ${product.title}`}
        >
          <ProductImage src={product.image} alt={product.title || "Product"} category={product.category} className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-106" />
          
          {/* AI Match Score Badge */}
          {hasAi && product.aiMatchScore != null && (
            <span className="absolute top-3 left-3 bg-[#282C3F]/90 backdrop-blur-sm text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow-md flex items-center gap-1 z-10 border border-white/20">
              <span className="text-[#FFD700]">⭐</span> {product.aiMatchScore}% Match
            </span>
          )}

          {product.badge && !hasAi && (
            <span className="absolute bottom-3 left-3 bg-white/95 text-[#282C3F] text-[9.5px] font-extrabold px-2.5 py-1 rounded shadow-sm tracking-wider uppercase border border-[#EAEAEC]/40 z-10">
              {product.badge}
            </span>
          )}
        </button>

        {/* Wishlist Button */}
        <button 
          className={`absolute top-3 right-3 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center justify-center text-[#282C3F] hover:text-[#FF3F6C] hover:scale-110 active:scale-90 transition-all duration-150 cursor-pointer z-10 outline-none ${
            wished ? "text-[#FF3F6C]" : ""
          }`} 
          onClick={onWish} 
          aria-label="Add to wishlist"
        >
          <svg 
            className={`w-[18px] h-[18px] transition-transform duration-200 ${
              wished ? "fill-[#FF3F6C] stroke-[#FF3F6C] animate-heart-bounce" : "stroke-current fill-none"
            }`} 
            strokeWidth="2.2" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        </button>
      </div>

      {/* Product Metadata Info */}
      <div className="p-3.5 flex flex-col flex-grow">
        {/* Personalization / AI Reason Pill */}
        <div className="text-[9px] sm:text-[9.5px] font-bold text-[#FF3F6C] mb-1.5 flex items-center gap-1 bg-[#FFF0F4]/70 px-2 py-0.5 rounded-full w-fit border border-[#FFD2DF]/30 max-w-full">
          <svg className="w-2.5 h-2.5 flex-shrink-0 text-[#FF905A]" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 2z"/>
          </svg>
          <span className="truncate">{aiReason}</span>
        </div>

        {/* Extended AI Styling Reasoning */}
        {hasAi && (
          <div className="my-1.5 space-y-1 bg-[#F9F9FB] p-2 rounded-xl border border-[#EAEAEC]/50 text-[9.5px] leading-tight text-[#4A4B57]">
            {product.whyRankedHere && (
              <div className="flex items-start gap-1">
                <span className="shrink-0 text-[10px]">🏆</span>
                <span className="font-medium text-[#282C3F]">{product.whyRankedHere}</span>
              </div>
            )}
            {product.stylingTip && (
              <div className="flex items-start gap-1">
                <span className="shrink-0 text-[10px]">👕</span>
                <span className="italic text-[#555]">{product.stylingTip}</span>
              </div>
            )}
            {product.completesWardrobeWith && product.completesWardrobeWith.length > 0 && (
              <div className="flex items-start gap-1 text-[#03A685] font-bold">
                <span className="shrink-0 text-[10px]">🧥</span>
                <span>Completes: {product.completesWardrobeWith.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Brand */}
        <button 
          className="product-brand text-[13px] font-extrabold text-[#282C3F] hover:text-[#FF3F6C] text-left leading-tight transition-colors duration-150 uppercase truncate cursor-pointer block w-full outline-none mt-1" 
          onClick={onBrandOpen} 
          aria-label={`Browse ${product.brand}`}
        >
          {product.brand || "Myntra"}
        </button>

        {/* Title */}
        <h3 className="text-[12px] text-[#94969F] font-normal leading-snug mt-0.5 mb-1.5 truncate">
          {product.title || "Product details coming soon"}
        </h3>

        {/* Rating */}
        {typeof product.rating === "number" && <div className="flex items-center gap-1 text-[10px] font-bold text-[#282C3F] mb-2.5">
          <span className="text-[#FF905A] text-[11px]">★</span>
          <span>{product.rating}</span>
          <span className="text-[#94969F] font-normal">({product.reviews})</span>
        </div>}

        {/* Pricing */}
        <div className="flex items-baseline gap-1.5 mt-auto">
          <b className="text-[13px] font-bold text-[#282C3F]">
            ₹{product.price.toLocaleString("en-IN")}
          </b>
          <del className="text-[11px] text-[#94969F] font-normal line-through">
            ₹{product.originalPrice.toLocaleString("en-IN")}
          </del>
          {discount > 0 && <em className="text-[10px] font-extrabold text-[#03A685] uppercase not-italic">({discount}% OFF)</em>}
        </div>
      </div>
    </article>
  );
}

export default memo(ProductCard);

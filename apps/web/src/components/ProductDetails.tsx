import { useEffect, useRef, useState } from "react";
import type { Product } from "../types/catalog";

export default function ProductDetails({ product, onClose, onCart, onPurchase, onDwell }: { product: Product; onClose: () => void; onCart: () => void; onPurchase: () => void; onDwell: (product: Product, durationSeconds: number) => void }) {
  const [size, setSize] = useState(product.sizes[0]);
  const sheetRef = useRef<HTMLElement>(null);
  const activeSince = useRef<number | undefined>(undefined);
  const visibleMilliseconds = useRef(0);
  const isInViewport = useRef(false);
  const hasReported = useRef(false);

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof window.setTimeout> | undefined;
    const stop = () => {
      if (activeSince.current !== undefined) visibleMilliseconds.current += performance.now() - activeSince.current;
      activeSince.current = undefined;
      if (timer) window.clearTimeout(timer);
      timer = undefined;
    };
    const reportWhenQualified = () => {
      if (hasReported.current || activeSince.current === undefined) return;
      const remaining = Math.max(0, 15_000 - visibleMilliseconds.current);
      timer = window.setTimeout(() => {
        if (hasReported.current || activeSince.current === undefined) return;
        visibleMilliseconds.current += performance.now() - activeSince.current;
        activeSince.current = performance.now();
        if (visibleMilliseconds.current >= 15_000) {
          hasReported.current = true;
          onDwell(product, Math.round(visibleMilliseconds.current / 1000));
        }
      }, remaining);
    };
    const start = () => {
      if (hasReported.current || activeSince.current !== undefined || document.visibilityState !== "visible" || !isInViewport.current) return;
      activeSince.current = performance.now();
      reportWhenQualified();
    };
    const onVisibilityChange = () => { if (document.visibilityState === "visible") start(); else stop(); };
    const observer = new IntersectionObserver(([entry]) => { isInViewport.current = entry.isIntersecting; if (entry.isIntersecting) start(); else stop(); }, { threshold: 0.5 });
    observer.observe(sheet);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => { stop(); observer.disconnect(); document.removeEventListener("visibilitychange", onVisibilityChange); };
  }, [onDwell, product]);

  const discount = Math.round((1 - product.price / product.originalPrice) * 100);

  return (
    <div 
      className="fixed inset-0 z-50 bg-[#170a11]/60 backdrop-blur-[6px] flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog" 
      aria-modal="true"
    >
      <section 
        className="relative bg-white w-full max-w-[940px] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:grid md:grid-cols-2 max-h-[100vh] md:max-h-[90vh]" 
        ref={sheetRef}
      >
        {/* Close Button */}
        <button 
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-white/90 backdrop-blur-sm border border-[#EAEAEC] flex items-center justify-center text-[#282C3F] hover:text-white hover:bg-[#FF3F6C] hover:border-[#FF3F6C] transition-all duration-200 cursor-pointer shadow-sm outline-none" 
          onClick={onClose}
          aria-label="Close details"
        >
          <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Product Image Section */}
        <div className="w-full bg-[#F5F5F6] flex-shrink-0 relative overflow-hidden h-[360px] md:h-full">
          <img 
            src={product.image} 
            alt={product.title} 
            className="w-full h-full object-cover"
          />
        </div>

        {/* Product Details Section */}
        <div className="p-6 md:p-10 flex flex-col overflow-y-auto h-full">
          {/* Brand */}
          <p className="text-[#FF3F6C] text-[11px] font-extrabold tracking-widest uppercase mb-1">
            {product.brand}
          </p>
          
          {/* Title */}
          <h2 className="font-editorial text-[24px] md:text-[28px] font-medium text-[#282C3F] leading-tight mb-2">
            {product.title}
          </h2>

          {/* Rating */}
          <div className="inline-flex items-center gap-1.5 bg-[#F5F5F6] border border-[#EAEAEC]/65 px-3 py-1 rounded-full w-fit mb-6 text-[11.5px] font-bold text-[#282C3F]">
            <span className="text-[#FF905A]">★</span>
            <span>{product.rating}</span>
            <span className="text-[#94969F] font-normal">| {product.reviews} ratings</span>
          </div>

          {/* Pricing */}
          <div className="border-t border-[#EAEAEC]/50 pt-5 mb-5">
            <div className="flex items-baseline gap-3">
              <span className="text-[24px] font-bold text-[#282C3F]">
                ₹{product.price.toLocaleString("en-IN")}
              </span>
              <del className="text-[14px] text-[#94969F] font-normal line-through">
                ₹{product.originalPrice.toLocaleString("en-IN")}
              </del>
              <span className="text-[13px] font-extrabold text-[#03A685] uppercase">
                ({discount}% OFF)
              </span>
            </div>
            <strong className="text-[11px] text-[#03A685] font-semibold tracking-wide block mt-1">
              Inclusive of all taxes
            </strong>
          </div>

          {/* Size Selector */}
          <div className="mb-6">
            <h4 className="text-[12px] font-extrabold uppercase tracking-wider text-[#282C3F] mb-3">
              Select Size
            </h4>
            <div className="flex flex-wrap gap-2.5">
              {product.sizes.map((item) => {
                const isSelected = size === item;
                return (
                  <button 
                    key={item} 
                    onClick={() => setSize(item)}
                    className={`w-11 h-11 rounded-full border flex items-center justify-center font-bold text-[12.5px] transition-all duration-200 cursor-pointer select-none outline-none ${
                      isSelected 
                        ? "border-[#FF3F6C] text-[#FF3F6C] bg-[#FFF0F4] ring-1 ring-[#FF3F6C]/30 scale-103" 
                        : "border-[#EAEAEC] text-[#282C3F] hover:border-[#FF3F6C] hover:text-[#FF3F6C]"
                    }`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <p className="text-[13px] text-[#5C5C5C] leading-relaxed mb-6 font-sans-tight">
            {product.description}
          </p>

          {/* Personalization Note */}
          <div className="bg-[#FFF0F4] border border-[#FFD2DF]/50 text-[#8E3450] p-4 text-[13px] leading-relaxed flex items-start gap-2.5 rounded-xl mb-6">
            <svg className="w-5 h-5 text-[#FF3F6C] flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 2zm0 3.7l-1.5 3.1-3.4.5 2.5 2.4-.6 3.4 3-1.6 3 1.6-.6-3.4 2.5-2.4-3.4-.5L12 5.7z"/>
            </svg>
            <div>
              <strong className="font-bold text-[#FF3F6C]">AI Stylist Recommendation</strong>
              <p className="mt-0.5 text-[#5F5760]">Matches your active outfit guidelines. Perfect for today's weather & scheduled plans.</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mt-auto">
            <button 
              onClick={onCart}
              className="flex-1 py-3.5 border border-[#FF3F6C] rounded-full text-[#FF3F6C] font-bold text-[13.5px] tracking-wide hover:bg-[#FFF0F4]/40 active:scale-97 transition-all duration-200 cursor-pointer outline-none"
            >
              Add to Bag
            </button>
            <button 
              onClick={onPurchase}
              className="flex-1 py-3.5 bg-[#FF3F6C] border border-transparent rounded-full text-white font-bold text-[13.5px] tracking-wide shadow-[0_4px_14px_rgba(255,63,108,0.25)] hover:bg-[#FF3F6C]/90 hover:shadow-[0_6px_18px_rgba(255,63,108,0.35)] active:scale-97 transition-all duration-200 cursor-pointer outline-none"
            >
              Buy Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
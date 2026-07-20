import { memo, useEffect, useRef, useState } from "react";
import type { Product } from "../types/catalog";
import ProductCard from "./ProductCard";

function ProductCarousel({ title, eyebrow, explanation, products, wished, onOpen, onWish, onImpression, onBrandOpen, onInteraction, loading = false }: { title: string; eyebrow?: string; explanation?: string; products: Product[]; wished: Set<string>; onOpen: (p: Product) => void; onWish: (p: Product) => void; onImpression: (p: Product, carouselTitle: string) => void; onBrandOpen: (p: Product) => void; onInteraction: (carouselTitle: string) => void; loading?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const seenProducts = useRef(new Set<string>());
  const interacted = useRef(false);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || loading || typeof IntersectionObserver === "undefined") return;
    const productsById = new Map(products.map((product) => [product.id, product]));
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const productId = (entry.target as HTMLElement).dataset.productId;
        const product = productId ? productsById.get(productId) : undefined;
        if (!entry.isIntersecting || !product || seenProducts.current.has(product.id)) return;
        seenProducts.current.add(product.id);
        onImpression(product, title);
        observer.unobserve(entry.target);
      });
    }, { root: rail, threshold: 0.6 });
    rail.querySelectorAll<HTMLElement>("[data-product-id]").forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [loading, onImpression, products, title]);

  const handleScroll = () => {
    const rail = railRef.current;
    if (!rail) return;
    setShowLeftArrow(rail.scrollLeft > 20);
    setShowRightArrow(rail.scrollLeft < rail.scrollWidth - rail.clientWidth - 20);
  };

  const scroll = (direction: "left" | "right") => {
    const rail = railRef.current;
    if (!rail) return;
    const scrollAmount = rail.clientWidth * 0.75;
    rail.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth"
    });
    handleInteraction();
  };

  const handleInteraction = () => {
    if (interacted.current) return;
    interacted.current = true;
    onInteraction(title);
  };

  return (
    <section className="py-6 md:py-8 border-b border-[#EAEAEC]/50 bg-inherit transition-all duration-300">
      {/* Section Heading */}
      <div className="flex items-end justify-between px-6 md:px-12 mb-5">
        <div className="space-y-1">
          {eyebrow && (
            <p className="text-[10px] font-extrabold tracking-[0.2em] text-[#FF3F6C] uppercase font-sans">
              {eyebrow}
            </p>
          )}
          <h2 className="font-editorial text-[22px] md:text-[26px] font-medium text-[#282C3F] tracking-tight leading-tight">
            {title}
          </h2>
          {explanation && (
            <small className="inline-flex items-center gap-1 text-[11.5px] font-bold text-[#FF3F6C] bg-[#FFF0F4]/60 border border-[#FFD2DF]/35 px-2.5 py-0.5 rounded-full mt-1.5 shadow-sm">
              <svg className="w-3 h-3 text-[#FF905A]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 2z"/>
              </svg>
              <span>{explanation}</span>
            </small>
          )}
        </div>
        <button className="text-[12.5px] font-bold text-[#FF3F6C] hover:text-[#FF905A] transition-colors hover:underline cursor-pointer border-0 bg-transparent py-1">
          View All
        </button>
      </div>

      {/* Rail Container */}
      <div className="relative group/carousel px-6 md:px-12">
        {/* Left Arrow Button */}
        {showLeftArrow && (
          <button 
            onClick={() => scroll("left")}
            className="absolute left-14 top-1/2 -translate-y-1/2 z-25 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#282C3F] border border-[#EAEAEC] shadow-[0_4px_16px_rgba(0,0,0,0.08)] opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-108 active:scale-95 cursor-pointer outline-none"
            aria-label="Scroll left"
          >
            <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        {/* Right Arrow Button */}
        {showRightArrow && (
          <button 
            onClick={() => scroll("right")}
            className="absolute right-14 top-1/2 -translate-y-1/2 z-25 hidden md:flex items-center justify-center w-10 h-10 rounded-full bg-white text-[#282C3F] border border-[#EAEAEC] shadow-[0_4px_16px_rgba(0,0,0,0.08)] opacity-0 group-hover/carousel:opacity-100 transition-all duration-300 hover:scale-108 active:scale-95 cursor-pointer outline-none"
            aria-label="Scroll right"
          >
            <svg className="w-5 h-5 stroke-current" fill="none" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {/* Horizontal Rail */}
        <div 
          ref={railRef} 
          onScroll={handleScroll}
          onPointerDown={handleInteraction}
          className="product-rail flex gap-4 md:gap-5 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory mask-fade-right pb-4 pt-1"
        >
          {loading ? (
            Array.from({ length: 5 }, (_, index) => (
              <div 
                className="w-[190px] sm:w-[210px] md:w-[220px] aspect-portrait shimmer-bg rounded-2xl shrink-0" 
                key={index} 
                aria-hidden="true" 
              />
            ))
          ) : (
            products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                wished={wished.has(product.id)} 
                onOpen={() => onOpen(product)} 
                onWish={() => onWish(product)} 
                onBrandOpen={() => onBrandOpen(product)} 
              />
            ))
          )}
        </div>
      </div>
    </section>
  );
}

export default memo(ProductCarousel);
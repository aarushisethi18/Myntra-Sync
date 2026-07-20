import { memo, useEffect, useRef } from "react";
import type { Product } from "../types/catalog";
import ProductCard from "./ProductCard";

function ProductCarousel({ title, eyebrow, explanation, products, wished, onOpen, onWish, onImpression, onBrandOpen, onInteraction, loading = false }: { title: string; eyebrow?: string; explanation?: string; products: Product[]; wished: Set<string>; onOpen: (p: Product) => void; onWish: (p: Product) => void; onImpression: (p: Product, carouselTitle: string) => void; onBrandOpen: (p: Product) => void; onInteraction: (carouselTitle: string) => void; loading?: boolean }) {
  const railRef = useRef<HTMLDivElement>(null);
  const seenProducts = useRef(new Set<string>());
  const interacted = useRef(false);

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

  const handleInteraction = () => {
    if (interacted.current) return;
    interacted.current = true;
    onInteraction(title);
  };

  return <section className="shop-section"><div className="shop-heading"><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2>{explanation && <small className="personalization-explanation">{explanation}</small>}</div><button>View all</button></div><div className="product-rail" ref={railRef} onPointerDown={handleInteraction}>{loading ? Array.from({ length: 4 }, (_, index) => <div className="product-card product-card-skeleton" key={index} aria-hidden="true" />) : products.map((product) => <ProductCard key={product.id} product={product} wished={wished.has(product.id)} onOpen={() => onOpen(product)} onWish={() => onWish(product)} onBrandOpen={() => onBrandOpen(product)} />)}</div></section>;
}

export default memo(ProductCarousel);
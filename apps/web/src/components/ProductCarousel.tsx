import { memo } from "react";
import type { Product } from "../types/catalog";
import ProductCard from "./ProductCard";

function ProductCarousel({ title, eyebrow, explanation, products, wished, onOpen, onWish, loading = false }: { title: string; eyebrow?: string; explanation?: string; products: Product[]; wished: Set<string>; onOpen: (p: Product) => void; onWish: (p: Product) => void; loading?: boolean }) {
  return <section className="shop-section"><div className="shop-heading"><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2>{explanation && <small className="personalization-explanation">{explanation}</small>}</div><button>View all</button></div><div className="product-rail">{loading ? Array.from({ length: 4 }, (_, index) => <div className="product-card product-card-skeleton" key={index} aria-hidden="true" />) : products.map((product) => <ProductCard key={product.id} product={product} wished={wished.has(product.id)} onOpen={() => onOpen(product)} onWish={() => onWish(product)} />)}</div></section>;
}

export default memo(ProductCarousel);

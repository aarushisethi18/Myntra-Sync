import type { Product } from "../types/catalog";
import ProductCard from "./ProductCard";

export default function ProductCarousel({ title, eyebrow, products, wished, onOpen, onWish }: { title: string; eyebrow?: string; products: Product[]; wished: Set<string>; onOpen: (p: Product) => void; onWish: (p: Product) => void }) {
  return <section className="shop-section"><div className="shop-heading"><div>{eyebrow && <p>{eyebrow}</p>}<h2>{title}</h2></div><button>View all</button></div><div className="product-rail">{products.map((product) => <ProductCard key={product.id} product={product} wished={wished.has(product.id)} onOpen={() => onOpen(product)} onWish={() => onWish(product)} />)}</div></section>;
}

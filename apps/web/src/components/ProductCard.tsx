import { memo } from "react";
import type { Product } from "../types/catalog";

function ProductCard({ product, wished, onOpen, onWish, onBrandOpen }: { product: Product; wished: boolean; onOpen: () => void; onWish: () => void; onBrandOpen: () => void }) {
  const discount = Math.round((1 - product.price / product.originalPrice) * 100);
  return <article className="product-card" data-product-id={product.id}><button className="product-image" onClick={onOpen} aria-label={`View ${product.title}`}><img loading="lazy" src={product.image} alt={product.title} />{product.badge && <span>{product.badge}</span>}</button><button className={`wish ${wished ? "active" : ""}`} onClick={onWish} aria-label="Add to wishlist">{wished ? "\u2665" : "\u2661"}</button><div className="product-info"><button className="product-brand" onClick={onBrandOpen} aria-label={`Browse ${product.brand}`}>{product.brand}</button><h3>{product.title}</h3><small>{"\u2605"} {product.rating} <i>({product.reviews})</i></small><div><b>{"\u20B9"}{product.price.toLocaleString("en-IN")}</b><del>{"\u20B9"}{product.originalPrice.toLocaleString("en-IN")}</del><em>{discount}% OFF</em></div></div></article>;
}

export default memo(ProductCard);
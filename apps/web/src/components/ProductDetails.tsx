import { useEffect, useState } from "react";
import type { Product } from "../types/catalog";

export default function ProductDetails({ product, onClose, onCart, onPurchase }: { product: Product; onClose: () => void; onCart: () => void; onPurchase: () => void }) {
  const [size, setSize] = useState(product.sizes[0]);
  useEffect(() => { const timer = window.setTimeout(() => window.dispatchEvent(new CustomEvent("myntra-dwell", { detail: product })), 15_000); return () => window.clearTimeout(timer); }, [product]);
  return <div className="detail-backdrop" role="dialog" aria-modal="true"><section className="detail-sheet"><button className="close" onClick={onClose}>×</button><div className="detail-image"><img src={product.image} alt={product.title} /></div><div className="detail-copy"><p>{product.brand}</p><h2>{product.title}</h2><small>★ {product.rating} · {product.reviews} ratings</small><h3>₹{product.price.toLocaleString("en-IN")} <del>₹{product.originalPrice.toLocaleString("en-IN")}</del></h3><strong>Inclusive of all taxes</strong><h4>Select size</h4><div className="sizes">{product.sizes.map((item) => <button className={size === item ? "selected" : ""} key={item} onClick={() => setSize(item)}>{item}</button>)}</div><p className="description">{product.description}</p><div className="context-note">✦ Perfect for your plans — this piece works beautifully with your Sync edit.</div><div className="detail-actions"><button onClick={onCart}>Add to bag</button><button onClick={onPurchase}>Buy now</button></div></div></section></div>;
}

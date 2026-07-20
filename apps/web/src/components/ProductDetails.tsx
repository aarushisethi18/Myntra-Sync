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

  return <div className="detail-backdrop" role="dialog" aria-modal="true"><section className="detail-sheet" ref={sheetRef}><button className="close" onClick={onClose}>×</button><div className="detail-image"><img src={product.image} alt={product.title} /></div><div className="detail-copy"><p>{product.brand}</p><h2>{product.title}</h2><small>★ {product.rating} · {product.reviews} ratings</small><h3>₹{product.price.toLocaleString("en-IN")} <del>₹{product.originalPrice.toLocaleString("en-IN")}</del></h3><strong>Inclusive of all taxes</strong><h4>Select size</h4><div className="sizes">{product.sizes.map((item) => <button className={size === item ? "selected" : ""} key={item} onClick={() => setSize(item)}>{item}</button>)}</div><p className="description">{product.description}</p><div className="context-note">✦ Perfect for your plans — this piece works beautifully with your Sync edit.</div><div className="detail-actions"><button onClick={onCart}>Add to bag</button><button onClick={onPurchase}>Buy now</button></div></div></section></div>;
}
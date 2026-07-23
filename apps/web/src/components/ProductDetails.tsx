import { useEffect, useRef, useState } from "react";
import type { Product } from "../types/catalog";
import ProductImage from "./ProductImage";

export default function ProductDetails({
  product,
  onClose,
  onCart,
  onPurchase,
  onDwell,
}: {
  product: Product;
  onClose: () => void;
  onCart: () => void;
  onPurchase: () => void;
  onDwell: (product: Product, durationSeconds: number) => void;
}) {
  const [size, setSize] = useState(product.sizes[0]);
  const startedAt = useRef(Date.now());
  const reported = useRef(false);

  useEffect(() => {
    startedAt.current = Date.now();
    reported.current = false;

    const report = () => {
      if (reported.current) return;
      reported.current = true;
      onDwell(
        product,
        Math.max(0, Math.floor((Date.now() - startedAt.current) / 1000))
      );
    };

    window.addEventListener("pagehide", report);

    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        report();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pagehide", report);
      document.removeEventListener("visibilitychange", handleVisibility);
      report();
    };
  }, [product, onDwell]);

  const discount = Math.round(
    (1 - product.price / product.originalPrice) * 100
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-[#170a11]/60 backdrop-blur-[6px] flex items-center justify-center p-0 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <section className="relative bg-white w-full max-w-[940px] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col md:grid md:grid-cols-2 max-h-[100vh] md:max-h-[90vh]">
        <button
          className="absolute top-4 right-4 z-30 w-9 h-9 rounded-full bg-white/90 border border-[#EAEAEC]"
          onClick={onClose}
          aria-label="Close details"
        >
          ×
        </button>

        <div className="w-full bg-[#F5F5F6] h-[360px] md:h-full">
          <ProductImage
            src={product.image}
            alt={product.title || "Product"}
            category={product.category}
            className="w-full h-full object-cover"
            loading="eager"
          />
        </div>

        <div className="p-6 md:p-10 flex flex-col overflow-y-auto h-full">
          <p className="text-[#FF3F6C] text-[11px] font-extrabold tracking-widest uppercase mb-1">
            {product.brand}
          </p>

          <h2 className="font-editorial text-[24px] md:text-[28px] font-medium mb-2">
            {product.title}
          </h2>

          <div className="border-t border-[#EAEAEC]/50 pt-5 mb-5">
            <span className="text-[24px] font-bold">
              {"\u20B9"}
              {product.price.toLocaleString("en-IN")}
            </span>

            <del className="ml-3 text-[#94969F]">
              {"\u20B9"}
              {product.originalPrice.toLocaleString("en-IN")}
            </del>

            <span className="ml-3 text-[#03A685]">
              ({discount}% OFF)
            </span>
          </div>

          <div className="mb-6">
            <h4 className="text-[12px] font-extrabold uppercase mb-3">
              Select Size
            </h4>

            <div className="flex flex-wrap gap-2.5">
              {product.sizes.map((item) => (
                <button
                  key={item}
                  onClick={() => setSize(item)}
                  className={`w-11 h-11 rounded-full border ${
                    size === item
                      ? "border-[#FF3F6C] text-[#FF3F6C]"
                      : "border-[#EAEAEC]"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[13px] text-[#5C5C5C] leading-relaxed mb-6">
            {product.description}
          </p>

          <div className="flex gap-4 mt-auto">
            <button
              onClick={onCart}
              className="flex-1 py-3.5 border border-[#FF3F6C] rounded-full text-[#FF3F6C] font-bold"
            >
              Add to Bag
            </button>

            <button
              onClick={onPurchase}
              className="flex-1 py-3.5 bg-[#FF3F6C] text-white rounded-full font-bold"
            >
              Buy Now
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
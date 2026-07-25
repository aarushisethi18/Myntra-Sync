import { motion } from "framer-motion";
import { useState } from "react";
import type { SharedWishlistItem } from "../types";

interface Props {
  items: SharedWishlistItem[];
  onSaveToCloset: (product: { id: string; title: string; brand: string; category: string; price: number; image: string }) => void;
  onAddToWishlist: (productId: string) => Promise<void>;
  onAddToBag: (productId: string) => Promise<void>;
}

export function SharedWishlist({ items, onSaveToCloset, onAddToWishlist, onAddToBag }: Props) {
  const [wishlistedIds, setWishlistedIds] = useState<Record<string, boolean>>({});
  const [baggedIds, setBaggedIds] = useState<Record<string, boolean>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleWishlist = async (id: string) => {
    setLoadingId(id);
    try {
      await onAddToWishlist(id);
      setWishlistedIds((prev) => ({ ...prev, [id]: true }));
    } finally {
      setLoadingId(null);
    }
  };

  const handleBag = async (id: string) => {
    setLoadingId(id);
    try {
      await onAddToBag(id);
      setBaggedIds((prev) => ({ ...prev, [id]: true }));
    } finally {
      setLoadingId(null);
    }
  };

  if (!items.length) return null;

  return (
    <section className="blend-section shared-wishlist-section">
      <div className="section-intro">
        <p className="blend-kicker">✨ THINGS YOU'LL BOTH LOVE</p>
        <h2>
          Curated just<br />
          <em>for the two of you.</em>
        </h2>
        <p className="section-copy">
          Picked from your combined signals — pieces neither of you have discovered yet.
        </p>
      </div>

      <div className="shared-wishlist__rail">
        {items.map((item, i) => {
          const isWishlisted = wishlistedIds[item.id];
          const isBagged = baggedIds[item.id];
          const isBusy = loadingId === item.id;
          
          return (
            <motion.article
              key={item.id}
              className="shared-wishlist__card"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07, duration: 0.5 }}
            >
              {item.image && (
                <div className="shared-wishlist__image">
                  <img src={item.image} alt={item.name} />
                  {item.rating && (
                    <span className="shared-wishlist__rating">★ {item.rating.toFixed(1)}</span>
                  )}
                </div>
              )}
              <div className="shared-wishlist__body">
                <p className="shared-wishlist__brand">{item.brand}</p>
                <h3 className="shared-wishlist__name">{item.name}</h3>
                <div className="shared-wishlist__price-row">
                  <strong>₹{item.price.toLocaleString("en-IN")}</strong>
                  {item.originalPrice > item.price && (
                    <s>₹{item.originalPrice.toLocaleString("en-IN")}</s>
                  )}
                </div>
                {item.aiReason && (
                  <p className="shared-wishlist__reason">✦ {item.aiReason}</p>
                )}

                {/* Interactive Product Actions Bar */}
                <div className="product-actions-bar">
                  <button
                    type="button"
                    className="product-action-btn product-action-btn--closet"
                    title="Save to Shared Closet"
                    onClick={() => onSaveToCloset({
                      id: item.id,
                      title: item.name,
                      brand: item.brand,
                      category: item.category,
                      price: item.price,
                      image: item.image
                    })}
                  >
                    ❤ <span className="btn-label">Save Closet</span>
                  </button>

                  <button
                    type="button"
                    className={`product-action-btn product-action-btn--wishlist ${isWishlisted ? "product-action-btn--active" : ""}`}
                    title={isWishlisted ? "Saved to Wishlist" : "Save to My Wishlist"}
                    disabled={isWishlisted || isBusy}
                    onClick={() => handleWishlist(item.id)}
                  >
                    {isWishlisted ? "♥" : "♡"} <span className="btn-label">{isWishlisted ? "Saved" : "Wishlist"}</span>
                  </button>

                  <button
                    type="button"
                    className={`product-action-btn product-action-btn--bag ${isBagged ? "product-action-btn--active" : ""}`}
                    title={isBagged ? "Added to Bag" : "Add to Bag"}
                    disabled={isBagged || isBusy}
                    onClick={() => handleBag(item.id)}
                  >
                    👜 <span className="btn-label">{isBagged ? "Added" : "Add Bag"}</span>
                  </button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </div>
    </section>
  );
}

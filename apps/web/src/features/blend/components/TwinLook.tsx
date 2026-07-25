import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import type { Session } from "@supabase/supabase-js";
import type { TwinLookResponse, TwinLookPiece } from "../types";
import { blendService } from "../services/blendService";

interface Props {
  outfitKey: string;
  code: string;
  session: Session;
  onSaveToCloset: (product: { id: string; title: string; brand: string; category: string; price: number; image: string }) => void;
  onAddToWishlist: (productId: string) => Promise<void>;
  onAddToBag: (productId: string) => Promise<void>;
}

function PieceCard({
  piece,
  onSaveToCloset,
  onAddToWishlist,
  onAddToBag
}: {
  piece: TwinLookPiece;
  onSaveToCloset: Props["onSaveToCloset"];
  onAddToWishlist: Props["onAddToWishlist"];
  onAddToBag: Props["onAddToBag"];
}) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isBagged, setIsBagged] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleWishlist = async () => {
    setBusy(true);
    try {
      await onAddToWishlist(piece.id);
      setIsWishlisted(true);
    } finally {
      setBusy(false);
    }
  };

  const handleBag = async () => {
    setBusy(true);
    try {
      await onAddToBag(piece.id);
      setIsBagged(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="twin-piece">
      {piece.image && <img src={piece.image} alt={piece.name} className="twin-piece__image" />}
      <div className="twin-piece__info">
        <p className="twin-piece__brand">{piece.brand}</p>
        <p className="twin-piece__name">{piece.name}</p>
        {piece.price > 0 && (
          <p className="twin-piece__price">₹{piece.price.toLocaleString("en-IN")}</p>
        )}
        
        {/* Actions bar for twin pieces */}
        <div className="twin-piece__actions">
          <button
            type="button"
            className="twin-action-btn twin-action-btn--closet"
            title="Save to Shared Closet"
            onClick={() => onSaveToCloset({
              id: piece.id,
              title: piece.name,
              brand: piece.brand,
              category: piece.category,
              price: piece.price,
              image: piece.image
            })}
          >
            ❤
          </button>
          
          <button
            type="button"
            className={`twin-action-btn twin-action-btn--wishlist ${isWishlisted ? "twin-action-btn--active" : ""}`}
            title="Save to Wishlist"
            disabled={isWishlisted || busy}
            onClick={handleWishlist}
          >
            {isWishlisted ? "♥" : "♡"}
          </button>

          <button
            type="button"
            className={`twin-action-btn twin-action-btn--bag ${isBagged ? "twin-action-btn--active" : ""}`}
            title="Add to Bag"
            disabled={isBagged || busy}
            onClick={handleBag}
          >
            👜
          </button>
        </div>
      </div>
    </div>
  );
}

export function TwinLook({ outfitKey, code, session, onSaveToCloset, onAddToWishlist, onAddToBag }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [twinData, setTwinData] = useState<TwinLookResponse | null>(null);
  const [error, setError] = useState("");

  const handleExpand = async () => {
    if (open) { setOpen(false); return; }
    if (twinData) { setOpen(true); return; }
    setLoading(true);
    setError("");
    try {
      const result = await blendService.getTwinLooks(code, session, outfitKey);
      setTwinData(result);
      setOpen(true);
    } catch {
      setError("Could not generate twin looks right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="twin-look">
      <button
        className="twin-look__trigger"
        onClick={handleExpand}
        disabled={loading}
        aria-expanded={open}
      >
        {loading ? "Generating…" : open ? "✕ Close Twin Look" : "👯 Twin This Look"}
      </button>

      {error && <p className="twin-look__error">{error}</p>}

      <AnimatePresence>
        {open && twinData && (
          <motion.div
            className="twin-look__panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p className="twin-look__intro">Same aesthetic, two distinct takes:</p>
            <div className="twin-look__columns">
              {[twinData.lookA, twinData.lookB].map((look) => (
                <div key={look.owner} className="twin-look__column">
                  <p className="twin-look__owner">{look.vibe}</p>
                  <div className="twin-look__pieces">
                    {look.pieces.map((piece) => (
                      <PieceCard
                        key={piece.id || piece.name}
                        piece={piece}
                        onSaveToCloset={onSaveToCloset}
                        onAddToWishlist={onAddToWishlist}
                        onAddToBag={onAddToBag}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

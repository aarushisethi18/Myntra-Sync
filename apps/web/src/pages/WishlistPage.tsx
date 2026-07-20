import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopHeader from "../components/ShopHeader";
import ProductImage from "../components/ProductImage";
import { useAuth } from "../hooks/useAuth";
import { useBehaviorTracking } from "../hooks/useBehaviorTracking";
import {
  fetchWishlist,
  removeFromWishlist,
  addToBag,
  createOrder,
} from "../services/catalogService";
import type { WishlistItem } from "../types/catalog";

export default function WishlistPage() {
  const { session } = useAuth();
  const track = useBehaviorTracking();
  const navigate = useNavigate();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const loadWishlist = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const data = await fetchWishlist(session);
      setItems(data);
    } catch (err) {
      setError("Could not load wishlist.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadWishlist();
    }
  }, [session]);

  const handleRemove = async (productId: string, item: WishlistItem) => {
    if (!session) return;
    try {
      await removeFromWishlist(session, productId);
      setItems((prev) => prev.filter((i) => i.product.id !== productId));
      track({
        eventType: "WISHLIST_REMOVE",
        productId: item.product.id,
        brand: item.product.brand,
        category: item.product.category,
        color: item.product.color,
        style: item.product.style,
        price: item.product.price,
      });
    } catch (err) {
      alert("Failed to remove item.");
    }
  };

  const handleMoveToBag = async (wishlistItemId: string, item: WishlistItem) => {
    if (!session) return;
    try {
      const defaultSize = item.product.sizes[0] || "M";
      // Add to bag
      await addToBag(session, item.product.id, defaultSize, 1);
      // Remove from wishlist
      await removeFromWishlist(session, item.product.id);
      setItems((prev) => prev.filter((i) => i.id !== wishlistItemId));

      // Behavior tracking
      track({
        eventType: "ADD_TO_CART",
        productId: item.product.id,
        brand: item.product.brand,
        category: item.product.category,
        color: item.product.color,
        style: item.product.style,
        price: item.product.price,
        metadata: { size: defaultSize, quantity: 1 }
      });
      track({
        eventType: "WISHLIST_REMOVE",
        productId: item.product.id,
        brand: item.product.brand,
        category: item.product.category,
        color: item.product.color,
        style: item.product.style,
        price: item.product.price,
        metadata: { interaction: "MOVE_WISHLIST_TO_BAG" }
      });
    } catch (err) {
      alert("Failed to move to bag.");
    }
  };

  const handleBuyNow = async (item: WishlistItem) => {
    if (!session) return;
    try {
      const defaultSize = item.product.sizes[0] || "M";
      const orderItems = [{
        product_id: item.product.id,
        size: defaultSize,
        quantity: 1,
        price: item.product.price,
      }];
      
      // Save order
      await createOrder(session, orderItems);
      
      // Behavior tracking
      track({
        eventType: "PURCHASE",
        productId: item.product.id,
        brand: item.product.brand,
        category: item.product.category,
        color: item.product.color,
        style: item.product.style,
        price: item.product.price,
        metadata: { size: defaultSize, quantity: 1, purchaseSource: "WISHLIST" }
      });

      setCheckoutSuccess(true);
    } catch (err) {
      alert("Failed to purchase item.");
    }
  };

  return (
    <div className="bg-white min-h-screen text-[#282C3F] font-sans overflow-x-hidden">
      <ShopHeader
        onSearch={() => navigate("/")}
        onCategory={() => navigate("/")}
        bagCount={0} // Will sync in AppRouter/Layout
      />

      <div className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="font-editorial text-[28px] md:text-[34px] leading-tight font-medium">
            My Wishlist <span className="text-[16px] text-[#94969F] font-sans font-bold">({items.length} items)</span>
          </h1>
          <Link
            to="/"
            className="text-[12.5px] font-bold text-[#FF3F6C] hover:underline"
          >
            Continue Shopping
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF3F6C] mb-4"></div>
            <span>Loading your wishlist…</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-[#FF3F6C] font-semibold">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 max-w-[420px] mx-auto">
            <div className="text-6xl mb-6">🖤</div>
            <h2 className="font-bold text-[18px] mb-2 text-[#282C3F]">Your Wishlist is Empty</h2>
            <p className="text-gray-500 text-[13px] leading-relaxed mb-8">
              Save items you love in your wishlist. Adapt recommendations based on style & weather.
            </p>
            <Link
              to="/"
              className="inline-block bg-[#FF3F6C] text-white px-8 py-3.5 rounded-full text-[13px] font-bold tracking-wider uppercase hover:bg-[#FF3F6C]/90 shadow-md active:scale-97 transition-all"
            >
              Start Browsing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {items.map((item) => {
              const discount = Math.round(
                (1 - item.product.price / item.product.originalPrice) * 100
              );
              return (
                <div
                  key={item.id}
                  className="flex flex-col bg-white rounded-2xl border border-[#EAEAEC]/60 hover:shadow-[0_12px_28px_rgba(40,44,63,0.09)] transition-all overflow-hidden group relative"
                >
                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(item.product.id, item)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/95 shadow-md flex items-center justify-center text-[#94969F] hover:text-[#FF3F6C] cursor-pointer z-10 transition-colors outline-none"
                    aria-label="Remove item"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* Image */}
                  <div className="aspect-portrait bg-gray-100 overflow-hidden relative">
                    <ProductImage src={item.product.image} alt={item.product.title || "Product"} category={item.product.category} className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300" />
                  </div>

                  {/* Details */}
                  <div className="p-3.5 flex flex-col flex-grow">
                    <h3 className="font-extrabold text-[12.5px] text-[#282C3F] uppercase truncate">
                      {item.product.brand}
                    </h3>
                    <p className="text-[11.5px] text-[#94969F] truncate mt-0.5 mb-2">
                      {item.product.title}
                    </p>

                    {/* Pricing */}
                    <div className="flex items-baseline gap-1.5 mt-auto mb-4">
                      <b className="text-[12.5px] font-bold text-[#282C3F]">
                        ₹{item.product.price.toLocaleString("en-IN")}
                      </b>
                      {item.product.originalPrice > item.product.price && (
                        <>
                          <del className="text-[10.5px] text-[#94969F] line-through font-normal">
                            ₹{item.product.originalPrice.toLocaleString("en-IN")}
                          </del>
                          <span className="text-[9.5px] font-extrabold text-[#03A685]">
                            ({discount}% OFF)
                          </span>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="space-y-2 pt-2 border-t border-gray-100">
                      <button
                        onClick={() => handleMoveToBag(item.id, item)}
                        className="w-full py-2 bg-[#FF3F6C] hover:bg-[#FF3F6C]/90 text-white font-bold text-[11px] tracking-wide rounded-lg cursor-pointer transition-colors outline-none"
                      >
                        Move to Bag
                      </button>
                      <button
                        onClick={() => handleBuyNow(item)}
                        className="w-full py-2 border border-gray-200 hover:border-[#FF3F6C] text-[#282C3F] hover:text-[#FF3F6C] font-bold text-[11px] tracking-wide rounded-lg cursor-pointer transition-colors outline-none"
                      >
                        Buy Now
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buy Now Success Overlay */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-50 bg-[#170a11]/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-[440px] w-full text-center shadow-2xl space-y-6">
            <div className="w-16 h-16 bg-[#03A685]/10 text-[#03A685] rounded-full flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h2 className="font-editorial text-[24px] font-medium text-[#282C3F]">
              Purchase Successful!
            </h2>
            <p className="text-gray-500 text-[13px] leading-relaxed">
              Your item has been purchased. The behavior engine has tracked this event to refine your Fashion DNA automatically.
            </p>
            <div className="pt-4 flex gap-4">
              <button
                onClick={() => navigate("/orders")}
                className="flex-1 bg-[#282C3F] hover:bg-black text-white py-3 rounded-full text-[12.5px] font-bold cursor-pointer transition-colors outline-none"
              >
                View Orders
              </button>
              <button
                onClick={() => setCheckoutSuccess(false)}
                className="flex-1 border border-[#EAEAEC] hover:border-[#FF3F6C] text-[#282C3F] hover:text-[#FF3F6C] py-3 rounded-full text-[12.5px] font-bold cursor-pointer transition-colors outline-none"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

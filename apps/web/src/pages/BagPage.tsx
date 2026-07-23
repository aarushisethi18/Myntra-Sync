import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopHeader from "../components/ShopHeader";
import ProductImage from "../components/ProductImage";
import { useAuth } from "../hooks/useAuth";
import { useBehaviorTracking } from "../hooks/useBehaviorTracking";
import {
  fetchBag,
  removeFromBag,
  updateBagQuantity,
  addToWishlist,
  createOrder,
} from "../services/catalogService";
import type { BagItem } from "../types/catalog";
import { useAnalyticsTracking } from "../hooks/useAnalyticsTracking";


export default function BagPage() {
  const { session } = useAuth();
  const track = useBehaviorTracking();
  const trackAnalytics = useAnalyticsTracking();
  const navigate = useNavigate();
  const [items, setItems] = useState<BagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);

  const loadBag = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const data = await fetchBag(session);
      setItems(data);
    } catch (err) {
      setError("Could not load shopping bag.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadBag();
    }
  }, [session]);

  const handleRemove = async (bagItemId: string, item: BagItem) => {
    if (!session) return;
    try {
      await removeFromBag(session, bagItemId);
      setItems((prev) => prev.filter((i) => i.id !== bagItemId));
      track({
        eventType: "REMOVE_FROM_CART",
        productId: item.product.id,
        brand: item.product.brand,
        category: item.product.category,
        color: item.product.color,
        style: item.product.style,
        price: item.product.price,
      });
      trackAnalytics({
    eventType: "BAG_REMOVE",
    productId: item.product.id,
    brand: item.product.brand,
    category: item.product.category,
    style: item.product.style,
    price: item.product.price,
});
    } catch (err) {
      alert("Failed to remove item.");
    }
  };

  const handleQuantity = async (bagItemId: string, _item: BagItem, newQty: number) => {
    if (!session || newQty < 1) return;
    try {
      await updateBagQuantity(session, bagItemId, newQty);
      setItems((prev) =>
        prev.map((i) => (i.id === bagItemId ? { ...i, quantity: newQty } : i))
      );
    } catch (err) {
      alert("Failed to update quantity.");
    }
  };

  const handleMoveToWishlist = async (bagItemId: string, item: BagItem) => {
    if (!session) return;
    try {
      // Add to wishlist
      await addToWishlist(session, item.product.id);
      // Remove from bag
      await removeFromBag(session, bagItemId);
      setItems((prev) => prev.filter((i) => i.id !== bagItemId));
      
      // Behavior tracking
      track({
        eventType: "WISHLIST_ADD",
        productId: item.product.id,
        brand: item.product.brand,
        category: item.product.category,
        color: item.product.color,
        style: item.product.style,
        price: item.product.price,
      });
      track({
        eventType: "REMOVE_FROM_CART",
        productId: item.product.id,
        brand: item.product.brand,
        category: item.product.category,
        color: item.product.color,
        style: item.product.style,
        price: item.product.price,
        metadata: { interaction: "MOVE_BAG_TO_WISHLIST" }
      });
      trackAnalytics({
    eventType: "BAG_REMOVE",
    productId: item.product.id,
    brand: item.product.brand,
    category: item.product.category,
    style: item.product.style,
    price: item.product.price,
});
trackAnalytics({
    eventType: "WISHLIST_ADD",
    productId: item.product.id,
    brand: item.product.brand,
    category: item.product.category,
    style: item.product.style,
    price: item.product.price,
});
    } catch (err) {
      alert("Failed to move to Wishlist.");
    }
  };

  const handleCheckout = async () => {
    if (!session || items.length === 0) return;
    try {
      const orderItems = items.map((item) => ({
        product_id: item.product.id,
        size: item.size,
        quantity: item.quantity,
        price: item.product.price,
      }));
      
      // Save order
      await createOrder(session, orderItems);
      
      // Track behavior for each item
      for (const item of items) {
        track({
          eventType: "ORDER_PLACED",
          productId: item.product.id,
          brand: item.product.brand,
          category: item.product.category,
          color: item.product.color,
          style: item.product.style,
          price: item.product.price,
          metadata: { size: item.size, quantity: item.quantity }
        });
      }
      
      // Clear bag items from database
      for (const item of items) {
        await removeFromBag(session, item.id);
      }
      
      setItems([]);
      setCheckoutSuccess(true);
    } catch (err) {
      alert("Checkout failed. Please try again.");
    }
  };

  // Math totals
  const totalOriginalPrice = items.reduce(
    (acc, item) => acc + item.product.originalPrice * item.quantity,
    0
  );
  const totalCurrentPrice = items.reduce(
    (acc, item) => acc + item.product.price * item.quantity,
    0
  );
  const discount = totalOriginalPrice - totalCurrentPrice;

  return (
    <div className="bg-white min-h-screen text-[#282C3F] font-sans overflow-x-hidden">
      <ShopHeader
        onSearch={() => navigate("/")}
        onCategory={() => navigate("/")}
        bagCount={items.reduce((acc, i) => acc + i.quantity, 0)}
      />

      <div className="max-w-[1100px] mx-auto px-6 py-10">
        <h1 className="font-editorial text-[28px] md:text-[34px] leading-tight font-medium mb-8 text-center md:text-left">
          Shopping Bag
        </h1>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#FF3F6C] mb-4"></div>
            <span>Reviewing your items…</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-[#FF3F6C] font-semibold">{error}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 max-w-[420px] mx-auto">
            <div className="text-6xl mb-6">🛍️</div>
            <h2 className="font-bold text-[18px] mb-2 text-[#282C3F]">Your Bag is Empty!</h2>
            <p className="text-gray-500 text-[13px] leading-relaxed mb-8">
              Looks like you haven't added anything to your bag yet. Adapt your style with personalized recommendations.
            </p>
            <Link
              to="/"
              className="inline-block bg-[#FF3F6C] text-white px-8 py-3.5 rounded-full text-[13px] font-bold tracking-wider uppercase hover:bg-[#FF3F6C]/90 shadow-md active:scale-97 transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Bag Items list */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => {
                const discountPct = Math.round(
                  (1 - item.product.price / item.product.originalPrice) * 100
                );
                return (
                  <div
                    key={item.id}
                    className="flex gap-4 p-4 border border-[#EAEAEC]/60 rounded-2xl bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="w-[90px] sm:w-[110px] aspect-portrait bg-gray-100 rounded-xl overflow-hidden shrink-0">
                      <ProductImage src={item.product.image} alt={item.product.title || "Product"} category={item.product.category} className="w-full h-full object-cover" />
                    </div>

                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex justify-between items-start gap-2">
                          <h3 className="font-extrabold text-[13px] text-[#282C3F] uppercase truncate">
                            {item.product.brand}
                          </h3>
                          <button
                            onClick={() => handleRemove(item.id, item)}
                            className="text-[#94969F] hover:text-[#FF3F6C] cursor-pointer outline-none"
                            title="Remove item"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-[12.5px] text-[#94969F] truncate mt-0.5 mb-2">
                          {item.product.title}
                        </p>
                        
                        <div className="flex flex-wrap gap-x-4 gap-y-1 items-center text-[11px] text-[#282C3F] font-bold">
                          <span className="bg-gray-100 px-2 py-0.5 rounded">Size: {item.size}</span>
                          <div className="flex items-center gap-1.5 border border-gray-200 rounded px-1.5 py-0.5">
                            <button
                              onClick={() => handleQuantity(item.id, item, item.quantity - 1)}
                              className="px-1 hover:text-[#FF3F6C] cursor-pointer disabled:text-gray-300"
                              disabled={item.quantity <= 1}
                            >
                              -
                            </button>
                            <span className="min-w-[12px] text-center">{item.quantity}</span>
                            <button
                              onClick={() => handleQuantity(item.id, item, item.quantity + 1)}
                              className="px-1 hover:text-[#FF3F6C] cursor-pointer"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-between items-end gap-2 mt-4 pt-2 border-t border-gray-100">
                        <div className="flex items-baseline gap-1.5">
                          <b className="text-[13.5px] font-bold text-[#282C3F]">
                            ₹{(item.product.price * item.quantity).toLocaleString("en-IN")}
                          </b>
                          {item.product.originalPrice > item.product.price && (
                            <>
                              <del className="text-[11px] text-[#94969F] line-through font-normal">
                                ₹{(item.product.originalPrice * item.quantity).toLocaleString("en-IN")}
                              </del>
                              <em className="text-[10px] font-extrabold text-[#03A685] not-italic">
                                ({discountPct}% OFF)
                              </em>
                            </>
                          )}
                        </div>
                        <button
                          onClick={() => handleMoveToWishlist(item.id, item)}
                          className="text-[10.5px] text-[#FF3F6C] hover:text-[#FF905A] font-bold cursor-pointer transition-colors outline-none"
                        >
                          Move to Wishlist
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Price calculations summary */}
            <div className="border border-[#EAEAEC]/75 rounded-2xl p-5 bg-white space-y-4">
              <h2 className="text-[11.5px] font-extrabold tracking-wider text-[#94969F] uppercase">
                Order details ({items.reduce((acc, i) => acc + i.quantity, 0)} items)
              </h2>

              <div className="space-y-2.5 text-[12.5px] text-[#282C3F]">
                <div className="flex justify-between">
                  <span>Total MRP</span>
                  <span className="font-semibold text-gray-500">₹{totalOriginalPrice.toLocaleString("en-IN")}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-[#03A685]">
                    <span>Discount on MRP</span>
                    <span className="font-semibold">- ₹{discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping Fee</span>
                  <span className="font-semibold text-[#03A685]">FREE</span>
                </div>
              </div>

              <div className="border-t border-[#EAEAEC] pt-4 flex justify-between text-[14.5px] font-extrabold text-[#282C3F]">
                <span>Total Amount</span>
                <span>₹{totalCurrentPrice.toLocaleString("en-IN")}</span>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full bg-[#FF3F6C] hover:bg-[#FF3F6C]/95 text-white py-3.5 rounded-full font-bold text-[13px] tracking-wider uppercase shadow-[0_4px_14px_rgba(255,63,108,0.25)] transition-all cursor-pointer outline-none active:scale-97"
              >
                Place Order (Demo)
              </button>

              <div className="text-[10.5px] text-gray-400 text-center font-medium">
                🔒 Secure checkout with Myntra Sync guarantee
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Checkout Success Overlay */}
      {checkoutSuccess && (
        <div className="fixed inset-0 z-50 bg-[#170a11]/70 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 max-w-[440px] w-full text-center shadow-2xl space-y-6 transform scale-100 transition-all duration-300">
            <div className="w-16 h-16 bg-[#03A685]/10 text-[#03A685] rounded-full flex items-center justify-center text-3xl mx-auto">
              ✓
            </div>
            <h2 className="font-editorial text-[24px] font-medium text-[#282C3F]">
              Order Placed Successfully!
            </h2>
            <p className="text-gray-500 text-[13px] leading-relaxed">
              Your items have been purchased for demo purposes. The behavior engine has tracked this event to refine your Fashion DNA automatically.
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

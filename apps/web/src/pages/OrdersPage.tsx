import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ShopHeader from "../components/ShopHeader";
import { useAuth } from "../hooks/useAuth";
import { fetchOrders } from "../services/catalogService";
import type { OrderItem } from "../types/catalog";

export default function OrdersPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOrders = async () => {
    if (!session) return;
    try {
      setLoading(true);
      const data = await fetchOrders(session);
      setOrders(data);
    } catch (err) {
      setError("Could not load your orders.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      loadOrders();
    }
  }, [session]);

  const getStatusStyles = (status: OrderItem["status"]) => {
    switch (status) {
      case "Delivered":
        return "bg-green-50 text-[#03A685] border-green-200/50";
      case "Processing":
        return "bg-blue-50 text-[#FF905A] border-orange-200/50";
      case "Out for Delivery":
        return "bg-purple-50 text-purple-600 border-purple-200/50";
      case "Cancelled":
        return "bg-red-50 text-red-500 border-red-200/50";
      default:
        return "bg-gray-50 text-gray-500 border-gray-200/50";
    }
  };

  return (
    <div className="bg-white min-h-screen text-[#282C3F] font-sans overflow-x-hidden">
      <ShopHeader
        onSearch={() => navigate("/")}
        onCategory={() => navigate("/")}
        bagCount={0}
      />

      <div className="max-w-[850px] mx-auto px-6 py-10">
        <div className="flex justify-between items-center mb-8">
          <h1 className="font-editorial text-[28px] md:text-[34px] leading-tight font-medium">
            Your Orders
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
            <span>Loading your purchase history…</span>
          </div>
        ) : error ? (
          <div className="text-center py-20 text-[#FF3F6C] font-semibold">{error}</div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20 max-w-[420px] mx-auto">
            <div className="text-6xl mb-6">📦</div>
            <h2 className="font-bold text-[18px] mb-2 text-[#282C3F]">No Orders Found</h2>
            <p className="text-gray-500 text-[13px] leading-relaxed mb-8">
              You haven't placed any orders yet. Start exploring the catalog to find items that match your style.
            </p>
            <Link
              to="/"
              className="inline-block bg-[#FF3F6C] text-white px-8 py-3.5 rounded-full text-[13px] font-bold tracking-wider uppercase hover:bg-[#FF3F6C]/90 shadow-md active:scale-97 transition-all"
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const formattedDate = new Date(order.createdAt).toLocaleDateString("en-IN", {
                year: "numeric",
                month: "long",
                day: "numeric",
              });
              
              return (
                <div
                  key={order.id}
                  className="border border-[#EAEAEC]/65 rounded-2xl p-5 bg-white hover:shadow-sm transition-shadow flex flex-col md:flex-row gap-5 items-start justify-between"
                >
                  <div className="flex gap-4 w-full md:w-auto">
                    {/* Image */}
                    <div className="w-[80px] sm:w-[95px] aspect-portrait bg-gray-50 rounded-xl overflow-hidden shrink-0">
                      <img
                        src={order.product.image}
                        alt={order.product.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    {/* Item Description */}
                    <div className="min-w-0">
                      <span className="text-[10px] font-extrabold tracking-widest text-[#FF3F6C] uppercase block mb-0.5">
                        {order.product.brand}
                      </span>
                      <h3 className="font-extrabold text-[13.5px] text-[#282C3F] truncate">
                        {order.product.title}
                      </h3>
                      <p className="text-[11.5px] text-gray-500 mt-1">
                        Size: <span className="font-bold text-gray-700">{order.size}</span> | Qty: <span className="font-bold text-gray-700">{order.quantity}</span>
                      </p>
                      <p className="text-[11.5px] text-gray-400 mt-1">
                        Ordered on: <span className="font-medium text-gray-500">{formattedDate}</span>
                      </p>
                    </div>
                  </div>

                  {/* Delivery Status & Cost */}
                  <div className="flex md:flex-col justify-between md:items-end w-full md:w-auto border-t md:border-t-0 border-gray-100 pt-3 md:pt-0 mt-3 md:mt-0">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-[11px] font-bold border ${getStatusStyles(
                        order.status
                      )}`}
                    >
                      {order.status}
                    </span>
                    <div className="mt-2 text-right">
                      <span className="text-[11px] text-[#94969F] block">Total Paid</span>
                      <b className="text-[15px] text-[#282C3F] font-bold">
                        ₹{(order.price * order.quantity).toLocaleString("en-IN")}
                      </b>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

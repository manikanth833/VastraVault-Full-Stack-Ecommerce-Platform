import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Sparkles, Calendar, Heart, ShieldCheck, ShoppingBag } from "lucide-react";
import api from "../services/api";

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orderId) {
      api.get(`/api/orders/orders/${orderId}/`)
        .then((res) => {
          setOrder(res.data);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-royal-red-900" />
      </div>
    );
  }

  const deliveryDate = new Date();
  deliveryDate.setDate(deliveryDate.getDate() + 5);

  return (
    <div className="max-w-3xl mx-auto px-4 py-16 space-y-10 text-center">
      <div className="space-y-4">
        {/* Animated celebration icon */}
        <div className="mx-auto w-24 h-24 bg-gold-50 text-gold-600 rounded-full flex items-center justify-center animate-bounce">
          <Sparkles className="w-12 h-12 fill-gold-500" />
        </div>
        <h1 className="font-serif text-4xl font-bold tracking-wide text-royal-red-900">
          Order Placed Successfully!
        </h1>
        <p className="text-neutral-500 text-sm max-w-md mx-auto">
          Thank you for choosing Ananya Heritage. Your payment has been secured and we have notified the master weavers to prepare your saree drape.
        </p>
      </div>

      {order && (
        <div className="bg-white border border-neutral-100 rounded-xl p-8 shadow-sm space-y-6 text-left max-w-xl mx-auto">
          <h3 className="font-serif text-lg font-bold text-royal-red-900 border-b pb-3.5">
            Order Confirmation
          </h3>
          
          <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-charcoal-700">
            <div>
              <span className="block text-charcoal-400 font-normal uppercase tracking-wider mb-0.5">Order Reference ID:</span>
              <span className="font-mono text-charcoal-900 select-all">{order.id}</span>
            </div>
            <div>
              <span className="block text-charcoal-400 font-normal uppercase tracking-wider mb-0.5">Razorpay Order ID:</span>
              <span className="text-charcoal-900 select-all">{order.razorpay_order_id}</span>
            </div>
            <div>
              <span className="block text-charcoal-400 font-normal uppercase tracking-wider mb-0.5">Paid Amount:</span>
              <span className="text-royal-red-900 text-sm font-bold">₹{parseFloat(order.total_amount).toLocaleString("en-IN")}</span>
            </div>
            <div>
              <span className="block text-charcoal-400 font-normal uppercase tracking-wider mb-0.5">Estimated Hand-Delivery:</span>
              <span className="text-charcoal-900 flex items-center gap-1">
                <Calendar className="w-4 h-4 text-gold-500" />
                {deliveryDate.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
              </span>
            </div>
          </div>

          <hr className="border-neutral-100" />

          <div>
            <span className="block text-xs text-charcoal-400 uppercase tracking-wider mb-1.5">Delivery Address:</span>
            <p className="text-xs text-charcoal-700 leading-relaxed">
              <span className="font-bold">{order.shipping_address?.name}</span><br />
              {order.shipping_address?.address_line_1}, {order.shipping_address?.address_line_2 && `${order.shipping_address?.address_line_2}, `}
              {order.shipping_address?.city}, {order.shipping_address?.state} - <span className="font-bold">{order.shipping_address?.pin_code}</span><br />
              Contact: {order.shipping_address?.phone}
            </p>
          </div>
        </div>
      )}

      <div className="flex justify-center gap-4">
        <Link
          to="/profile"
          className="border hover:bg-neutral-50 font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider"
        >
          Track My Order
        </Link>
        <Link
          to="/catalog"
          className="bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold px-8 py-3.5 rounded-full text-xs uppercase tracking-wider shadow-sm transition-all"
        >
          Continue Shopping
        </Link>
      </div>

      <div className="flex justify-center gap-2 items-center text-[10px] text-charcoal-400 font-semibold uppercase tracking-wider">
        <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
        <span>Artisan Loom Protection Guarantee Active</span>
      </div>
    </div>
  );
}

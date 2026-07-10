import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Trash2, ShoppingBag, ShieldCheck, Ticket, Plus, Minus, ArrowRight } from "lucide-react";
import { fetchCart, updateCartItem, removeFromCart } from "../features/cartSlice";
import api from "../services/api";

export default function Cart() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { cart, loading } = useSelector((state) => state.cart);
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const [couponSuccess, setCouponSuccess] = useState("");

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleQtyChange = (variantId, currentQty, stockLimit, change) => {
    const newQty = currentQty + change;
    if (newQty < 1) return;
    if (newQty > stockLimit) return;
    dispatch(updateCartItem({ variant_id: variantId, quantity: newQty }));
  };

  const handleRemoveItem = (variantId) => {
    dispatch(removeFromCart({ variant_id: variantId }));
  };

  // Check coupon validity on backend
  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return;
    setCouponError("");
    setCouponSuccess("");

    try {
      const res = await api.post("/api/orders/coupons/validate/", {
        code: couponCode.toUpperCase(),
        amount: parseFloat(cart.subtotal),
      });
      setAppliedCoupon(res.data);
      setCouponSuccess(`Coupon ${res.data.code} applied! Discount of ₹${res.data.discount_amount} applied.`);
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.response?.data?.error || "Invalid or expired coupon.");
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponSuccess("");
    setCouponError("");
  };

  const hasItems = cart?.items?.length > 0;

  // Final pricing adjustments based on applied coupon
  const subtotal = parseFloat(cart?.subtotal || 0);
  const discountAmount = appliedCoupon ? parseFloat(appliedCoupon.discount_amount) : 0;
  const tax = parseFloat(cart?.tax || 0);
  const shipping = parseFloat(cart?.shipping || 0);
  const total = subtotal - discountAmount + tax + shipping;

  const handleCheckout = () => {
    if (!isAuthenticated) {
      navigate("/login?redirect=checkout");
    } else {
      navigate("/checkout", { state: { couponCode: appliedCoupon?.code } });
    }
  };

  if (loading && !hasItems) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-royal-red-900" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900 border-b pb-6">
        Your Shopping Bag
      </h1>

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-neutral-100 rounded-xl shadow-sm text-center p-8 space-y-6">
          <ShoppingBag className="w-16 h-16 text-neutral-300 stroke-[1.5]" />
          <h2 className="font-serif text-xl font-bold text-charcoal-900">Your Bag is Empty</h2>
          <p className="text-neutral-500 text-sm max-w-sm">
            You haven't added any sarees to your shopping bag yet. Explore our fresh heritage weaves.
          </p>
          <Link
            to="/catalog"
            className="bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold px-8 py-3.5 rounded-full text-sm tracking-wider shadow-sm transition-all"
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Cart Items list */}
          <div className="lg:col-span-2 space-y-6">
            {cart.items.map((item) => (
              <div
                key={item.id}
                className="bg-white border border-neutral-100 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row gap-6 relative"
              >
                {/* Product thumbnail */}
                <div className="w-full sm:w-28 aspect-[3/4] bg-neutral-50 rounded-lg overflow-hidden shrink-0">
                  <img
                    src={
                      item.variant_details?.images?.[0]?.image_url ||
                      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={item.variant_details?.sku}
                    className="w-full h-full object-cover object-top"
                  />
                </div>

                {/* Item descriptions */}
                <div className="flex-grow flex flex-col justify-between py-1 space-y-4">
                  <div className="space-y-1 pr-6">
                    <h3 className="font-serif text-charcoal-900 text-base font-semibold">
                      {item.variant_details?.sku.includes("KAN")
                        ? "Traditional Kanjeevaram Silk Saree"
                        : item.variant_details?.sku.includes("BAN")
                        ? "Royal Crimson Banarasi Katan Silk Saree"
                        : "Pastel Linen Zari Border Saree"}
                    </h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal-500 font-medium">
                      <span>Color: {item.variant_details?.color}</span>
                      <span>Size: {item.variant_details?.size}</span>
                      <span>SKU: {item.variant_details?.sku}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    {/* Quantity controls */}
                    <div className="flex items-center border rounded-lg bg-neutral-50">
                      <button
                        onClick={() =>
                          handleQtyChange(
                            item.variant,
                            item.quantity,
                            item.variant_details?.stock_qty,
                            -1
                          )
                        }
                        className="p-2 hover:bg-neutral-100 rounded-l-lg border-r"
                      >
                        <Minus className="w-3.5 h-3.5 text-charcoal-600" />
                      </button>
                      <span className="w-10 text-center text-xs font-bold">{item.quantity}</span>
                      <button
                        onClick={() =>
                          handleQtyChange(
                            item.variant,
                            item.quantity,
                            item.variant_details?.stock_qty,
                            1
                          )
                        }
                        className="p-2 hover:bg-neutral-100 rounded-r-lg border-l"
                      >
                        <Plus className="w-3.5 h-3.5 text-charcoal-600" />
                      </button>
                    </div>

                    {/* Price and Action */}
                    <div className="text-right">
                      <span className="block text-royal-red-900 font-bold text-base">
                        ₹{item.item_total.toLocaleString("en-IN")}
                      </span>
                      <span className="text-[10px] text-charcoal-400 font-medium">
                        ₹{parseFloat(item.variant_details?.final_price).toLocaleString("en-IN")} each
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveItem(item.variant)}
                  className="absolute top-6 right-6 text-charcoal-400 hover:text-royal-red-900 transition-colors p-1.5 hover:bg-neutral-50 rounded"
                >
                  <Trash2 className="w-5 h-5 stroke-[1.5]" />
                </button>
              </div>
            ))}
          </div>

          {/* Pricing summary */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white border border-neutral-100 p-6 rounded-xl shadow-sm space-y-6">
              <h3 className="font-serif text-lg font-bold text-royal-red-900 border-b pb-4">
                Order Summary
              </h3>

              {/* Coupon Form */}
              {!appliedCoupon ? (
                <form onSubmit={handleApplyCoupon} className="space-y-2">
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">
                    Apply Promo Coupon
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        placeholder="WELCOM10, FESTIVE500..."
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
                      />
                      <Ticket className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
                    </div>
                    <button
                      type="submit"
                      className="bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold px-4 py-2 rounded-lg text-xs tracking-wider"
                    >
                      Apply
                    </button>
                  </div>
                  {couponError && <p className="text-xs text-red-600 font-semibold">{couponError}</p>}
                </form>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-lg flex items-center justify-between text-emerald-800 text-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold uppercase">Applied: {appliedCoupon.code}</span>
                    <p>₹{appliedCoupon.discount_amount} discount added.</p>
                  </div>
                  <button onClick={handleRemoveCoupon} className="font-bold hover:underline">
                    Remove
                  </button>
                </div>
              )}

              {couponSuccess && <p className="text-xs text-emerald-700 font-semibold">{couponSuccess}</p>}

              {/* Price list */}
              <div className="space-y-3.5 text-sm">
                <div className="flex justify-between text-charcoal-600 font-medium">
                  <span>Bag Subtotal</span>
                  <span>₹{subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-charcoal-600 font-medium">
                  <span>GST (12% Standard)</span>
                  <span>₹{tax.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-charcoal-600 font-medium">
                  <span>Shipping Charges</span>
                  <span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-700 font-bold">
                    <span>Promo Coupon Discount</span>
                    <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                  </div>
                )}

                <hr className="border-neutral-100" />

                <div className="flex justify-between text-charcoal-900 font-bold text-lg">
                  <span>Order Total</span>
                  <span>₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              {/* Checkouts button */}
              <button
                onClick={handleCheckout}
                className="w-full bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold py-4 rounded-full text-sm tracking-wider shadow-sm transition-all flex items-center justify-center gap-2"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 justify-center text-[10px] text-charcoal-400 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>100% Insured Payments secured via Razorpay SSL.</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

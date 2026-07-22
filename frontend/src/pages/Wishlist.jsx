import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Heart, ShoppingBag, Trash2, ShieldAlert } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchWishlist, removeWishlistItem } from "../features/wishlistSlice";
import { addToCart } from "../features/cartSlice";

function getDisplayName(sku) {
  if (!sku) return "Ananya Heritage Saree";
  if (sku.includes("KAN")) return "Traditional Kanjeevaram Silk Saree";
  if (sku.includes("BAN")) return "Royal Crimson Banarasi Katan Silk Saree";
  return "Pastel Linen Zari Border Saree";
}

export default function Wishlist() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);
  const wishlistState = useSelector((state) => state.wishlist) || {};
  const items = wishlistState.items || [];
  const loading = wishlistState.loading;
  const pendingItemIds = wishlistState.pendingItemIds || [];

  const [movingToCartId, setMovingToCartId] = useState(null);
  const [rowError, setRowError] = useState({});

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login?redirect=wishlist");
      return;
    }
    dispatch(fetchWishlist());
  }, [dispatch, isAuthenticated, navigate]);

  const handleRemove = (itemId) => {
    setRowError((prev) => ({ ...prev, [itemId]: "" }));
    dispatch(removeWishlistItem(itemId))
      .unwrap()
      .catch((error) => {
        const message = typeof error === "string" ? error : error?.detail || "Could not remove item.";
        setRowError((prev) => ({ ...prev, [itemId]: message }));
      });
  };

  const handleMoveToCart = async (item) => {
    setMovingToCartId(item.id);
    setRowError((prev) => ({ ...prev, [item.id]: "" }));
    try {
      await dispatch(addToCart({ variant_id: item.variant, quantity: 1 })).unwrap();
      dispatch(removeWishlistItem(item.id));
    } catch (error) {
      const message = typeof error === "string" ? error : error?.detail || error?.message || "Could not add item to bag.";
      setRowError((prev) => ({ ...prev, [item.id]: message }));
    } finally {
      setMovingToCartId(null);
    }
  };

  const hasItems = items.length > 0;

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
        Your Wishlist
      </h1>

      {!hasItems ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-neutral-100 rounded-xl shadow-sm text-center p-8 space-y-6">
          <Heart className="w-16 h-16 text-neutral-300 stroke-[1.5]" />
          <h2 className="font-serif text-xl font-bold text-charcoal-900">Your Wishlist is Empty</h2>
          <p className="text-neutral-500 text-sm max-w-sm">
            Tap the heart icon on any saree to save it here for later.
          </p>
          <Link
            to="/catalog"
            className="bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold px-8 py-3.5 rounded-full text-sm tracking-wider shadow-sm transition-all"
          >
            Browse the Collection
          </Link>
        </div>
      ) : (
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
          {items.map((item) => {
            const isRemoving = pendingItemIds.includes(String(item.id));
            const isMoving = movingToCartId === item.id;
            const isRowBusy = isRemoving || isMoving;
            const outOfStock = (item.variant_details?.stock_qty ?? 0) <= 0;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 14, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 14, scale: 0.98 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="bg-white border border-neutral-100 rounded-xl shadow-sm overflow-hidden flex flex-col"
              >
                <div className="relative aspect-[3/4] bg-neutral-50">
                  <img
                    src={
                      item.variant_details?.images?.[0]?.image_url ||
                      "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=600&q=80"
                    }
                    alt={item.variant_details?.sku}
                    className="w-full h-full object-cover object-top"
                  />
                  <button
                    onClick={() => handleRemove(item.id)}
                    disabled={isRemoving}
                    className={`absolute top-3 right-3 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-sm transition-colors ${
                      isRemoving ? "opacity-50 cursor-not-allowed" : "hover:bg-white text-royal-red-900"
                    }`}
                    aria-label="Remove from wishlist"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {outOfStock && (
                    <span className="absolute bottom-3 left-3 bg-charcoal-900/80 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded">
                      Out of Stock
                    </span>
                  )}
                </div>

                <div className="p-5 flex flex-col flex-grow space-y-3">
                  <h3 className="font-serif text-charcoal-900 text-base font-semibold leading-snug">
                    {getDisplayName(item.variant_details?.sku)}
                  </h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-charcoal-500 font-medium">
                    <span>Color: {item.variant_details?.color}</span>
                    <span>Size: {item.variant_details?.size}</span>
                  </div>
                  <span className="text-royal-red-900 font-bold text-lg">
                    ₹{parseFloat(item.variant_details?.final_price || 0).toLocaleString("en-IN")}
                  </span>

                  {rowError[item.id] && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-700 font-semibold">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {rowError[item.id]}
                    </div>
                  )}

                  <div className="mt-auto pt-2">
                    <button
                      onClick={() => handleMoveToCart(item)}
                      disabled={isRowBusy || outOfStock}
                      className={`w-full flex items-center justify-center gap-2 font-bold py-3 rounded-full text-xs tracking-wider transition-all ${
                        outOfStock
                          ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                          : "bg-royal-red-900 hover:bg-royal-red-800 text-white"
                      } ${isRowBusy ? "opacity-70 cursor-not-allowed" : ""}`}
                    >
                      <ShoppingBag className="w-4 h-4" />
                      {isMoving ? "Moving to Bag..." : outOfStock ? "Unavailable" : "Move to Bag"}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}

import React from "react";
import { Link } from "react-router-dom";
import { Heart, Star } from "lucide-react";
import { motion } from "framer-motion";
import PremiumImage from "./PremiumImage";

export default function ProductCard({ product, onWishlistToggle, isWishlisted }) {
  const imageUrl = product.primary_image || "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -6 }}
      transition={{ duration: 0.3 }}
      className="group relative flex h-full flex-col overflow-hidden rounded-[24px] border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Product Image Panel */}
      <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100 shrink-0">
        <Link to={`/products/${product.slug}`} className="block h-full w-full">
          <PremiumImage
            src={imageUrl}
            alt={product.name}
            className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
            fallbackTitle={product.brand || "ANANYA"}
            fallbackSubtitle={product.category_name || "Heritage Sarees"}
          />
        </Link>

        {/* Wishlist Button */}
        <button
          onClick={() => onWishlistToggle?.(product)}
          className="absolute right-4 top-4 rounded-full bg-white/90 p-2 text-charcoal-700 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-royal-red-900 focus:outline-none"
        >
          <Heart
            className={`h-5 w-5 ${
              isWishlisted
                ? "fill-royal-red-900 text-royal-red-900"
                : "text-charcoal-700"
            }`}
          />
        </button>

        {/* Out of Stock Overlay */}
        {!product.in_stock && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
            <span className="bg-royal-red-900 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-white shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Product Information */}
      <div className="flex flex-grow flex-col p-5">
        <span className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-gold-600">
          {product.brand || "ANANYA"}
        </span>

        <Link to={`/products/${product.slug}`} className="flex-grow">
          <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-snug text-charcoal-900 transition-colors group-hover:text-royal-red-900">
            {product.name}
          </h3>
        </Link>

        <div className="mt-2.5 flex items-center gap-1">
          <div className="flex text-gold-500">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-3.5 w-3.5 ${
                  i < Math.round(product.avg_rating || 0)
                    ? "fill-gold-500 text-gold-500"
                    : "text-neutral-200"
                }`}
              />
            ))}
          </div>

          {(product.avg_rating || 0) > 0 && (
            <span className="ml-1 text-[11px] font-medium text-charcoal-500">
              ({parseFloat(product.avg_rating).toFixed(1)})
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xl font-bold text-royal-red-900">
            ₹{parseFloat(product.base_price || 0).toLocaleString("en-IN")}
          </span>
          <span className="text-xs font-medium text-charcoal-400 group-hover:underline">
            View Details
          </span>
        </div>
      </div>
    </motion.div>
  );
}
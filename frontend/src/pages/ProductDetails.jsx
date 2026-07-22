import React, { useEffect, useState, useRef, useMemo } from "react";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Star, Heart, ShoppingCart, ShieldAlert, Award, Calendar, ChevronRight, CheckCircle2, AlertCircle } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { fetchProductDetail, clearProductDetail } from "../features/productSlice";
import { addToCart } from "../features/cartSlice";
import { addWishlistItem, fetchWishlist, removeWishlistItem } from "../features/wishlistSlice";
import { ProductDetailSkeleton } from "../components/Skeletons";
import ProductCard from "../components/ProductCard";
import api from "../services/api";

function WishlistToast({ toast, onDismiss }) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -12, x: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, x: 12, scale: 0.96 }}
          transition={{ type: "spring", stiffness: 360, damping: 26 }}
          className={`fixed right-4 top-4 z-50 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-sm ${
            toast.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                toast.type === "success" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
              }`}
            >
              {toast.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-5">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="ml-2 rounded-full p-1 text-current/60 transition-colors hover:text-current"
              aria-label="Dismiss notification"
            >
              <span className="text-base leading-none">×</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const MotionHeart = motion(Heart);

export default function ProductDetails() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentProduct, loading } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const wishlistState = useSelector((state) => state.wishlist) || {};
  const wishlistItems = wishlistState.items || [];
  const pendingVariantIds = wishlistState.pendingVariantIds || [];
  const pendingItemIds = wishlistState.pendingItemIds || [];

  // Detail Page States
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState("");
  const [cartSuccess, setCartSuccess] = useState(false);
  const [cartError, setCartError] = useState("");
  const [wishlistToast, setWishlistToast] = useState(null);

  // Review Form States
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);
  const [reviewsList, setReviewsList] = useState([]);

  // Image Zoom States
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [showZoom, setShowZoom] = useState(false);
  const imageRef = useRef(null);

  useEffect(() => {
    dispatch(fetchProductDetail(slug));
    return () => {
      dispatch(clearProductDetail());
    };
  }, [slug, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    if (!wishlistToast) return undefined;

    const timer = window.setTimeout(() => {
      setWishlistToast(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [wishlistToast]);

  // Sync selected variant when product loads
  useEffect(() => {
    if (currentProduct) {
      const defaultVariant = currentProduct.variants?.[0] || null;
      setSelectedVariant(defaultVariant);
      setReviewsList(currentProduct.reviews || []);
      
      // Setup default image
      if (defaultVariant) {
        const primaryImg = defaultVariant.images?.find((img) => img.is_primary) || defaultVariant.images?.[0];
        setActiveImage(primaryImg?.image_url || "");
      }
    }
  }, [currentProduct]);

  // Handle image updates when switching color variant
  const handleVariantSelect = (variant) => {
    setSelectedVariant(variant);
    setCartSuccess(false);
    setCartError("");
    setWishlistToast(null);
    setQuantity(1);
    const primaryImg = variant.images?.find((img) => img.is_primary) || variant.images?.[0];
    setActiveImage(primaryImg?.image_url || "");
  };

  // Image Zoom Math
  const handleMouseMove = (e) => {
    if (!imageRef.current) return;
    const { left, top, width, height } = imageRef.current.getBoundingClientRect();
    const x = ((e.pageX - left - window.scrollX) / width) * 100;
    const y = ((e.pageY - top - window.scrollY) / height) * 100;
    setZoomPos({ x, y });
  };

  // Add item to cart
  const handleAddToCart = async () => {
    if (!selectedVariant) return;
    setCartSuccess(false);
    setCartError("");

    try {
      const result = await dispatch(
        addToCart({
          variant_id: selectedVariant.id,
          quantity: quantity,
        })
      ).unwrap();
      setCartSuccess(true);
    } catch (err) {
      setCartError(err || "Failed to add item to cart");
    }
  };

  const triggerWishlistToast = (type, message) => {
    setWishlistToast({
      id: `${type}-${Date.now()}`,
      type,
      message,
    });
  };

  const redirectTarget = `${location.pathname}${location.search}`;
  const currentWishlistItem = useMemo(
    () => wishlistItems.find((item) => String(item.variant) === String(selectedVariant?.id)),
    [selectedVariant?.id, wishlistItems]
  );
  const isWishlisted = Boolean(currentWishlistItem);
  const isWishlistToggling = Boolean(
    selectedVariant &&
      (pendingVariantIds.includes(String(selectedVariant.id)) ||
        (currentWishlistItem && pendingItemIds.includes(String(currentWishlistItem.id))))
  );

  const handleWishlistToggle = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(redirectTarget)}`);
      return;
    }

    if (!selectedVariant || isWishlistToggling) return;

    setWishlistToast(null);

    try {
      if (currentWishlistItem) {
        await dispatch(removeWishlistItem(currentWishlistItem.id)).unwrap();
        triggerWishlistToast("success", "Removed from your wishlist.");
      } else {
        await dispatch(addWishlistItem(selectedVariant.id)).unwrap();
        triggerWishlistToast("success", "Saved to your wishlist.");
      }
    } catch (error) {
      const message = typeof error === "string"
        ? error
        : error?.detail || error?.message || "Could not update wishlist.";
      triggerWishlistToast("error", message);
    }
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewComment.trim()) return;

    try {
      const res = await api.post("/api/reviews/", {
        product_id: currentProduct.id,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });

      // Update reviews list and reset inputs
      setReviewsList([res.data, ...reviewsList]);
      setReviewTitle("");
      setReviewComment("");
      setReviewSuccess(true);
      setTimeout(() => setReviewSuccess(false), 3000);
    } catch (err) {
      // Handle review submission error
    }
  };

  if (loading || !currentProduct) {
    return <ProductDetailSkeleton />;
  }

  const finalPrice = selectedVariant 
    ? parseFloat(currentProduct.base_price) + parseFloat(selectedVariant.additional_price)
    : parseFloat(currentProduct.base_price);

  const stockCount = selectedVariant?.stock_qty || 0;
  const isOutOfStock = stockCount <= 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-16">
      <WishlistToast
        toast={wishlistToast}
        onDismiss={() => setWishlistToast(null)}
      />
      {/* Breadcrumb */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal-400 uppercase tracking-widest">
        <Link to="/" className="hover:text-royal-red-900">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to="/catalog" className="hover:text-royal-red-900">Collections</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-charcoal-700 truncate">{currentProduct.name}</span>
      </div>

      {/* Main product display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Left Column: Image Zoom Gallery */}
        <div className="space-y-4">
          <div 
            className="relative overflow-hidden aspect-[3/4] rounded-xl border border-neutral-100 bg-white cursor-zoom-in"
            onMouseEnter={() => setShowZoom(true)}
            onMouseLeave={() => setShowZoom(false)}
            onMouseMove={handleMouseMove}
          >
            <img
              ref={imageRef}
              src={activeImage}
              alt={currentProduct.name}
              className="w-full h-full object-cover object-top"
            />
            
            {/* Zoom Magnifier Lens */}
            {showZoom && (
              <div 
                className="absolute inset-0 z-30 pointer-events-none hidden md:block"
                style={{
                  backgroundImage: `url(${activeImage})`,
                  backgroundPosition: `${zoomPos.x}% ${zoomPos.y}%`,
                  backgroundSize: "200%",
                  backgroundRepeat: "no-repeat"
                }}
              />
            )}
          </div>

          {/* Thumbnail Selector */}
          {selectedVariant && selectedVariant.images?.length > 1 && (
            <div className="flex space-x-3 overflow-x-auto py-1">
              {selectedVariant.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(img.image_url)}
                  className={`relative w-20 aspect-[3/4] rounded border overflow-hidden shrink-0 ${
                    activeImage === img.image_url ? "border-royal-red-900 ring-1 ring-royal-red-900" : "border-neutral-200"
                  }`}
                >
                  <img src={img.image_url} alt="Variant view" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Saree Purchasing Actions */}
        <div className="space-y-6">
          <div className="space-y-2">
            <span className="text-xs font-bold text-gold-600 tracking-[0.2em] uppercase">{currentProduct.brand}</span>
            <h1 className="font-serif text-3xl md:text-4xl font-bold tracking-wide text-royal-red-900 leading-tight">
              {currentProduct.name}
            </h1>
            
            {/* Star Rating Overview */}
            <div className="flex items-center gap-2 pt-2">
              <div className="flex text-gold-500">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`w-4 h-4 ${
                      i < Math.round(currentProduct.avg_rating) ? "fill-gold-500" : "text-neutral-200"
                    }`}
                  />
                ))}
              </div>
              {currentProduct.avg_rating > 0 && (
                <span className="text-sm text-charcoal-700 font-semibold">
                  {parseFloat(currentProduct.avg_rating).toFixed(1)} / 5.0 ({reviewsList.length} reviews)
                </span>
              )}
            </div>
          </div>

          <hr className="border-neutral-100" />

          {/* Pricing */}
          <div className="flex items-baseline gap-4">
            <span className="text-royal-red-900 font-bold text-3xl">
              ₹{finalPrice.toLocaleString("en-IN")}
            </span>
            <span className="text-neutral-400 text-xs">Inclusive of all local GST taxes (12% standard)</span>
          </div>

          <p className="text-neutral-500 text-sm leading-relaxed">
            {currentProduct.description}
          </p>

          <hr className="border-neutral-100" />

          {/* Color Variant Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">
              Color Hue: <span className="text-royal-red-900 font-bold ml-1">{selectedVariant?.color}</span>
            </label>
            <div className="flex flex-wrap gap-3">
              {currentProduct.variants?.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleVariantSelect(v)}
                  className={`border px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
                    selectedVariant?.id === v.id
                      ? "border-royal-red-900 bg-royal-red-900 text-white shadow-sm"
                      : "border-neutral-200 bg-white text-charcoal-700 hover:border-neutral-400"
                  }`}
                >
                  {v.color}
                </button>
              ))}
            </div>
          </div>

          {/* SKU, Stock & Quantity Selection */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <span className="text-xs text-charcoal-400">SKU: <span className="font-semibold">{selectedVariant?.sku}</span></span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isOutOfStock 
                  ? "bg-red-50 text-red-700" 
                  : stockCount <= 5 
                    ? "bg-amber-50 text-amber-700" 
                    : "bg-emerald-50 text-emerald-700"
              }`}>
                {isOutOfStock ? "Out of Stock" : stockCount <= 5 ? `Only ${stockCount} left in stock!` : "In Stock"}
              </span>
            </div>

            {!isOutOfStock && (
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-charcoal-700">Quantity:</span>
                <div className="flex items-center border rounded-lg bg-white">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3.5 py-2 font-bold hover:bg-neutral-50 text-charcoal-600 rounded-l-lg border-r"
                  >
                    -
                  </button>
                  <span className="px-5 py-2 text-sm font-bold w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(stockCount, quantity + 1))}
                    className="px-3.5 py-2 font-bold hover:bg-neutral-50 text-charcoal-600 rounded-r-lg border-l"
                  >
                    +
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Success / Error Alerts */}
          {cartSuccess && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg text-sm font-semibold">
              Saree successfully added to your bag.
            </div>
          )}
          {cartError && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-sm font-semibold flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 shrink-0" /> {cartError}
            </div>
          )}
          {/* CTA Buttons */}
          <div className="flex gap-4 pt-4">
            <button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              className={`w-3/4 flex items-center justify-center gap-2 py-4 rounded-full font-bold text-sm tracking-wider shadow-sm transition-all ${
                isOutOfStock
                  ? "bg-neutral-200 text-neutral-400 cursor-not-allowed"
                : "bg-royal-red-900 hover:bg-royal-red-800 text-white"
              }`}
            >
              <ShoppingCart className="w-5 h-5" /> Add to Bag
            </button>
            <motion.button
              type="button"
              onClick={handleWishlistToggle}
              disabled={isWishlistToggling}
              whileTap={isWishlistToggling ? undefined : { scale: 0.92 }}
              animate={{ scale: isWishlistToggling ? 0.97 : 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 22 }}
              className={`w-1/4 flex items-center justify-center border bg-white p-4 rounded-full transition-all ${
                isWishlisted
                  ? "border-royal-red-900 text-royal-red-900 shadow-sm"
                  : "border-neutral-200 hover:border-neutral-300 text-charcoal-500 hover:text-royal-red-900"
              } ${isWishlistToggling ? "cursor-progress shadow-md opacity-80" : ""}`}
            >
              <MotionHeart
                animate={{ scale: isWishlisted ? 1.06 : 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={`w-6 h-6 stroke-[1.5] transition-[fill,color,stroke,transform] duration-300 ${
                  isWishlisted ? "fill-royal-red-900 text-royal-red-900" : ""
                }`}
              />
            </motion.button>
          </div>
        </div>
      </div>

      {/* Product Reviews Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-neutral-100 pt-16">
        {/* Left column: review stats & form */}
        <div className="md:col-span-1 space-y-6">
          <h2 className="font-serif text-2xl font-bold tracking-wide text-royal-red-900">Customer Reviews</h2>
          
          {isAuthenticated ? (
            <form onSubmit={handleSubmitReview} className="space-y-4 bg-white border border-neutral-100 p-6 rounded-xl shadow-sm">
              <h3 className="font-bold text-sm text-charcoal-700 uppercase tracking-wider">Write a Review</h3>
              
              <div className="space-y-1">
                <span className="text-xs text-charcoal-500 font-semibold">Rating</span>
                <div className="flex gap-1 text-gold-500">
                  {[1, 2, 3, 4, 5].map((val) => (
                    <button type="button" key={val} onClick={() => setReviewRating(val)}>
                      <Star className={`w-5 h-5 ${val <= reviewRating ? "fill-gold-500" : "text-neutral-200"}`} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-charcoal-500 font-semibold">Title</span>
                <input
                  type="text"
                  placeholder="Summarize your experience..."
                  value={reviewTitle}
                  onChange={(e) => setReviewTitle(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm bg-white outline-none"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-charcoal-500 font-semibold">Comments</span>
                <textarea
                  placeholder="Share details of the fabric drape, gold border weaves..."
                  rows={4}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full border p-2 rounded-lg text-sm bg-white outline-none"
                  required
                />
              </div>

              {reviewSuccess && (
                <div className="text-xs font-semibold text-emerald-700 bg-emerald-50 p-2.5 rounded border border-emerald-100">
                  Review submitted successfully!
                </div>
              )}

              <button type="submit" className="w-full bg-royal-red-900 text-white font-bold py-2.5 rounded-lg text-xs tracking-wider">
                Submit Review
              </button>
            </form>
          ) : (
            <div className="bg-neutral-50 p-6 border rounded-xl text-center space-y-3">
              <p className="text-xs text-neutral-500 font-medium">Purchased this saree? Log in to leave your feedback and assist other collectors.</p>
              <Link to="/login" className="inline-block text-xs font-bold text-royal-red-900 hover:underline">
                Sign In to Review &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Right column: reviews lists */}
        <div className="md:col-span-2 space-y-6">
          {reviewsList.length === 0 ? (
            <div className="py-12 text-center text-neutral-400 text-sm">
              No reviews yet for this saree. Be the first to tell us about your purchase!
            </div>
          ) : (
            <div className="space-y-6">
              {reviewsList.map((rev) => (
                <div key={rev.id} className="bg-white border border-neutral-100 p-6 rounded-xl shadow-sm space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex gap-0.5 text-gold-500">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < rev.rating ? "fill-gold-500" : "text-neutral-200"}`} />
                        ))}
                      </div>
                      <h4 className="font-bold text-sm text-charcoal-900 mt-1">{rev.title || "User Review"}</h4>
                    </div>
                    
                    <span className="text-[10px] text-charcoal-400 font-medium flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(rev.created_at).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                    </span>
                  </div>
                  
                  <p className="text-neutral-600 text-sm leading-relaxed">{rev.comment}</p>
                  
                  <div className="flex justify-between items-center text-[10px] text-charcoal-400 font-semibold pt-1">
                    <span>by {rev.user_email}</span>
                    {rev.verified_purchase && (
                      <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 flex items-center gap-1">
                        <Award className="w-3.5 h-3.5 fill-emerald-100" /> Verified Buyer
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Related items */}
      {currentProduct.related_products?.length > 0 && (
        <div className="space-y-8 border-t border-neutral-100 pt-16">
          <h2 className="font-serif text-2xl font-bold tracking-wide text-royal-red-900">You May Also Like</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
            {currentProduct.related_products.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

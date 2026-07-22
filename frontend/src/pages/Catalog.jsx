import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Filter, SlidersHorizontal, Search, Star, RefreshCw } from "lucide-react";
import { fetchProducts, fetchCategories } from "../features/productSlice";
import { addWishlistItem, fetchWishlist, removeWishlistItem } from "../features/wishlistSlice";
import ProductCard from "../components/ProductCard";
import { ProductCatalogSkeleton } from "../components/Skeletons";
import api from "../services/api";

export default function Catalog() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { products, categories, loading } = useSelector((state) => state.products);
  const { isAuthenticated } = useSelector((state) => state.auth);
  const wishlistState = useSelector((state) => state.wishlist) || {};
  const wishlistItems = wishlistState.items || [];
  const pendingVariantIds = wishlistState.pendingVariantIds || [];
  const pendingItemIds = wishlistState.pendingItemIds || [];
  
  // State for filters
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [minRating, setMinRating] = useState(searchParams.get("min_rating") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "newest");
  
  // Track mobile filter visibility
  const [showFiltersMobile, setShowFiltersMobile] = useState(false);
  const [variantIdsBySlug, setVariantIdsBySlug] = useState({});

  // Sync state with search parameters on mount/URL change
  useEffect(() => {
    const filters = {
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "",
      min_price: searchParams.get("min_price") || "",
      max_price: searchParams.get("max_price") || "",
      min_rating: searchParams.get("min_rating") || "",
      sort: searchParams.get("sort") || "newest",
    };
    
    // Sync local inputs
    setSearch(filters.search);
    setCategory(filters.category);
    setMinPrice(filters.min_price);
    setMaxPrice(filters.max_price);
    setMinRating(filters.min_rating);
    setSort(filters.sort);

    dispatch(fetchProducts(filters));
    dispatch(fetchCategories());
  }, [searchParams, dispatch]);

  useEffect(() => {
    if (isAuthenticated) {
      dispatch(fetchWishlist());
    }
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    let cancelled = false;

    const loadVariantIds = async () => {
      if (!isAuthenticated || products.length === 0) {
        setVariantIdsBySlug({});
        return;
      }

      const entries = await Promise.all(
        products.map(async (product) => {
          try {
            const res = await api.get(`/api/products/${product.slug}/`);
            return [product.slug, res.data.variants?.[0]?.id || null];
          } catch (error) {
            void error;
            return [product.slug, null];
          }
        })
      );

      if (!cancelled) {
        setVariantIdsBySlug(Object.fromEntries(entries.filter(([, variantId]) => variantId)));
      }
    };

    loadVariantIds();

    return () => {
      cancelled = true;
    };
  }, [products, isAuthenticated]);

  const wishlistedVariantIds = useMemo(
    () => new Set(wishlistItems.map((item) => String(item.variant))),
    [wishlistItems]
  );

  const getWishlistToggleState = (product) => {
    const variantId = variantIdsBySlug[product.slug];
    if (!variantId) {
      return false;
    }

    const existingItem = wishlistItems.find((item) => String(item.variant) === String(variantId));
    return (
      pendingVariantIds.includes(String(variantId)) ||
      (existingItem && pendingItemIds.includes(String(existingItem.id)))
    );
  };

  const getRedirectTarget = () => `${location.pathname}${location.search}`;

  const resolveVariantIdForProduct = async (product) => {
    if (variantIdsBySlug[product.slug]) {
      return variantIdsBySlug[product.slug];
    }

    const res = await api.get(`/api/products/${product.slug}/`);
    const variantId = res.data.variants?.[0]?.id || null;
    if (variantId) {
      setVariantIdsBySlug((current) => ({
        ...current,
        [product.slug]: variantId,
      }));
    }
    return variantId;
  };

  const handleWishlistToggle = async (product) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=${encodeURIComponent(getRedirectTarget())}`);
      return;
    }

    try {
      const variantId = await resolveVariantIdForProduct(product);
      if (!variantId) {
        return;
      }

      const existingItem = wishlistItems.find((item) => String(item.variant) === String(variantId));
      if (pendingVariantIds.includes(String(variantId))) {
        return;
      }

      if (existingItem) {
        if (pendingItemIds.includes(String(existingItem.id))) {
          return;
        }
        await dispatch(removeWishlistItem(existingItem.id)).unwrap();
      } else {
        await dispatch(addWishlistItem(variantId)).unwrap();
      }
    } catch (error) {
      void error;
    }
  };

  const applyFilters = () => {
    const params = {};
    if (search) params.search = search;
    if (category) params.category = category;
    if (minPrice) params.min_price = minPrice;
    if (maxPrice) params.max_price = maxPrice;
    if (minRating) params.min_rating = minRating;
    if (sort) params.sort = sort;

    setSearchParams(params);
    setShowFiltersMobile(false);
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setMinPrice("");
    setMaxPrice("");
    setMinRating("");
    setSort("newest");
    setSearchParams({});
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      applyFilters();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header and Sorting */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-royal-red-100 pb-6">
        <div>
          <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900">
            Heritage Collections
          </h1>
          <p className="text-neutral-500 text-sm mt-1">
            Showing {products.length} handloom sarees matching your preferences
          </p>
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          {/* Mobile Filter Toggle */}
          <button
            onClick={() => setShowFiltersMobile(!showFiltersMobile)}
            className="md:hidden flex items-center justify-center gap-2 border border-neutral-200 px-4 py-2.5 rounded-lg text-sm font-semibold w-1/2 bg-white"
          >
            <Filter className="w-4 h-4 text-gold-600" /> Filters
          </button>
          
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              const params = Object.fromEntries(searchParams.entries());
              params.sort = e.target.value;
              setSearchParams(params);
            }}
            className="border border-neutral-200 bg-white px-4 py-2.5 rounded-lg text-sm font-semibold text-charcoal-700 outline-none w-1/2 md:w-56 focus:border-royal-red-900"
          >
            <option value="newest">Sort: New Arrivals</option>
            <option value="price_asc">Sort: Price Low to High</option>
            <option value="price_desc">Sort: Price High to Low</option>
            <option value="rating">Sort: Customer Rating</option>
          </select>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Desktop Filter Panel */}
        <div className="hidden md:block space-y-8 sticky top-28 h-fit self-start">
          <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
            <h3 className="font-serif text-lg font-bold text-royal-red-900 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-gold-600" /> Refine By
            </h3>
            <button onClick={clearFilters} className="text-xs font-semibold text-royal-red-900 hover:underline">
              Clear All
            </button>
          </div>

          {/* Search Bar */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Search</label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search catalog..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm outline-none bg-white focus:border-royal-red-900"
              />
              <Search className="absolute left-3 top-3 w-4 h-4 text-neutral-400" />
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Fabric Category</label>
            <div className="space-y-2">
              {categories.map((cat) => (
                <label key={cat.id} className="flex items-center gap-2 text-sm text-charcoal-700 hover:text-royal-red-900 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={category === cat.slug}
                    onChange={() => setCategory(cat.slug)}
                    className="accent-royal-red-900"
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Price Range */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Price Range (₹)</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                className="w-full border border-neutral-200 px-3 py-2 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
              />
              <span className="text-neutral-400">-</span>
              <input
                type="number"
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                className="w-full border border-neutral-200 px-3 py-2 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
              />
            </div>
          </div>

          {/* Customer Rating */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Customer Review</label>
            <div className="space-y-2">
              {[4, 3, 2].map((stars) => (
                <label key={stars} className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer hover:text-royal-red-900">
                  <input
                    type="radio"
                    name="min_rating"
                    checked={minRating === String(stars)}
                    onChange={() => setMinRating(String(stars))}
                    className="accent-royal-red-900"
                  />
                  <span className="flex items-center text-gold-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? "fill-gold-500 text-gold-500" : "text-neutral-200"}`} />
                    ))}
                    <span className="text-neutral-500 text-xs ml-1 font-medium">& Up</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <button
            onClick={applyFilters}
            className="w-full bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold py-3 rounded-full text-sm tracking-wider shadow-sm transition-all"
          >
            Apply Filters
          </button>
        </div>

        {/* Mobile Filters Modal */}
        {showFiltersMobile && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden flex justify-end">
            <div className="w-80 bg-white h-full p-6 space-y-6 overflow-y-auto shadow-2xl flex flex-col justify-between">
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-4 border-b">
                  <h3 className="font-serif text-lg font-bold text-royal-red-900">Refine By</h3>
                  <button onClick={() => setShowFiltersMobile(false)} className="text-neutral-500 text-sm font-semibold">
                    Close
                  </button>
                </div>
                
                {/* Search */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Search</label>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search..."
                    className="w-full border px-3 py-2 rounded-lg text-sm bg-white outline-none"
                  />
                </div>

                {/* Categories */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Categories</label>
                  <div className="space-y-2">
                    {categories.map((cat) => (
                      <label key={cat.id} className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer">
                        <input
                          type="radio"
                          name="category-m"
                          checked={category === cat.slug}
                          onChange={() => setCategory(cat.slug)}
                        />
                        <span>{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Price */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Price (₹)</label>
                  <div className="flex gap-2">
                    <input type="number" placeholder="Min" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} className="w-full border p-2 rounded-lg text-sm bg-white outline-none" />
                    <input type="number" placeholder="Max" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} className="w-full border p-2 rounded-lg text-sm bg-white outline-none" />
                  </div>
                </div>

                {/* Ratings */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Rating</label>
                  <div className="space-y-2">
                    {[4, 3, 2].map((stars) => (
                      <label key={stars} className="flex items-center gap-2 text-sm text-charcoal-700 cursor-pointer">
                        <input type="radio" name="min_rating-m" checked={minRating === String(stars)} onChange={() => setMinRating(String(stars))} />
                        <span className="flex items-center text-gold-500">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < stars ? "fill-gold-500 text-gold-500" : "text-neutral-200"}`} />
                          ))}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6 border-t">
                <button onClick={clearFilters} className="w-1/2 border py-3 rounded-full text-sm font-semibold">
                  Clear
                </button>
                <button onClick={applyFilters} className="w-1/2 bg-royal-red-900 text-white py-3 rounded-full text-sm font-semibold">
                  Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Product Catalog Grid */}
        <div className="md:col-span-3">
          {loading ? (
            <ProductCatalogSkeleton />
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 bg-white border rounded-xl p-8 shadow-sm">
              <Search className="w-12 h-12 text-neutral-300" />
              <h3 className="font-serif text-xl font-bold text-charcoal-900">No Sarees Found</h3>
              <p className="text-neutral-500 text-sm max-w-sm">
                We couldn't find any items matching your selected filters. Try broadening your keywords or price parameters.
              </p>
              <button
                onClick={clearFilters}
                className="mt-4 bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold px-6 py-2.5 rounded-full text-xs tracking-wider transition-all"
              >
                Reset Catalog
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {products.map((product) => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  isWishlisted={wishlistedVariantIds.has(String(variantIdsBySlug[product.slug] || ""))}
                  isWishlistToggling={getWishlistToggleState(product)}
                  onWishlistToggle={handleWishlistToggle}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

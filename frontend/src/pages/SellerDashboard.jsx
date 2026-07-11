import React, { useEffect, useMemo, useState } from "react";
import PremiumImage from "../components/PremiumImage";
import { useSelector } from "react-redux";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Package,
  IndianRupee,
  TrendingUp,
  AlertTriangle,
  Ship,
  RefreshCw,
  Plus,
  Pencil,
  Trash2,
  X,
  Image as ImageIcon,
  BadgePlus,
} from "lucide-react";
import api from "../services/api";

const emptyProductForm = {
  name: "",
  description: "",
  category: "",
  base_price: "",
  stock_qty: 10,
  image_url: "",
  is_active: true,
};

function normalizeListResponse(data) {
  return data?.results !== undefined ? data.results : data;
}

function SellerProductModal({ open, onClose, onSubmit, saving, categories, categoriesLoading, form, setForm, editing }) {
  if (!open) return null;

  const hasCategories = categories.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-3xl rounded-[28px] bg-white shadow-2xl border border-royal-red-100 overflow-hidden">
        <div className="flex items-start justify-between gap-6 border-b border-neutral-100 px-6 py-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
              Seller product studio
            </p>
            <h3 className="mt-2 font-serif text-2xl font-bold text-royal-red-900">
              {editing ? "Edit Product" : "Add New Product"}
            </h3>
            <p className="mt-1 text-sm leading-6 text-neutral-500">
              Manage your saree catalog from the same product source used by the storefront.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-neutral-200 p-2 text-charcoal-500 transition-colors hover:text-royal-red-900 hover:border-royal-red-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={onSubmit}
          className="max-h-[75vh] overflow-y-auto px-6 py-6 space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Product Name
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-royal-red-900"
                placeholder="Royal Banarasi Silk Saree"
                required
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Description
              </label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[120px] w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-royal-red-900"
                placeholder="Describe the weave, drape, and occasion feel."
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Category
              </label>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-royal-red-900"
                required
                disabled={!hasCategories}
              >
                <option value="">
                  {categoriesLoading
                    ? "Loading categories..."
                    : hasCategories
                      ? "Select category"
                      : "No categories available"}
                </option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              {!categoriesLoading && !hasCategories && (
                <p className="text-xs text-neutral-500">
                  No categories were found. The seller product form requires catalog categories to be available.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Price
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.base_price}
                onChange={(e) => setForm((prev) => ({ ...prev, base_price: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-royal-red-900"
                placeholder="4999"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={form.stock_qty}
                onChange={(e) => setForm((prev) => ({ ...prev, stock_qty: e.target.value }))}
                className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-sm outline-none transition-colors focus:border-royal-red-900"
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">
                Product Image URL
              </label>
              <div className="relative">
                <ImageIcon className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
                <input
                  value={form.image_url}
                  onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition-colors focus:border-royal-red-900"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-4 md:col-span-2">
              <div>
                <p className="font-semibold text-charcoal-900">Publish product</p>
                <p className="text-xs leading-5 text-neutral-500">
                  Active products are visible in the storefront catalog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, is_active: !prev.is_active }))}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                  form.is_active ? "bg-royal-red-900" : "bg-neutral-300"
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                    form.is_active ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-neutral-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-neutral-200 px-6 py-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-royal-red-200 hover:text-royal-red-900"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-royal-red-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <BadgePlus className="h-4 w-4" />
              {saving ? "Saving..." : editing ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SellerConfirmModal({ open, title, message, targetName, targetMeta, onCancel, onConfirm, saving }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-lg rounded-[28px] bg-white shadow-2xl border border-royal-red-100 overflow-hidden">
        <div className="border-b border-neutral-100 px-6 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">Confirm action</p>
          <h3 className="mt-2 font-serif text-2xl font-bold text-royal-red-900">{title}</h3>
        </div>
        <div className="space-y-4 px-6 py-6">
          <p className="text-sm leading-6 text-neutral-600">{message}</p>
          <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
            <p className="text-sm font-semibold text-charcoal-900">{targetName}</p>
            {targetMeta && <p className="mt-1 text-xs leading-5 text-neutral-500">{targetMeta}</p>}
          </div>
        </div>
        <div className="flex gap-3 border-t border-neutral-100 px-6 py-5">
          <button
            onClick={onCancel}
            className="flex-1 rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-royal-red-200 hover:text-royal-red-900"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="flex-1 rounded-full bg-royal-red-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {saving ? "Processing..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SellerDashboard() {
  const { user } = useSelector((state) => state.auth);
  const [stats, setStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState("");
  const [productsError, setProductsError] = useState("");
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [fulfillingId, setFulfillingId] = useState(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const sellerLabel = useMemo(
    () => user?.shop_name || user?.first_name || "Seller",
    [user]
  );

  useEffect(() => {
    loadStats();
    loadProducts();
    loadCategories();
  }, []);

  useEffect(() => {
    if (!successMessage) return undefined;
    const timer = setTimeout(() => setSuccessMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const showFeedback = (message) => {
    setSuccessMessage(message);
  };

  const loadStats = () => {
    setLoading(true);
    api.get("/api/auth/dashboard/seller/")
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load seller analytics dashboard.");
        setLoading(false);
      });
  };

  const loadProducts = () => {
    setProductsLoading(true);
    setProductsError("");
    api.get("/api/products/?my_products=true&sort=newest")
      .then((res) => {
        setProducts(normalizeListResponse(res.data) || []);
        setProductsLoading(false);
      })
      .catch(() => {
        setProductsError("Failed to load your product catalog.");
        setProductsLoading(false);
      });
  };

  const loadCategories = () => {
    setCategoriesLoading(true);
    api.get("/api/categories/")
      .then((res) => {
        setCategories(normalizeListResponse(res.data) || []);
        setCategoriesLoading(false);
      })
      .catch(() => {
        setCategories([]);
        setCategoriesLoading(false);
      });
  };

  const refreshAll = () => {
    loadStats();
    loadProducts();
  };

  const handleMarkShipped = async (orderId) => {
    setFulfillingId(orderId);
    try {
      await api.post(`/api/orders/orders/${orderId}/update_status/`, {
        status: "SHIPPED",
      });
      loadStats();
      showFeedback("Order status updated.");
    } catch (err) {
      // Intentionally left quiet for dashboard flow.
    } finally {
      setFulfillingId(null);
    }
  };

  const openNewProductModal = () => {
    setEditingProduct(null);
    setProductForm(emptyProductForm);
    setShowProductModal(true);
  };

  const openEditProductModal = (product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      category: product.category_id || "",
      base_price: product.base_price || "",
      stock_qty: product.stock_qty ?? 0,
      image_url: product.primary_image || "",
      is_active: product.is_active ?? true,
    });
    setShowProductModal(true);
  };

  const closeProductModal = () => {
    setShowProductModal(false);
    setEditingProduct(null);
    setProductForm(emptyProductForm);
  };

  const submitProduct = async (e) => {
    e.preventDefault();
    setSavingProduct(true);

    const payload = {
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      category: productForm.category,
      base_price: Number(productForm.base_price),
      initial_stock: Number(productForm.stock_qty || 0),
      is_active: productForm.is_active,
    };

    if (productForm.image_url.trim()) {
      payload.image_url = productForm.image_url.trim();
    }

    try {
      if (editingProduct) {
        await api.patch(`/api/products/${editingProduct.slug}/`, payload);
        showFeedback("Product updated successfully.");
      } else {
        await api.post("/api/products/", payload);
        showFeedback("Product created successfully.");
      }
      closeProductModal();
      refreshAll();
    } catch (err) {
      setProductsError(
        err.response?.data?.detail ||
          err.response?.data?.error ||
          "Unable to save product. Check required fields and try again."
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const confirmDeleteProduct = async () => {
    if (!deleteProduct) return;
    setDeleteLoading(true);

    try {
      await api.delete(`/api/products/${deleteProduct.slug}/`);
      showFeedback("Product deleted successfully.");
      setDeleteProduct(null);
      refreshAll();
    } catch (err) {
      setProductsError("Unable to delete product right now.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")),
    [products]
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-royal-red-900" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <div className="flex flex-col gap-5 border-b border-neutral-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
            Seller workspace
          </p>
          <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900">
            Seller Hub Dashboard
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-neutral-500">
            Manage your catalog, track sales, and keep your storefront products current.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">
            <Package className="h-4 w-4" />
            {sortedProducts.length} products
          </span>
          <button
            onClick={refreshAll}
            className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-charcoal-700 transition-colors hover:border-royal-red-200 hover:text-royal-red-900"
          >
            <RefreshCw className="w-4 h-4 text-gold-500" />
            Refresh
          </button>
        </div>
      </div>

      {error && !Stats && products.length === 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}
      {successMessage && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <div className="shrink-0 rounded-full bg-royal-red-50 p-3.5 text-royal-red-900">
                <IndianRupee className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
                  Total Sales Revenue
                </span>
                <h3 className="mt-1 text-xl font-bold text-royal-red-900">
                  ₹{parseFloat(stats.total_revenue || 0).toLocaleString("en-IN")}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <div className="shrink-0 rounded-full bg-gold-50 p-3.5 text-gold-600">
                <TrendingUp className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
                  Sarees Ordered
                </span>
                <h3 className="mt-1 text-xl font-bold text-charcoal-900">
                  {stats.total_sales_count} units
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <div className="shrink-0 rounded-full bg-neutral-50 p-3.5 text-charcoal-700">
                <Package className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
                  Active Catalog SKUs
                </span>
                <h3 className="mt-1 text-xl font-bold text-charcoal-900">
                  {stats.total_products} products
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm">
              <div className="shrink-0 rounded-full bg-amber-50 p-3.5 text-amber-700">
                <AlertTriangle className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-charcoal-400">
                  Low Stock Warnings
                </span>
                <h3 className={`mt-1 text-xl font-bold ${stats.low_stock_count > 0 ? "text-amber-600" : "text-charcoal-900"}`}>
                  {stats.low_stock_count} SKUs
                </h3>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
            <div className="space-y-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="font-serif text-lg font-bold text-royal-red-900">
                Revenue Analytics (Last 6 Months)
              </h2>
              <div className="h-80 w-full text-xs font-semibold">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={stats.monthly_sales}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => `₹${Number(value).toLocaleString("en-IN")}`} />
                    <Line type="monotone" dataKey="revenue" stroke="#9b1e2e" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6 rounded-2xl border border-neutral-100 bg-white p-6 shadow-sm lg:col-span-1">
              <h2 className="font-serif text-lg font-bold text-royal-red-900">
                Recent Purchase Orders
              </h2>

              {stats.recent_orders.length === 0 ? (
                <p className="py-10 text-center text-xs text-neutral-400">
                  No active purchase orders found.
                </p>
              ) : (
                <div className="max-h-[360px] space-y-4 overflow-y-auto pr-1">
                  {stats.recent_orders.map((ord) => (
                    <div key={ord.order_id} className="space-y-3 rounded-xl border p-4 text-xs font-medium">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate pr-2 font-bold text-charcoal-900">{ord.product_name}</span>
                        <span
                          className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                            ord.status === "PROCESSING"
                              ? "border border-blue-100 bg-blue-50 text-blue-700"
                              : "border border-emerald-100 bg-emerald-50 text-emerald-700"
                          }`}
                        >
                          {ord.status}
                        </span>
                      </div>

                      <div className="flex justify-between text-neutral-500">
                        <span>SKU: {ord.sku} (x{ord.quantity})</span>
                        <span className="font-bold text-royal-red-900">
                          ₹{parseFloat(ord.price).toLocaleString("en-IN")}
                        </span>
                      </div>

                      {ord.status === "PROCESSING" && (
                        <button
                          onClick={() => handleMarkShipped(ord.order_id)}
                          disabled={fulfillingId === ord.order_id}
                          className="flex w-full items-center justify-center gap-1 rounded-lg bg-royal-red-900 py-2 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-royal-red-800 disabled:cursor-not-allowed disabled:opacity-70"
                        >
                          <Ship className="h-3.5 w-3.5" />
                          {fulfillingId === ord.order_id ? "Updating status..." : "Mark as Shipped"}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <section id="seller-products" className="space-y-6 rounded-[28px] border border-royal-red-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 border-b border-neutral-100 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
              Catalog management
            </p>
            <h2 className="font-serif text-2xl font-bold text-royal-red-900">
              Manage Products
            </h2>
            <p className="max-w-2xl text-sm leading-7 text-neutral-500">
              Add, update, and retire your saree listings from the same data source that powers the storefront catalog.
            </p>
          </div>
          <button
            onClick={openNewProductModal}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-royal-red-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>
        </div>

        {productsError && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            {productsError}
          </div>
        )}

        {productsLoading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
                <div className="h-48 rounded-xl bg-neutral-200" />
                <div className="mt-4 space-y-3">
                  <div className="h-4 w-1/2 rounded bg-neutral-200" />
                  <div className="h-4 w-3/4 rounded bg-neutral-200" />
                  <div className="h-10 rounded bg-neutral-200" />
                </div>
              </div>
            ))}
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-neutral-200 bg-neutral-50 px-6 py-14 text-center">
            <Package className="h-12 w-12 text-neutral-300" />
            <h3 className="mt-4 font-serif text-xl font-bold text-charcoal-900">
              No products yet
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-neutral-500">
              Add your first saree listing to start selling through the storefront catalog.
            </p>
            <button
              onClick={openNewProductModal}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-royal-red-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800"
            >
              <Plus className="h-4 w-4" />
              Add First Product
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sortedProducts.map((product) => (
              <article key={product.id} className="group flex h-full flex-col overflow-hidden rounded-[24px] border border-neutral-100 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                <div className="relative aspect-[3/4] overflow-hidden bg-neutral-100">
                  <PremiumImage
                    src={product.primary_image || ""}
                    alt={product.name}
                    className="h-full w-full object-cover object-top transition-transform duration-700 group-hover:scale-[1.04]"
                    fallbackTitle={product.brand || sellerLabel}
                    fallbackSubtitle={product.category_name || "Heritage Sarees"}
                  />
                  <div className="absolute left-4 top-4">
                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] backdrop-blur-sm ${
                        product.is_active
                          ? "border-emerald-100 bg-emerald-50/90 text-emerald-700"
                          : "border-neutral-200 bg-white/90 text-neutral-500"
                      }`}
                    >
                      {product.is_active ? "Active" : "Draft"}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 rounded-full border border-white/20 bg-black/35 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-white backdrop-blur-sm">
                    Stock {product.stock_qty ?? 0}
                  </div>
                </div>
                <div className="flex flex-1 flex-col space-y-4 p-5">
                  <div className="space-y-1">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold-600">
                      {product.category_name || "Uncategorized"}
                    </p>
                    <h3 className="font-serif text-xl font-semibold leading-snug text-charcoal-900 transition-colors group-hover:text-royal-red-900">
                      {product.name}
                    </h3>
                  </div>

                  <p className="line-clamp-2 text-sm leading-6 text-neutral-500">
                    {product.description}
                  </p>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <p className="uppercase tracking-[0.2em] text-neutral-400">Price</p>
                      <p className="mt-1 font-bold text-charcoal-900">
                        ₹{parseFloat(product.base_price).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <p className="uppercase tracking-[0.2em] text-neutral-400">Stock</p>
                      <p className="mt-1 font-bold text-charcoal-900">{product.stock_qty ?? 0}</p>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-3">
                      <p className="uppercase tracking-[0.2em] text-neutral-400">Brand</p>
                      <p className="mt-1 truncate font-bold text-charcoal-900">{product.brand || sellerLabel}</p>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-3 pt-1">
                    <button
                      onClick={() => openEditProductModal(product)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-neutral-200 px-4 py-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-royal-red-200 hover:text-royal-red-900"
                    >
                      <Pencil className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteProduct(product)}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <SellerProductModal
        open={showProductModal}
        onClose={closeProductModal}
        onSubmit={submitProduct}
        saving={savingProduct}
        categories={categories}
        categoriesLoading={categoriesLoading}
        form={productForm}
        setForm={setProductForm}
        editing={!!editingProduct}
      />

      <SellerConfirmModal
        open={!!deleteProduct}
        title="Delete Product"
        message="This will permanently remove the product from your catalog and the storefront source."
        targetName={deleteProduct?.name || ""}
        targetMeta={`${deleteProduct?.category_name || "No category"} • ₹${deleteProduct ? parseFloat(deleteProduct.base_price).toLocaleString("en-IN") : "0"}`}
        onCancel={() => setDeleteProduct(null)}
        onConfirm={confirmDeleteProduct}
        saving={deleteLoading}
      />
    </div>
  );
}

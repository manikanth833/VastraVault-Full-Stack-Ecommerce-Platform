import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import {
  BadgeCheck,
  Calendar,
  IndianRupee,
  Package,
  ShoppingBag,
  ShieldCheck,
  Store,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import api from "../services/api";
import { fetchProfile } from "../features/authSlice";

const formatCurrency = (value) => {
  const amount = Number.parseFloat(value || 0);
  return Number.isNaN(amount)
    ? "₹0"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getSellerLabel = (seller) => {
  const shopName = seller?.shop_name?.trim();
  const fullName = [seller?.first_name?.trim(), seller?.last_name?.trim()].filter(Boolean).join(" ").trim();
  const emailPrefix = seller?.email?.split("@")?.[0]?.trim();
  return shopName || fullName || emailPrefix || seller?.username || "Seller Account";
};

const StatCard = ({ icon: Icon, label, value, tone = "default" }) => {
  const tones = {
    default: "bg-neutral-50 text-charcoal-700",
    gold: "bg-gold-50 text-gold-700",
    red: "bg-royal-red-50 text-royal-red-900",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className={`rounded-2xl p-3 ${tones[tone] || tones.default}`}>
          <Icon className="h-6 w-6 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">{label}</p>
          <p className="font-serif text-2xl font-bold text-charcoal-900">{value}</p>
        </div>
      </div>
    </div>
  );
};

export default function SellerAccount() {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [sellerStats, setSellerStats] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    dispatch(fetchProfile());
  }, [dispatch]);

  const isPendingSeller = user?.role_name === "SELLER" && !user?.is_approved_seller;

  useEffect(() => {
    let isMounted = true;

    if (!user) {
      return () => {
        isMounted = false;
      };
    }

    if (isPendingSeller) {
      setSellerStats(null);
      setProducts([]);
      setError("");
      setLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadSellerAccount = async () => {
      setLoading(true);
      setError("");

      try {
        const [dashboardRes, productsRes] = await Promise.all([
          api.get("/api/auth/dashboard/seller/"),
          api.get("/api/products/?my_products=true&sort=newest"),
        ]);

        if (!isMounted) return;

        const productList = productsRes.data?.results !== undefined ? productsRes.data.results : productsRes.data;
        setSellerStats(dashboardRes.data);
        setProducts(Array.isArray(productList) ? productList : []);
      } catch (err) {
        if (!isMounted) return;
        setError("Unable to load seller account details right now.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadSellerAccount();

    return () => {
      isMounted = false;
    };
  }, [user, isPendingSeller]);

  const sellerDisplayName = useMemo(() => getSellerLabel(user), [user]);
  const sellerFullName = useMemo(
    () => [user?.first_name?.trim(), user?.last_name?.trim()].filter(Boolean).join(" ").trim() || sellerDisplayName,
    [user, sellerDisplayName]
  );
  const sellerEmail = user?.email || "-";
  const joinedDate = formatDate(user?.created_at);
  

  const activeProductsCount =
    sellerStats?.active_products_count ?? products.filter((product) => product.is_active).length;
  const totalProductsCount = sellerStats?.total_products ?? products.length;
  const lowStockCount = sellerStats?.low_stock_count ?? 0;
  const totalOrdersCount = sellerStats?.total_orders_count ?? 0;
  const totalRevenue = sellerStats?.total_revenue || 0;

  const sellerOnboardingLabel = isPendingSeller ? "Complete Store Setup" : "Manage Products";
  const sellerOnboardingTarget = isPendingSeller ? "/seller-dashboard" : "/seller-dashboard#seller-products";
  const revenueCopy =
    Number(totalRevenue) > 0
      ? "This reflects revenue generated from your storefront orders."
      : "Revenue will appear here once your first approved storefront order is completed.";
  const guidanceCopy = (() => {
    if (totalProductsCount === 0) {
      return isPendingSeller
        ? "Set up your store details and add your first product so your catalog is ready once approval completes."
        : "Add your first product to make your storefront live and start receiving orders.";
    }

    if (lowStockCount > 0) {
      return `You have ${lowStockCount} low-stock product${lowStockCount > 1 ? "s" : ""}. Refill inventory soon to keep your catalog ready for orders.`;
    }

    if (totalOrdersCount === 0) {
      return "Your catalog is ready. Keep your listings polished while you wait for the first customer order.";
    }

    return "Your store is active. Use the seller dashboard to manage orders, inventory, and catalog performance.";
  })();
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <section className="relative overflow-hidden rounded-[32px] border border-royal-red-100 bg-[linear-gradient(135deg,#2b0f16_0%,#5f1d28_42%,#1f0a10_100%)] px-6 py-8 text-white shadow-xl sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_28%)]" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-300 backdrop-blur-sm">
              <ShieldCheck className="h-4 w-4" />
              Seller Account
            </span>
            <div className="space-y-2">
              <h1 className="font-serif text-4xl font-bold tracking-wide sm:text-5xl">
                {sellerDisplayName}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-neutral-200">
                Premium workspace overview for your seller identity, store profile, and catalog health.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/seller-dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-gold-500 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-charcoal-900 transition-colors hover:bg-gold-400"
            >
              Go to Seller Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to={sellerOnboardingTarget}
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              {sellerOnboardingLabel}
            </Link>
            <a
              href="#store-details"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-5 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-white backdrop-blur-sm transition-colors hover:bg-white/15"
            >
              Store Details
            </a>
          </div>
        </div>
      </section>

      {isPendingSeller ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-700">
            Pending seller approval
          </p>
          <p className="mt-2">
            Your seller profile has been submitted for review. You can continue setting up your store and adding products, but storefront visibility, order activity, and seller analytics will become fully active once an admin approves your account.
          </p>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4 rounded-[28px] border border-neutral-100 bg-white p-6 shadow-sm lg:col-span-2">
            <div className="h-8 w-40 rounded bg-neutral-100" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-2xl bg-neutral-100" />
              ))}
            </div>
          </div>
          <div className="space-y-4 rounded-[28px] border border-neutral-100 bg-white p-6 shadow-sm">
            <div className="h-8 w-32 rounded bg-neutral-100" />
            <div className="h-40 rounded-2xl bg-neutral-100" />
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 rounded-[28px] border border-neutral-100 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="flex flex-col gap-4 border-b border-neutral-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
                    Seller identity
                  </p>
                  <h2 className="mt-2 font-serif text-2xl font-bold text-royal-red-900">
                    Account Overview
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-[24px] border border-royal-red-100 bg-[linear-gradient(180deg,#fff,#fff7f8)] p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-royal-red-900 text-lg font-semibold uppercase tracking-[0.25em] text-white">
                      {sellerDisplayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-600">
                          Seller Identity
                        </p>
                        <h3 className="mt-1 font-serif text-2xl font-bold text-charcoal-900">
                          {sellerFullName}
                        </h3>
                      </div>
                      <div className="space-y-1 text-sm text-neutral-600">
                        <p>Store: {sellerDisplayName}</p>
                        <p>{sellerEmail}</p>
                        <p>Joined {joinedDate}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div id="store-details" className="rounded-[24px] border border-neutral-100 bg-neutral-50/80 p-5">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-600">
                    Store / Brand
                  </p>
                  <h3 className="mt-2 font-serif text-2xl font-bold text-charcoal-900">
                    {user?.shop_name || sellerDisplayName}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-neutral-600">
                    {user?.shop_description || "No store description has been added yet."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <span className="inline-flex items-center rounded-full border border-neutral-200 bg-white px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-neutral-600">
                      {user?.role_name || "SELLER"} Account
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] ${
                        user?.is_approved_seller
                          ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                          : "border-amber-100 bg-amber-50 text-amber-700"
                      }`}
                    >
                      {user?.is_approved_seller ? "Store Active" : "Pending Approval"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[28px] border border-neutral-100 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="rounded-2xl bg-royal-red-50 p-3 text-royal-red-900">
                  <Calendar className="h-5 w-5 stroke-[1.5]" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
                    Account Details
                  </p>
                  <p className="font-semibold text-charcoal-900">{sellerEmail}</p>
                </div>
              </div>

              <div className="space-y-3 rounded-2xl border border-neutral-100 bg-neutral-50/80 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Email</span>
                  <span className="font-medium text-charcoal-900">{sellerEmail}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Joined</span>
                  <span className="font-medium text-charcoal-900">{joinedDate}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">Role</span>
                  <span className="font-medium text-charcoal-900">{user?.role_name || "SELLER"}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
                <div className="flex items-start gap-3">
                  <BadgeCheck className="h-5 w-5 shrink-0 text-amber-700" />
                  <div>
                    <p className="text-sm font-semibold text-charcoal-900">Premium seller workspace</p>
                    <p className="mt-1 text-xs leading-6 text-neutral-600">
                      Use the dashboard for catalog operations and this page for store identity and account context.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="space-y-6 rounded-[28px] border border-neutral-100 bg-white p-6 shadow-sm">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
                  Seller performance
                </p>
                <h2 className="mt-2 font-serif text-2xl font-bold text-royal-red-900">
                  Quick Stats
                </h2>
              </div>
              <div className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-neutral-500">
                Live seller metrics
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard icon={Package} label="Active Products" value={activeProductsCount} tone="red" />
              <StatCard icon={Store} label="Total Products" value={totalProductsCount} tone="default" />
              <StatCard icon={AlertTriangle} label="Low Stock" value={lowStockCount} tone="amber" />
              <StatCard icon={ShoppingBag} label="Total Orders" value={totalOrdersCount} tone="gold" />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-neutral-100 bg-neutral-50/70 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
                  Revenue
                </p>
                <div className="mt-3 flex items-end gap-3">
                  <IndianRupee className="h-8 w-8 text-gold-600" />
                  <p className="font-serif text-4xl font-bold text-charcoal-900">
                    {formatCurrency(totalRevenue)}
                  </p>
                </div>
                <p className="mt-3 text-sm leading-6 text-neutral-500">
                  {revenueCopy}
                </p>
              </div>

              <div className="rounded-[24px] border border-neutral-100 bg-neutral-50/70 p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">
                  Recent guidance
                </p>
                <p className="mt-3 text-sm leading-7 text-neutral-600">
                  {guidanceCopy}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-neutral-100 pt-5">
              <Link
                to="/seller-dashboard"
                className="inline-flex items-center gap-2 rounded-full bg-royal-red-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800"
              >
                Open Seller Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/seller-dashboard#seller-products"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-royal-red-200 hover:text-royal-red-900"
              >
                Manage Products
              </Link>
              <a
                href="#store-details"
                className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-5 py-3 text-sm font-semibold text-charcoal-700 transition-colors hover:border-royal-red-200 hover:text-royal-red-900"
              >
                View Store Details
              </a>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

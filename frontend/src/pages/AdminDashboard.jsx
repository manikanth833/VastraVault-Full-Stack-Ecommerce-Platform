import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Users, ShoppingBag, IndianRupee, ShieldCheck, Check, X, RefreshCw, LogOut, Store, Eye, Trash2, Search } from "lucide-react";
import api from "../services/api";
import { logoutUser } from "../features/authSlice";
import { clearCartLocal } from "../features/cartSlice";
import ConfirmationModal from "../components/ConfirmationModal";

const formatCurrency = (value) => {
  const amount = Number.parseFloat(value || 0);
  return Number.isNaN(amount)
    ? "Rs 0"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(amount);
};

const formatJoinedDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

const getDisplayName = (user) => {
  if (!user) return "-";
  const firstName = user.first_name?.trim();
  const lastName = user.last_name?.trim();
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();
  return fullName || user.email || "-";
};

const getRoleLabel = (roleName) => {
  if (roleName === "CUSTOMER") return "Customer";
  if (roleName === "SELLER") return "Seller";
  if (roleName === "ADMIN") return "Admin";
  return roleName || "-";
};

const getStatusMeta = (isApproved) => {
  if (isApproved) {
    return {
      label: "Approved",
      className: "bg-emerald-50 text-emerald-700 border border-emerald-100",
    };
  }

  return {
    label: "Pending",
    className: "bg-amber-50 text-amber-700 border border-amber-100",
  };
};

const getAccountStatus = (roleName) =>
  roleName === "SELLER" ? "Seller account registered on platform." : "Customer account registered on platform.";

const getRecordId = (value) => String(value ?? "");

const SectionState = ({ loading, emptyMessage, rows = 3, columns = 3 }) => {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((__, colIndex) => (
              <div key={colIndex} className="h-4 rounded bg-neutral-100" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return <p className="py-10 text-center text-sm text-neutral-400">{emptyMessage}</p>;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rowAction, setRowAction] = useState({ type: null, id: null });
  const [activeUser, setActiveUser] = useState(null);
  const [customerSearch, setCustomerSearch] = useState("");
  const [sellerSearch, setSellerSearch] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = () => {
    setLoading(true);
    return api
      .get("/api/auth/dashboard/admin/")
      .then((res) => {
        setStats(res.data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  };

  const isRowActionLoading = (type, id) => rowAction.type === type && getRecordId(rowAction.id) === getRecordId(id);

  const handleApproveSeller = async (sellerId, approve) => {
    setRowAction({ type: approve ? "approve" : "reject", id: sellerId });
    try {
      await api.post("/api/auth/dashboard/admin/approve-seller/", {
        seller_id: sellerId,
        approve,
      });
      await loadStats();
    } catch (err) {
      // Handle approval error
    } finally {
      setRowAction({ type: null, id: null });
    }
  };

  const handleDeleteUser = async (record) => {
    const roleLabel = record.role_name === "SELLER" ? "seller" : "customer";
    const displayName = getDisplayName(record);
    const confirmed = window.confirm(`Delete ${roleLabel} "${displayName}" (${record.email || "no email"})? This cannot be undone.`);
    if (!confirmed) return;

    setRowAction({ type: "delete", id: record.id });
    try {
      await api.post("/api/auth/dashboard/admin/manage-user/", {
        user_id: record.id,
        action: "delete",
      });
      if (activeUser?.id === record.id) {
        setActiveUser(null);
      }
      await loadStats();
    } catch (err) {
      // Handle delete failure
    } finally {
      setRowAction({ type: null, id: null });
    }
  };

  const handleViewUser = (record, roleName) => {
    setActiveUser({
      ...record,
      role_name: roleName || record.role_name || record.role?.name || record.role,
    });
  };

  const normalizedCustomerSearch = customerSearch.trim().toLowerCase();
  const normalizedSellerSearch = sellerSearch.trim().toLowerCase();

  const customers = Array.isArray(stats?.customers)
    ? stats.customers
    : Array.isArray(stats?.users)
      ? stats.users.filter((user) => (user.role_name || user.role?.name || user.role) === "CUSTOMER")
      : [];

  const filteredCustomers = customers.filter((customer) => {
    if (!normalizedCustomerSearch) return true;
    const searchable = [getDisplayName(customer), customer.email].filter(Boolean).join(" ").toLowerCase();
    return searchable.includes(normalizedCustomerSearch);
  });

  const baseSellers = Array.isArray(stats?.sellers)
    ? stats.sellers
    : Array.isArray(stats?.users)
      ? stats.users.filter((user) => (user.role_name || user.role?.name || user.role) === "SELLER")
      : [];

  const pendingSellers = Array.isArray(stats?.pending_sellers) ? stats.pending_sellers : [];
  const pendingSellerIds = new Set(pendingSellers.map((seller) => getRecordId(seller.id)));
  const sellers = [
    ...baseSellers,
    ...pendingSellers.filter((seller) => !baseSellers.some((entry) => getRecordId(entry.id) === getRecordId(seller.id))),
  ];
  const filteredSellers = sellers.filter((seller) => {
    if (!normalizedSellerSearch) return true;
    const searchable = [
      seller.shop_name,
      seller.email,
      getDisplayName(seller),
      seller.first_name,
      seller.last_name,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return searchable.includes(normalizedSellerSearch);
  });
  const monthlySales = Array.isArray(stats?.monthly_sales) ? stats.monthly_sales : [];
  const isInitialLoading = loading && !stats;

  const performLogout = () => {
    dispatch(logoutUser());
    dispatch(clearCartLocal());
    navigate("/");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Admin Header */}
      <div className="relative overflow-hidden rounded-2xl border border-royal-red-100 bg-white shadow-sm">
        <div className="absolute inset-0 bg-gradient-to-r from-royal-red-50 via-white to-gold-50" />
        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-royal-red-100 bg-white/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.24em] text-royal-red-900">
              <ShieldCheck className="h-3.5 w-3.5" />
              Admin Control Panel
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900">
                Platform Administration
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">
                Manage customers, sellers, and approval workflows from a dedicated admin workspace.
              </p>
            </div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">
              Signed in as {user?.first_name || user?.email || "Admin"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full border border-royal-red-200 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-charcoal-700 transition-colors hover:bg-royal-red-50"
            >
              <Store className="h-4 w-4 text-gold-600" />
              Visit Storefront
            </Link>
            <button
              onClick={loadStats}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-charcoal-700 transition-colors hover:bg-neutral-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 text-gold-500 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="inline-flex items-center gap-2 rounded-full bg-royal-red-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition-colors hover:bg-royal-red-800"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <ConfirmationModal
        open={showLogoutConfirm}
        title="Are you sure you want to log out?"
        message="You will need to sign in again to keep using the admin dashboard."
        confirmLabel="Yes, Logout"
        cancelLabel="Cancel"
        onConfirm={() => {
          setShowLogoutConfirm(false);
          performLogout();
        }}
        onClose={() => setShowLogoutConfirm(false)}
      />

      {/* Platform Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white border p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-royal-red-50 text-royal-red-900 p-3.5 rounded-full shrink-0">
            <IndianRupee className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-xs text-charcoal-400 font-bold uppercase tracking-wider">Gross Revenue</span>
            <h3 className="text-xl font-bold text-royal-red-900 mt-1">
              {isInitialLoading ? (
                <span className="inline-block h-6 w-28 rounded bg-neutral-100 animate-pulse align-middle" />
              ) : (
                formatCurrency(stats?.total_revenue)
              )}
            </h3>
          </div>
        </div>

        <div className="bg-white border p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-gold-50 text-gold-600 p-3.5 rounded-full shrink-0">
            <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-xs text-charcoal-400 font-bold uppercase tracking-wider">Gross Orders</span>
            <h3 className="text-xl font-bold text-charcoal-900 mt-1">
              {isInitialLoading ? (
                <span className="inline-block h-6 w-20 rounded bg-neutral-100 animate-pulse align-middle" />
              ) : (
                `${stats?.total_orders ?? 0} purchases`
              )}
            </h3>
          </div>
        </div>

        <div className="bg-white border p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-neutral-50 text-charcoal-700 p-3.5 rounded-full shrink-0">
            <Users className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-xs text-charcoal-400 font-bold uppercase tracking-wider">Registered Users</span>
            <h3 className="text-xl font-bold text-charcoal-900 mt-1">
              {isInitialLoading ? (
                <span className="inline-block h-6 w-24 rounded bg-neutral-100 animate-pulse align-middle" />
              ) : (
                `${stats?.total_users ?? 0} accounts`
              )}
            </h3>
          </div>
        </div>

        <div className="bg-white border p-6 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-emerald-50 text-emerald-700 p-3.5 rounded-full shrink-0">
            <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
          </div>
          <div>
            <span className="text-xs text-charcoal-400 font-bold uppercase tracking-wider">Loom Partners</span>
            <h3 className="text-xl font-bold text-emerald-800 mt-1">
              {isInitialLoading ? (
                <span className="inline-block h-6 w-20 rounded bg-neutral-100 animate-pulse align-middle" />
              ) : (
                `${stats?.total_sellers ?? 0} sellers`
              )}
            </h3>
          </div>
        </div>
      </div>

      {/* Graph and Seller Approvals Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Sales Graph */}
        <div className="lg:col-span-2 bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="font-serif text-lg font-bold text-royal-red-900">Platform Monthly Sales Revenue</h2>
          {isInitialLoading ? (
            <div className="h-80 w-full rounded-lg bg-neutral-50 animate-pulse" />
          ) : (
            <div className="h-80 w-full text-xs font-semibold">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Line type="monotone" dataKey="revenue" stroke="#9b1e2e" strokeWidth={3} activeDot={{ r: 8 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Seller Approval Queue */}
        <div className="lg:col-span-1 bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <h2 className="font-serif text-lg font-bold text-royal-red-900">Seller Approval Queue</h2>

          {isInitialLoading ? (
            <SectionState loading emptyMessage="" rows={3} columns={1} />
          ) : pendingSellers.length === 0 ? (
            <SectionState emptyMessage="No pending seller registration requests." />
          ) : (
            <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
              {pendingSellers.map((sel) => (
                <div key={sel.id} className="border p-4 rounded-lg space-y-3.5 text-xs font-medium">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <span className="block font-bold text-sm text-charcoal-900">{sel.shop_name}</span>
                      <span className="block text-[10px] text-charcoal-400">Owner: {sel.email}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold ${getStatusMeta(false).className}`}>
                      {getStatusMeta(false).label}
                    </span>
                  </div>

                  <p className="text-neutral-500 leading-relaxed italic">"{sel.shop_description}"</p>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      onClick={() => handleApproveSeller(sel.id, false)}
                      disabled={isRowActionLoading("approve", sel.id) || isRowActionLoading("reject", sel.id)}
                      className="w-1/2 border border-red-200 hover:bg-red-50 text-red-700 font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 disabled:opacity-60"
                    >
                      <X className="w-3.5 h-3.5" /> {isRowActionLoading("reject", sel.id) ? "Rejecting" : "Reject"}
                    </button>
                    <button
                      onClick={() => handleApproveSeller(sel.id, true)}
                      disabled={isRowActionLoading("approve", sel.id) || isRowActionLoading("reject", sel.id)}
                      className="w-1/2 bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold py-2 rounded-lg text-[10px] uppercase tracking-wider flex items-center justify-center gap-1 shadow-sm disabled:opacity-60"
                    >
                      <Check className="w-3.5 h-3.5" /> {isRowActionLoading("approve", sel.id) ? "Approving" : "Approve"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Management Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-royal-red-900">Customers</h2>
              <p className="text-xs text-neutral-500 mt-1">All customer accounts currently in the platform.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search customers"
                className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm text-charcoal-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-royal-red-200 focus:ring-2 focus:ring-royal-red-50"
              />
            </div>
          </div>

          {isInitialLoading ? (
            <SectionState loading emptyMessage="" rows={4} columns={3} />
          ) : customers.length === 0 ? (
            <SectionState emptyMessage="No customer accounts available." />
          ) : filteredCustomers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-6 py-10 text-center">
              <p className="text-sm font-medium text-charcoal-700">No customers match your search.</p>
              <p className="mt-1 text-xs text-neutral-500">Try a different name or email.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    <th className="py-3 pr-4 font-bold">Name</th>
                    <th className="py-3 pr-4 font-bold">Email</th>
                    <th className="py-3 pr-4 font-bold">Joined Date</th>
                    <th className="py-3 pr-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredCustomers.map((customer) => (
                    <tr key={customer.id} className="text-sm">
                      <td className="py-4 pr-4 font-medium text-charcoal-900">{getDisplayName(customer)}</td>
                      <td className="py-4 pr-4 text-neutral-600">{customer.email || "-"}</td>
                      <td className="py-4 pr-4 text-neutral-600">{formatJoinedDate(customer.created_at || customer.date_joined)}</td>
                      <td className="py-4 pr-4">
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleViewUser(customer, "CUSTOMER")}
                            className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal-700 transition-colors hover:bg-neutral-50"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser({ ...customer, role_name: "CUSTOMER" })}
                            disabled={isRowActionLoading("delete", customer.id)}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            {isRowActionLoading("delete", customer.id) ? "Deleting" : "Delete"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-serif text-lg font-bold text-royal-red-900">Sellers</h2>
              <p className="text-xs text-neutral-500 mt-1">Approved and pending seller accounts with status badges.</p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                value={sellerSearch}
                onChange={(e) => setSellerSearch(e.target.value)}
                placeholder="Search sellers"
                className="w-full rounded-full border border-neutral-200 bg-white py-2.5 pl-9 pr-4 text-sm text-charcoal-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-royal-red-200 focus:ring-2 focus:ring-royal-red-50"
              />
            </div>
          </div>

          {isInitialLoading ? (
            <SectionState loading emptyMessage="" rows={4} columns={4} />
          ) : sellers.length === 0 ? (
            <SectionState emptyMessage="No seller accounts available." />
          ) : filteredSellers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 bg-neutral-50/70 px-6 py-10 text-center">
              <p className="text-sm font-medium text-charcoal-700">No sellers match your search.</p>
              <p className="mt-1 text-xs text-neutral-500">Try a shop name, seller name, or email.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    <th className="py-3 pr-4 font-bold">Shop Name</th>
                    <th className="py-3 pr-4 font-bold">Owner Email</th>
                    <th className="py-3 pr-4 font-bold">Approval Status</th>
                    <th className="py-3 pr-4 font-bold">Joined Date</th>
                    <th className="py-3 pr-4 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {filteredSellers.map((seller) => {
                    const isPending = !seller.is_approved_seller || pendingSellerIds.has(getRecordId(seller.id));
                    const status = getStatusMeta(!isPending);

                    return (
                      <tr key={seller.id} className="text-sm">
                        <td className="py-4 pr-4 font-medium text-charcoal-900">{seller.shop_name || "-"}</td>
                        <td className="py-4 pr-4 text-neutral-600">{seller.email || "-"}</td>
                        <td className="py-4 pr-4">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-bold ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 pr-4 text-neutral-600">{formatJoinedDate(seller.created_at || seller.date_joined)}</td>
                        <td className="py-4 pr-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewUser(seller, "SELLER")}
                              className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-charcoal-700 transition-colors hover:bg-neutral-50"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser({ ...seller, role_name: "SELLER" })}
                              disabled={isRowActionLoading("delete", seller.id)}
                              className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {isRowActionLoading("delete", seller.id) ? "Removing" : "Remove"}
                            </button>
                            {isPending ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveSeller(seller.id, true)}
                                  disabled={isRowActionLoading("approve", seller.id) || isRowActionLoading("reject", seller.id)}
                                  className="inline-flex items-center gap-1 rounded-full bg-royal-red-900 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-white transition-colors hover:bg-royal-red-800 disabled:opacity-60"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                  {isRowActionLoading("approve", seller.id) ? "Approving" : "Approve"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleApproveSeller(seller.id, false)}
                                  disabled={isRowActionLoading("approve", seller.id) || isRowActionLoading("reject", seller.id)}
                                  className="inline-flex items-center gap-1 rounded-full border border-red-200 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-red-700 transition-colors hover:bg-red-50 disabled:opacity-60"
                                >
                                  <X className="h-3.5 w-3.5" />
                                  {isRowActionLoading("reject", seller.id) ? "Rejecting" : "Reject"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white border rounded-xl p-6 shadow-sm space-y-6 xl:col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-serif text-lg font-bold text-royal-red-900">Pending Sellers</h2>
              <p className="text-xs text-neutral-500 mt-1">A quick read-only view of accounts waiting on approval.</p>
            </div>
          </div>

          {isInitialLoading ? (
            <SectionState loading emptyMessage="" rows={3} columns={4} />
          ) : pendingSellers.length === 0 ? (
            <SectionState emptyMessage="No pending sellers at the moment." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-neutral-200 text-left">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-neutral-500">
                    <th className="py-3 pr-4 font-bold">Shop Name</th>
                    <th className="py-3 pr-4 font-bold">Owner Email</th>
                    <th className="py-3 pr-4 font-bold">Status</th>
                    <th className="py-3 pr-4 font-bold">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {pendingSellers.map((seller) => (
                    <tr key={seller.id} className="text-sm">
                      <td className="py-4 pr-4 font-medium text-charcoal-900">{seller.shop_name || "-"}</td>
                      <td className="py-4 pr-4 text-neutral-600">{seller.email || "-"}</td>
                      <td className="py-4 pr-4">
                        <span className="inline-flex px-2 py-0.5 rounded text-[9px] uppercase font-bold bg-amber-50 text-amber-700 border border-amber-100">
                          Pending
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-neutral-600">{formatJoinedDate(seller.created_at || seller.date_joined)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {activeUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6">
              <div className="w-full max-w-xl rounded-2xl border border-royal-red-100 bg-white shadow-2xl">
                <div className="flex items-start justify-between border-b border-neutral-100 p-6">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-neutral-200 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-500">
                      {getRoleLabel(activeUser.role_name)}
                    </div>
                    <h3 className="mt-3 font-serif text-2xl font-bold text-royal-red-900">
                      {getDisplayName(activeUser)}
                    </h3>
                    <p className="mt-1 text-sm text-neutral-500">Account details for admin review.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveUser(null)}
                    className="rounded-full border border-neutral-200 p-2 text-neutral-500 transition-colors hover:bg-neutral-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-4 p-6 text-sm text-charcoal-700 sm:grid-cols-2">
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Account ID</p>
                    <p className="mt-1 font-medium text-charcoal-900">{activeUser.id || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Status</p>
                    <p className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                      {activeUser.role_name === "SELLER"
                        ? activeUser.is_approved_seller
                          ? "Approved"
                          : "Pending"
                        : "Active"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Full Name</p>
                    <p className="mt-1 font-medium text-charcoal-900">{getDisplayName(activeUser)}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Email</p>
                    <p className="mt-1 font-medium text-charcoal-900">{activeUser.email || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Joined Date</p>
                    <p className="mt-1 font-medium text-charcoal-900">{formatJoinedDate(activeUser.created_at || activeUser.date_joined)}</p>
                  </div>
                  <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Role</p>
                    <p className="mt-1 font-medium text-charcoal-900">{getRoleLabel(activeUser.role_name)}</p>
                  </div>
                  <div className="sm:col-span-2 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Account Note</p>
                    <p className="mt-1 text-sm font-medium text-charcoal-900">{getAccountStatus(activeUser.role_name)}</p>
                  </div>
                  {activeUser.role_name === "SELLER" && (
                    <>
                      <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Shop Name</p>
                        <p className="mt-1 font-medium text-charcoal-900">{activeUser.shop_name || "-"}</p>
                      </div>
                      <div className="rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Approval Status</p>
                        <p className="mt-1 font-medium text-charcoal-900">
                          {activeUser.is_approved_seller ? "Approved" : "Pending"}
                        </p>
                      </div>
                      <div className="sm:col-span-2 rounded-2xl border border-neutral-100 bg-neutral-50/60 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Shop Description</p>
                        <p className="mt-1 font-medium text-charcoal-900">
                          {activeUser.shop_description || "No shop description provided."}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>         
      )}
    </div>
  );
}

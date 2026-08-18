import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { User, MapPin, Package, Settings, Calendar, Award, Trash2 } from "lucide-react";
import api from "../services/api";

export default function Profile() {
  const { user } = useSelector((state) => state.auth);
  
  // Tab states
  const [activeTab, setActiveTab] = useState("orders");
  
  // Data states
  const [orders, setOrders] = useState([]);
  const [addresses, setAddresses] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(true);

  useEffect(() => {
    // Fetch orders
    api.get("/api/orders/orders/")
      .then((res) => {
        setOrders(res.data.results !== undefined ? res.data.results : res.data);
        setLoadingOrders(false);
      })
      .catch(() => setLoadingOrders(false));

    // Fetch addresses
    loadAddresses();
  }, []);

  const loadAddresses = () => {
    api.get("/api/auth/addresses/")
      .then((res) => {
        const addressList = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
        setAddresses(addressList);
        setLoadingAddresses(false);
      })
      .catch(() => setLoadingAddresses(false));
  };

  const handleDeleteAddress = async (id) => {
    try {
      await api.delete(`/api/auth/addresses/${id}/`);
      setAddresses(addresses.filter((a) => a.id !== id));
    } catch (err) {
      // Error deleting
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header and profile banner */}
      <div className="bg-royal-red-900 text-white rounded-2xl p-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-full opacity-10 bg-[radial-gradient(#d4af37_1px,transparent_1px)] [background-size:16px_16px]" />
        
        <div className="flex items-center gap-4 relative z-10">
          <div className="bg-white/10 w-16 h-16 rounded-full flex items-center justify-center font-serif text-3xl font-bold text-gold-500">
            {user?.first_name?.[0] || "U"}
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold tracking-wide">
              {user?.first_name} {user?.last_name}
            </h1>
            <p className="text-neutral-300 text-sm mt-0.5">{user?.email}</p>
          </div>
        </div>

        <div className="relative z-10 bg-white/10 px-4 py-2 rounded-lg border border-white/20 text-xs font-semibold uppercase tracking-wider text-gold-400">
          {user?.role_name || "Customer"} Account
        </div>
      </div>

      {/* Main Tabs Container */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 items-start">
        {/* Navigation Sidebar */}
        <div className="bg-white border border-neutral-100 rounded-xl p-4 shadow-sm space-y-1">
          <button
            onClick={() => setActiveTab("orders")}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
              activeTab === "orders"
                ? "bg-royal-red-900 text-white"
                : "text-charcoal-700 hover:bg-neutral-50"
            }`}
          >
            <Package className="w-5 h-5 shrink-0" /> My Orders
          </button>
          <button
            onClick={() => setActiveTab("addresses")}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
              activeTab === "addresses"
                ? "bg-royal-red-900 text-white"
                : "text-charcoal-700 hover:bg-neutral-50"
            }`}
          >
            <MapPin className="w-5 h-5 shrink-0" /> Saved Addresses
          </button>
          <button
            onClick={() => setActiveTab("settings")}
            className={`w-full flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm font-semibold tracking-wide transition-colors ${
              activeTab === "settings"
                ? "bg-royal-red-900 text-white"
                : "text-charcoal-700 hover:bg-neutral-50"
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" /> Profile Settings
          </button>
        </div>

        {/* Tab Contents */}
        <div className="md:col-span-3">
          {/* Tab 1: Orders History */}
          {activeTab === "orders" && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl font-bold text-royal-red-900 border-b pb-4">Order History</h2>
              
              {loadingOrders ? (
                <div className="animate-pulse space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-28 bg-neutral-100 rounded-xl" />
                  ))}
                </div>
              ) : orders.length === 0 ? (
                <div className="text-center py-16 text-neutral-400 text-sm">
                  You haven't placed any orders yet.
                </div>
              ) : (
                <div className="space-y-6">
                  {orders.map((order) => (
                    <div key={order.id} className="bg-white border border-neutral-100 rounded-xl shadow-sm overflow-hidden">
                      <div className="bg-neutral-50 px-6 py-4 flex flex-wrap justify-between items-center gap-4 border-b text-xs font-semibold text-charcoal-600">
                        <div className="flex gap-6">
                          <div>
                            <span className="block text-neutral-400 font-normal uppercase mb-0.5">Order Placed</span>
                            <span>{new Date(order.created_at).toLocaleDateString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="block text-neutral-400 font-normal uppercase mb-0.5">Total Amount</span>
                            <span className="text-royal-red-900">₹{parseFloat(order.total_amount).toLocaleString("en-IN")}</span>
                          </div>
                          <div>
                            <span className="block text-neutral-400 font-normal uppercase mb-0.5">Order ID</span>
                            <span className="font-mono">{order.id.substr(0, 8)}...</span>
                          </div>
                        </div>
                        
                        <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                          order.status === "DELIVERED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            : order.status === "CANCELLED"
                              ? "bg-red-50 text-red-700 border border-red-100"
                              : "bg-blue-50 text-blue-700 border border-blue-100"
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      {/* Order items lists */}
                      <div className="p-6 divide-y divide-neutral-100">
                        {order.items?.map((item) => (
                          <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                            <div className="w-14 aspect-[3/4] bg-neutral-100 rounded overflow-hidden shrink-0">
                              <img src={item.variant_details?.images?.[0]?.image_url || "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=200&q=80"} alt="Purchased saree" className="w-full h-full object-cover object-top" />
                            </div>
                            <div className="flex-grow text-xs font-medium space-y-1">
                              <h4 className="font-bold text-sm text-charcoal-900 leading-snug">
                                {item.variant_details?.product_name || "Product"}
                              </h4>
                              <p className="text-charcoal-500">Color: {item.variant_details?.color} | Size: {item.variant_details?.size}</p>
                              <p className="text-charcoal-700">Qty: {item.quantity} | ₹{parseFloat(item.price).toLocaleString("en-IN")} each</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Saved Addresses */}
          {activeTab === "addresses" && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl font-bold text-royal-red-900 border-b pb-4">Saved Addresses</h2>
              
              {loadingAddresses ? (
                <div className="animate-pulse space-y-4">
                  <div className="h-24 bg-neutral-100 rounded-xl" />
                </div>
              ) : addresses.length === 0 ? (
                <div className="text-center py-16 text-neutral-400 text-sm">
                  No saved addresses found.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {addresses.map((addr) => (
                    <div key={addr.id} className="bg-white border border-neutral-100 p-5 rounded-xl shadow-sm flex justify-between items-start gap-4">
                      <div className="space-y-1.5 text-xs font-medium">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-charcoal-900">{addr.name}</span>
                          <span className="text-[9px] bg-neutral-100 text-charcoal-500 px-1.5 py-0.5 rounded font-bold uppercase">{addr.address_type}</span>
                          {addr.is_default && (
                            <span className="text-[9px] bg-royal-red-50 text-royal-red-900 px-1.5 py-0.5 rounded font-bold uppercase">Default</span>
                          )}
                        </div>
                        <p className="text-neutral-500 leading-relaxed">
                          {addr.address_line_1}, {addr.address_line_2 && `${addr.address_line_2}, `}
                          {addr.city}, {addr.state} - <span className="font-bold text-charcoal-900">{addr.pin_code}</span>
                        </p>
                        <span className="block text-charcoal-500">Contact: {addr.phone}</span>
                      </div>
                      
                      <button
                        onClick={() => handleDeleteAddress(addr.id)}
                        className="text-neutral-400 hover:text-royal-red-900 p-1 rounded hover:bg-neutral-50"
                      >
                        <Trash2 className="w-4.5 h-4.5 stroke-[1.5]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Account Settings */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              <h2 className="font-serif text-xl font-bold text-royal-red-900 border-b pb-4">Profile Settings</h2>
              
              <div className="bg-white border border-neutral-100 p-6 rounded-xl shadow-sm space-y-4 max-w-lg text-sm">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="block text-xs text-charcoal-400 font-bold uppercase mb-1">First Name</span>
                    <div className="border px-4 py-2.5 rounded-lg bg-neutral-50 font-semibold">{user?.first_name}</div>
                  </div>
                  <div>
                    <span className="block text-xs text-charcoal-400 font-bold uppercase mb-1">Last Name</span>
                    <div className="border px-4 py-2.5 rounded-lg bg-neutral-50 font-semibold">{user?.last_name}</div>
                  </div>
                </div>
                
                <div>
                  <span className="block text-xs text-charcoal-400 font-bold uppercase mb-1">Email Address</span>
                  <div className="border px-4 py-2.5 rounded-lg bg-neutral-50 font-semibold">{user?.email}</div>
                </div>

                <div className="bg-royal-red-50/50 border border-royal-red-100 rounded-lg p-4 flex gap-3 text-xs text-royal-red-900">
                  <Award className="w-5 h-5 shrink-0" />
                  <div className="space-y-0.5">
                    <span className="font-bold">Loom Trust Assurance Active</span>
                    <p className="text-charcoal-500">Your profile details are secured. Authenticity certificates are issued directly to this account.</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

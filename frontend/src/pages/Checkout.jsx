import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ShieldCheck, Plus, CheckCircle, CreditCard, Sparkles } from "lucide-react";
import { fetchCart } from "../features/cartSlice";
import api from "../services/api";

export default function Checkout() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  
  const couponCode = location.state?.couponCode || "";
  const { cart } = useSelector((state) => state.cart);
  const { user } = useSelector((state) => state.auth);

  // Address states
  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  
  // New Address Inputs
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddr1, setNewAddr1] = useState("");
  const [newAddr2, setNewAddr2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPinCode, setNewPinCode] = useState("");
  const [newType, setNewType] = useState("HOME");

  // Checkout Processing States
  const [loading, setLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockOrderData, setMockOrderData] = useState(null);
  const [couponPreview, setCouponPreview] = useState(null);
  const [couponPreviewError, setCouponPreviewError] = useState("");

  useEffect(() => {
    dispatch(fetchCart());
    loadAddresses();
  }, [dispatch]);

  useEffect(() => {
    let isMounted = true;

    const loadCouponPreview = async () => {
      if (!couponCode || !(cart?.items?.length > 0)) {
        setCouponPreview(null);
        setCouponPreviewError("");
        return;
      }

      try {
        const res = await api.get("/api/orders/cart/preview/", {
          params: { coupon_code: couponCode },
        });
        if (isMounted) {
          setCouponPreview(res.data);
          setCouponPreviewError("");
        }
      } catch (err) {
        if (isMounted) {
          setCouponPreview(null);
          setCouponPreviewError(err.response?.data?.error || "Invalid or expired coupon.");
        }
      }
    };

    loadCouponPreview();

    return () => {
      isMounted = false;
    };
  }, [couponCode, cart?.items?.length, cart?.subtotal]);

 const loadAddresses = async () => {
    try {
      const res = await api.get("/api/auth/addresses/");
      const addressList = Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
      setAddresses(addressList);
      if (addressList.length > 0) {
        const def = addressList.find((a) => a.is_default) || addressList[0];
        setSelectedAddress(def);
      }
    } catch (err) {
      // Error fetching addresses
    }
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post("/api/auth/addresses/", {
        name: newName,
        phone: newPhone,
        address_line_1: newAddr1,
        address_line_2: newAddr2,
        city: newCity,
        state: newState,
        pin_code: newPinCode,
        address_type: newType,
        is_default: addresses.length === 0,
      });
      setAddresses([...addresses, res.data]);
      setSelectedAddress(res.data);
      setShowAddressForm(false);
      // Reset inputs
      setNewName("");
      setNewPhone("");
      setNewAddr1("");
      setNewAddr2("");
      setNewCity("");
      setNewState("");
      setNewPinCode("");
    } catch (err) {
      // Error saving address
    }
  };

  // Main payment routine
  const handlePlaceOrder = async () => {
    if (!selectedAddress) {
      setCheckoutError("Please select or add a shipping address.");
      return;
    }
    setCheckoutError("");
    setLoading(true);

    try {
      // Create order in Django
      const res = await api.post("/api/orders/orders/", {
        address_id: selectedAddress.id,
        coupon_code: couponCode,
      });
      
      const orderData = res.data;
      
      // If the order uses mock identifiers, we open the mock payment dialog
      if (orderData.razorpay_order_id.startsWith("order_mock_")) {
        setMockOrderData(orderData);
        setShowMockModal(true);
        setLoading(false);
      } else {
        // Standard live Razorpay Checkout Flow
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Razorpay Key ID
          amount: Math.round(parseFloat(orderData.total_amount) * 100),
          currency: "INR",
          name: "Ananya Sarees",
          description: `Authentic Handloom Order`,
          order_id: orderData.razorpay_order_id,
          handler: async function (response) {
            try {
              setLoading(true);
              const verifyRes = await api.post("/api/payments/verify/", {
                razorpay_order_id: orderData.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              });
              
              if (verifyRes.data.status === "PROCESSING") {
                navigate(`/order-success?order_id=${orderData.id}`);
              }
            } catch (verifyErr) {
              setCheckoutError("Payment verification failed. Please contact support.");
              setLoading(false);
            }
          },
          prefill: {
            name: `${user?.first_name} ${user?.last_name}`,
            email: user?.email,
          },
          theme: {
            color: "#4a0e17",
          },
        };
        
        const rzp = new window.Razorpay(options);
        rzp.open();
        setLoading(false);
      }
    } catch (err) {
      setCheckoutError(err.response?.data?.error || "Failed to create checkout order.");
      setLoading(false);
    }
  };

  // Mock Success Payment flow
  const handleMockPaymentSuccess = async () => {
    if (!mockOrderData) return;
    setLoading(true);
    setShowMockModal(false);

    try {
      const verifyRes = await api.post("/api/payments/verify/", {
        razorpay_order_id: mockOrderData.razorpay_order_id,
        razorpay_payment_id: `pay_mock_${Math.random().toString(36).substr(2, 9)}`,
        razorpay_signature: `sig_mock_${Math.random().toString(36).substr(2, 9)}`,
      });

      if (verifyRes.data.status === "PROCESSING") {
        navigate(`/order-success?order_id=${mockOrderData.id}`);
      }
    } catch (err) {
      setCheckoutError("Mock payment verification failed.");
      setLoading(false);
    }
  };

  // Dynamically calculate totals
  const subtotal = parseFloat(couponPreview?.subtotal ?? cart?.subtotal ?? 0);
  const tax = parseFloat(couponPreview?.tax ?? cart?.tax ?? 0);
  const shipping = parseFloat(couponPreview?.shipping ?? cart?.shipping ?? 0);
  const discountAmount = parseFloat(couponPreview?.discount_amount ?? 0);
  const total = parseFloat(couponPreview?.total ?? cart?.total ?? (subtotal - discountAmount + tax + shipping));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900 border-b pb-6">
        Checkout Shipping & Payments
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Addresses and shipping selections */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping addresses selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="font-serif text-xl font-bold text-charcoal-900">1. Delivery Address</h2>
              <button
                onClick={() => setShowAddressForm(!showAddressForm)}
                className="text-xs font-semibold text-royal-red-900 hover:underline flex items-center gap-1"
              >
                <Plus className="w-4 h-4 text-gold-600" /> Add New Address
              </button>
            </div>

            {/* Slide down form */}
            {showAddressForm && (
              <form onSubmit={handleAddAddress} className="bg-white border p-6 rounded-xl shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="Full Name" value={newName} onChange={(e) => setNewName(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white" required />
                <input type="text" placeholder="Phone Number" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white" required />
                <input type="text" placeholder="Flat / House No. / Building" value={newAddr1} onChange={(e) => setNewAddr1(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white md:col-span-2" required />
                <input type="text" placeholder="Colony / Street / Locality" value={newAddr2} onChange={(e) => setNewAddr2(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white md:col-span-2" />
                <input type="text" placeholder="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white" required />
                <input type="text" placeholder="State" value={newState} onChange={(e) => setNewState(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white" required />
                <input type="text" placeholder="Pin Code" value={newPinCode} onChange={(e) => setNewPinCode(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white" required />
                <select value={newType} onChange={(e) => setNewType(e.target.value)} className="border p-2.5 rounded-lg text-sm bg-white">
                  <option value="HOME">Home (7 AM - 9 PM delivery)</option>
                  <option value="WORK">Work (9 AM - 6 PM delivery)</option>
                </select>
                <div className="md:col-span-2 flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddressForm(false)} className="border px-4 py-2 rounded-lg text-xs font-semibold">Cancel</button>
                  <button type="submit" className="bg-royal-red-900 text-white px-6 py-2 rounded-lg text-xs font-bold">Save Address</button>
                </div>
              </form>
            )}

            {/* List addresses */}
            {addresses.length === 0 ? (
              <p className="text-sm text-neutral-400">No saved addresses found. Please add a shipping address above.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddress(addr)}
                    className={`border p-5 rounded-xl cursor-pointer shadow-sm transition-all relative flex flex-col justify-between ${
                      selectedAddress?.id === addr.id
                        ? "border-royal-red-900 bg-royal-red-900/5 ring-1 ring-royal-red-900"
                        : "border-neutral-200 hover:border-neutral-300 bg-white"
                    }`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-charcoal-900">{addr.name}</span>
                        <span className="text-[10px] bg-neutral-100 text-charcoal-600 px-2 py-0.5 rounded font-semibold uppercase">{addr.address_type}</span>
                      </div>
                      <p className="text-xs text-neutral-500 leading-relaxed">
                        {addr.address_line_1}, {addr.address_line_2 && `${addr.address_line_2}, `}
                        {addr.city}, {addr.state} - <span className="font-semibold">{addr.pin_code}</span>
                      </p>
                      <span className="block text-xs text-charcoal-500 font-medium pt-1">Phone: {addr.phone}</span>
                    </div>
                    {selectedAddress?.id === addr.id && (
                      <CheckCircle className="absolute bottom-4 right-4 w-5 h-5 text-royal-red-900 fill-royal-red-50" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <hr className="border-neutral-100" />

          {/* Secure Payments Selection */}
          <div className="space-y-4">
            <h2 className="font-serif text-xl font-bold text-charcoal-900">2. Payment Method</h2>
            <div className="border p-5 rounded-xl bg-white border-royal-red-900 bg-royal-red-900/5 ring-1 ring-royal-red-900 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-royal-red-900 text-white p-2.5 rounded-lg">
                  <CreditCard className="w-6 h-6 stroke-[1.5]" />
                </div>
                <div>
                  <span className="block font-bold text-sm text-charcoal-900">Razorpay Secured Checkout</span>
                  <p className="text-xs text-neutral-500 mt-0.5">Pay securely using UPI, Credit/Debit cards, Netbanking or Wallets.</p>
                </div>
              </div>
              <CheckCircle className="w-5 h-5 text-royal-red-900 fill-royal-red-50" />
            </div>
          </div>
        </div>

        {/* Totals Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white border border-neutral-100 p-6 rounded-xl shadow-sm space-y-6 sticky top-28">
            <h3 className="font-serif text-lg font-bold text-royal-red-900 border-b pb-4">Order Checkout</h3>
            
            <div className="space-y-3.5 text-sm">
              <div className="flex justify-between text-charcoal-600 font-medium">
                <span>Items Subtotal</span>
                <span>₹{subtotal.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-charcoal-600 font-medium">
                <span>GST (12% Standard)</span>
                <span>₹{tax.toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-charcoal-600 font-medium">
                <span>Shipping Fee</span>
                <span>{shipping === 0 ? "FREE" : `₹${shipping}`}</span>
              </div>
              
              {couponCode && (
                <div className="flex justify-between text-emerald-700 font-bold">
                  <span>Applied Promo Coupon</span>
                  <span>-₹{discountAmount.toLocaleString("en-IN")}</span>
                </div>
              )}

              <hr className="border-neutral-100" />
              
              <div className="flex justify-between text-charcoal-900 font-bold text-lg">
                <span>Total Payable</span>
                <span>₹{total.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {checkoutError && (
              <div className="text-xs font-semibold text-red-700 bg-red-50 p-3 rounded border border-red-200">
                {checkoutError}
              </div>
            )}

            {couponPreviewError && (
              <div className="text-xs font-semibold text-red-700 bg-red-50 p-3 rounded border border-red-200">
                {couponPreviewError}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={loading || !selectedAddress}
              className={`w-full bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold py-4 rounded-full text-sm tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 ${
                loading ? "opacity-50 cursor-wait" : ""
              }`}
            >
              {loading ? "Initializing Secure Gateway..." : "Pay & Place Order"}
            </button>

            <div className="flex items-center gap-2 justify-center text-[9px] text-charcoal-400 font-semibold uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Razorpay Authenticity Insured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Developer Mock Payment Modal */}
      {showMockModal && mockOrderData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-md w-full p-8 rounded-2xl shadow-2xl border-t-4 border-gold-500 space-y-6 text-center">
            <div className="mx-auto bg-royal-red-50 text-royal-red-900 w-16 h-16 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 fill-royal-red-50" />
            </div>
            <div className="space-y-2">
              <h3 className="font-serif text-2xl font-bold text-charcoal-900">Razorpay Sandbox Emulator</h3>
              <p className="text-neutral-500 text-xs">
                Local development mode detected. Emulate payment verification for your handloom purchase order.
              </p>
            </div>
            
            <div className="bg-neutral-50 p-4 border rounded-xl space-y-2.5 text-left text-xs text-charcoal-700 font-medium">
              <div className="flex justify-between">
                <span>Client Name:</span>
                <span className="font-bold text-charcoal-900">{user?.first_name} {user?.last_name}</span>
              </div>
              <div className="flex justify-between">
                <span>Mock Order ID:</span>
                <span className="font-bold text-charcoal-900 select-all">{mockOrderData.razorpay_order_id}</span>
              </div>
              <div className="flex justify-between">
                <span>Final Payable:</span>
                <span className="font-bold text-royal-red-900">₹{parseFloat(mockOrderData.total_amount).toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => { setShowMockModal(false); setLoading(false); }}
                className="w-1/2 border hover:bg-neutral-50 font-bold py-3 rounded-full text-xs uppercase tracking-wider"
              >
                Cancel Payment
              </button>
              <button
                onClick={handleMockPaymentSuccess}
                className="w-1/2 bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold py-3 rounded-full text-xs uppercase tracking-wider shadow-sm"
              >
                Simulate Success
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { User, Mail, Lock, Store, Info, ShieldAlert } from "lucide-react";
import { registerUser, clearError } from "../features/authSlice";

export default function Register() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const { loading, error } = useSelector((state) => state.auth);

  // Form states
  const [activeTab, setActiveTab] = useState("CUSTOMER");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Seller shop fields
  const [shopName, setShopName] = useState("");
  const [shopDesc, setShopDesc] = useState("");
  
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      role_name: activeTab,
    };

    if (activeTab === "SELLER") {
      payload.shop_name = shopName;
      payload.shop_description = shopDesc;
    }

    try {
      await dispatch(registerUser(payload)).unwrap();
      setSuccess(true);
      setTimeout(() => {
        navigate(`/login?redirect=${encodeURIComponent(redirect)}`);
      }, 3000);
    } catch (err) {
      // Handled in auth slice error state
    }
  };

  return (
    <div className="max-w-lg w-full mx-auto py-12 px-4 space-y-8">
      <div className="text-center space-y-3">
        <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900">
          Create Your Account
        </h1>
        <p className="text-neutral-500 text-xs sm:text-sm">
          Join the Ananya community as a shopping customer or an artisan seller.
        </p>
      </div>

      <div className="bg-white border border-neutral-100 rounded-xl shadow-sm overflow-hidden">
        {/* Toggle tabs for customer and seller */}
        <div className="flex border-b text-sm font-semibold">
          <button
            onClick={() => setActiveTab("CUSTOMER")}
            className={`w-1/2 py-4 text-center transition-colors border-b-2 ${
              activeTab === "CUSTOMER"
                ? "border-royal-red-900 text-royal-red-900"
                : "border-transparent text-charcoal-400 hover:text-charcoal-700"
            }`}
          >
            Customer Account
          </button>
          <button
            onClick={() => setActiveTab("SELLER")}
            className={`w-1/2 py-4 text-center transition-colors border-b-2 ${
              activeTab === "SELLER"
                ? "border-royal-red-900 text-royal-red-900"
                : "border-transparent text-charcoal-400 hover:text-charcoal-700"
            }`}
          >
            Loom Partner / Seller
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {success ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-lg text-center font-semibold text-sm">
              Account created successfully! Redirecting you to login page...
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-xs font-semibold flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <p>
                   {error?.email?.[0]
                       ? "This email is already registered."
                        : error}
                  </p>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">First Name</label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Priya"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
                      required
                    />
                    <User className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Last Name</label>
                  <input
                    type="text"
                    placeholder="Sharma"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    placeholder="priya@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
                    required
                  />
                  <Mail className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
                    required
                  />
                  <Lock className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
                </div>
              </div>

              {/* Seller details fields */}
              {activeTab === "SELLER" && (
                <div className="space-y-4 pt-4 border-t border-neutral-100">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Shop Name</label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Varanasi Loom Weaves"
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2.5 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
                        required
                      />
                      <Store className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Loom Description</label>
                    <textarea
                      placeholder="Brief details about your heritage products, materials, and loom counts..."
                      rows={3}
                      value={shopDesc}
                      onChange={(e) => setShopDesc(e.target.value)}
                      className="w-full border p-2.5 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
                      required
                    />
                  </div>

                  <div className="bg-gold-50/50 border border-gold-100 text-gold-900 text-xs p-4 rounded-lg flex gap-2.5 leading-relaxed">
                    <Info className="w-5 h-5 shrink-0" />
                    <p className="text-charcoal-600">
                      <strong>Artisan Verification</strong>: To maintain our heritage standard, seller accounts are reviewed by administrators. You can build your catalog immediately upon approval.
                    </p>
                  </div>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold py-3.5 rounded-full text-sm tracking-wider shadow-sm transition-all"
              >
                {loading ? "Registering account..." : "Register Now"}
              </button>

              <p className="text-center text-xs text-neutral-500 font-medium">
                Already registered?{" "}
                <Link to={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-royal-red-900 font-bold hover:underline">
                  Sign In
                </Link>
              </p>
            </>
          )}
        </form>
      </div>
    </div>
  );
}

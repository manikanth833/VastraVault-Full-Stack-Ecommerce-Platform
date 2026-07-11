import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ShoppingBag, Heart, User, LogOut, Menu, X, BarChart3, ShieldCheck } from "lucide-react";
import { logout } from "../features/authSlice";
import { clearCartLocal } from "../features/cartSlice";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartItemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
  const isSeller = user?.role_name === "SELLER";
  const isAdmin = user?.role_name === "ADMIN";
  const isCustomer = isAuthenticated && !isSeller && !isAdmin;
  const isSellerDashboardPage = location.pathname.startsWith("/seller-dashboard");

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCartLocal());
    navigate("/");
  };

  const navLinkBase =
    "relative inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors";
  const navLinkClass = (isActive) =>
    `${navLinkBase} ${isActive ? "bg-royal-red-50 text-royal-red-900" : "text-charcoal-700 hover:bg-neutral-50 hover:text-royal-red-900"}`;
  const sellerDashboardNavClass = isSellerDashboardPage
    ? "inline-flex items-center gap-1 rounded-full border border-royal-red-200 bg-royal-red-900 px-4 py-2 text-sm font-semibold text-white shadow-sm"
    : "inline-flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:border-royal-red-200 hover:text-royal-red-900";
  const getSellerDisplayName = (seller) => {
    const shopName = seller?.shop_name?.trim();
    const fullName = [seller?.first_name?.trim(), seller?.last_name?.trim()].filter(Boolean).join(" ").trim();
    const emailPrefix = seller?.email?.split("@")?.[0]?.trim();
    return shopName || fullName || emailPrefix || seller?.username || "Seller Account";
  };
  const sellerDisplayName = getSellerDisplayName(user);
  const sellerAccountLink = "/seller-account";

  return (
    <nav className="sticky top-0 z-50 border-b border-royal-red-100 bg-white/90 shadow-sm backdrop-blur-md transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center">
            <Link to="/" className="flex flex-col items-center">
              <span className="font-serif text-3xl font-semibold tracking-widest text-royal-red-900 leading-none">
                ANANYA
              </span>
              <span className="text-[9px] tracking-[0.3em] text-gold-600 font-semibold uppercase mt-1">
                Heritage Sarees
              </span>
            </Link>
            {isSellerDashboardPage && (
              <span className="ml-4 hidden rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700 md:inline-flex">
                Seller Workspace
              </span>
            )}
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center space-x-2">
            <Link to="/" className={navLinkClass(location.pathname === "/")}>
              Home
            </Link>
            <Link to="/catalog" className={navLinkClass(location.pathname.startsWith("/catalog"))}>
              Collections
            </Link>
            <Link to="/catalog?category=silk-sarees" className={navLinkClass(location.search.includes("silk-sarees"))}>
              Pure Silk
            </Link>
            <Link to="/catalog?category=cotton-linen" className={navLinkClass(location.search.includes("cotton-linen"))}>
              Linen & Cotton
            </Link>
          </div>

          {/* Action Icons */}
          <div className="hidden md:flex items-center space-x-6">
            {isAdmin ? (
              <>
                <Link to="/admin-dashboard" className="flex items-center gap-1 rounded-full border border-amber-100 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800 transition-colors hover:border-royal-red-200 hover:text-royal-red-900">
                  <ShieldCheck className="w-5 h-5 text-gold-500" />
                  <span>Admin Dashboard</span>
                </Link>
              </>
            ) : isSeller ? (
              <>
                <Link
                  to="/seller-dashboard"
                  className={sellerDashboardNavClass}
                >
                  <BarChart3 className="w-5 h-5 text-gold-500" />
                  <span>Seller Dashboard</span>
                </Link>

                <Link
                  to={sellerAccountLink}
                  className="inline-flex items-center gap-3 rounded-full border border-amber-100 bg-amber-50/90 px-4 py-2.5 text-left transition-colors hover:border-royal-red-200 hover:bg-white"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-royal-red-900 text-[10px] font-semibold uppercase tracking-[0.3em] text-white">
                    {sellerDisplayName.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-charcoal-900">
                      {sellerDisplayName}
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                      Seller Account
                    </p>
                  </div>
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center rounded-full border border-neutral-200 px-4 py-2 text-sm font-semibold text-charcoal-700 transition-colors hover:border-royal-red-200 hover:text-royal-red-900"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/wishlist" className="relative text-charcoal-700 transition-colors hover:text-royal-red-900">
                  <Heart className="w-6 h-6 stroke-[1.5]" />
                </Link>

                <Link to="/cart" className="relative text-charcoal-700 transition-colors hover:text-royal-red-900">
                  <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-royal-red-900 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                {isCustomer ? (
                  <div className="flex items-center gap-4">
                    <Link to="/profile" className="inline-flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium text-charcoal-700 transition-colors hover:bg-neutral-50 hover:text-royal-red-900">
                      <User className="w-6 h-6 stroke-[1.5]" />
                      <span className="hidden lg:inline">{user?.first_name}</span>
                    </Link>
                    <button onClick={handleLogout} className="text-charcoal-500 hover:text-royal-red-900 transition-colors">
                      <LogOut className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      to="/login"
                      className="text-charcoal-700 hover:text-royal-red-900 font-medium text-sm transition-colors"
                    >
                      Sign In
                    </Link>
                    <Link
                      to="/register"
                      className="bg-royal-red-900 hover:bg-royal-red-800 text-white font-medium text-sm px-6 py-2.5 rounded-full tracking-wide transition-all shadow-sm"
                    >
                      Register
                    </Link>
                  </div>
                )}

                {isSeller && (
                  <Link to="/seller-dashboard" className={sellerDashboardNavClass}>
                    <BarChart3 className="w-5 h-5 text-gold-500" />
                    <span>{isSellerDashboardPage ? "Seller Dashboard" : "Seller Hub"}</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            {isAdmin ? (
              <Link to="/admin-dashboard" className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-amber-700">
                <ShieldCheck className="w-5 h-5" />
                Admin
              </Link>
            ) : isSeller ? (
              <Link
                to="/seller-dashboard"
                className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wider ${isSellerDashboardPage ? "text-royal-red-900" : "text-amber-700"}`}
              >
                <BarChart3 className="w-5 h-5" />
                {isSellerDashboardPage ? "Dashboard" : "Seller"}
              </Link>
            ) : (
              <Link to="/cart" className="text-charcoal-700 relative">
                <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                {cartItemCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-royal-red-900 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                    {cartItemCount}
                  </span>
                )}
              </Link>
            )}
            
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-charcoal-700 focus:outline-none">
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-royal-red-100 px-4 pt-2 pb-6 space-y-3">
          <Link to="/" onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
            Home
          </Link>
          <Link to="/catalog" onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
            Collections
          </Link>
          <Link to="/catalog?category=silk-sarees" onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
            Pure Silk
          </Link>
          <Link to="/catalog?category=cotton-linen" onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
            Linen & Cotton
          </Link>
          <hr className="border-royal-red-50" />
          {isAdmin ? (
            <>
              <Link to="/admin-dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-amber-700 hover:text-royal-red-900 text-base font-medium">
                Admin Dashboard
              </Link>
            </>
          ) : isSeller ? (
            <>
              <Link
                to="/seller-dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`block text-base font-medium ${isSellerDashboardPage ? "text-royal-red-900" : "text-amber-700"}`}
              >
                Seller Dashboard
              </Link>
              <Link to={sellerAccountLink} onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
                {sellerDisplayName}
              </Link>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-left text-charcoal-500 hover:text-royal-red-900 text-base font-medium flex items-center gap-2">
                <LogOut className="w-5 h-5" /> Logout
              </button>
            </>
          ) : isAuthenticated ? (
            <>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
                My Profile
              </Link>
              <Link to="/wishlist" onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
                Wishlist
              </Link>
              <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full text-left text-charcoal-500 hover:text-royal-red-900 text-base font-medium flex items-center gap-2">
                <LogOut className="w-5 h-5" /> Sign Out
              </button>
            </>
         ) : (
  <div className="space-y-3">
            <Link
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="block text-center border border-royal-red-900 text-royal-red-900 font-medium py-3 rounded-full text-base"
            >
      Sign In
    </Link>
    <Link
      to="/register"
      onClick={() => setMobileMenuOpen(false)}
      className="block text-center bg-royal-red-900 text-white font-medium py-3 rounded-full text-base"
    >
      Register
    </Link>
  </div>
)}
        </div>
      )}
    </nav>
  );
}

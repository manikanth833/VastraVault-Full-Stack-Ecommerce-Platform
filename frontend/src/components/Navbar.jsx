import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { ShoppingBag, Heart, User, LogOut, Menu, X, BarChart3, ShieldCheck } from "lucide-react";
import { logout } from "../features/authSlice";
import { clearCartLocal } from "../features/cartSlice";

export default function Navbar() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { cart } = useSelector((state) => state.cart);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const cartItemCount = cart?.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;

  const handleLogout = () => {
    dispatch(logout());
    dispatch(clearCartLocal());
    navigate("/");
  };

  const isSeller = user?.role_name === "SELLER";
  const isAdmin = user?.role_name === "ADMIN";
  const isCustomer = isAuthenticated && !isSeller && !isAdmin;

  return (
    <nav className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-royal-red-100 shadow-sm transition-all duration-300">
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
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex space-x-8 items-center">
            <Link to="/" className="text-charcoal-700 hover:text-royal-red-900 font-medium tracking-wide transition-colors">
              Home
            </Link>
            <Link to="/catalog" className="text-charcoal-700 hover:text-royal-red-900 font-medium tracking-wide transition-colors">
              Collections
            </Link>
            <Link to="/catalog?category=silk-sarees" className="text-charcoal-700 hover:text-royal-red-900 font-medium tracking-wide transition-colors">
              Pure Silk
            </Link>
            <Link to="/catalog?category=cotton-linen" className="text-charcoal-700 hover:text-royal-red-900 font-medium tracking-wide transition-colors">
              Linen & Cotton
            </Link>
          </div>

          {/* Action Icons */}
          <div className="hidden md:flex items-center space-x-6">
            {isAdmin ? (
              <>
                <Link to="/admin-dashboard" className="flex items-center gap-1 text-charcoal-700 hover:text-royal-red-900 transition-colors">
                  <ShieldCheck className="w-5 h-5 text-gold-500" />
                  <span className="text-xs font-semibold text-gold-600">Admin Dashboard</span>
                </Link>
              </>
            ) : isSeller ? (
              <>
                <Link to="/seller-dashboard" className="flex items-center gap-1 text-charcoal-700 hover:text-royal-red-900 transition-colors">
                  <BarChart3 className="w-5 h-5 text-gold-500" />
                  <span className="text-xs font-semibold text-gold-600">Seller Dashboard</span>
                </Link>

                <Link to="/profile" className="flex items-center gap-1 text-charcoal-700 hover:text-royal-red-900 transition-colors">
                  <User className="w-6 h-6 stroke-[1.5]" />
                  <span className="text-sm font-medium hidden lg:inline">{user?.shop_name || user?.first_name}</span>
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
                <Link to="/wishlist" className="text-charcoal-700 hover:text-royal-red-900 transition-colors relative">
                  <Heart className="w-6 h-6 stroke-[1.5]" />
                </Link>

                <Link to="/cart" className="text-charcoal-700 hover:text-royal-red-900 transition-colors relative">
                  <ShoppingBag className="w-6 h-6 stroke-[1.5]" />
                  {cartItemCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-royal-red-900 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                      {cartItemCount}
                    </span>
                  )}
                </Link>

                {isCustomer ? (
                  <div className="flex items-center gap-4">
                    <Link to="/profile" className="flex items-center gap-1 text-charcoal-700 hover:text-royal-red-900 transition-colors">
                      <User className="w-6 h-6 stroke-[1.5]" />
                      <span className="text-sm font-medium hidden lg:inline">{user?.first_name}</span>
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
                  <Link to="/seller-dashboard" className="flex items-center gap-1 text-charcoal-700 hover:text-royal-red-900 transition-colors">
                    <BarChart3 className="w-5 h-5 text-gold-500" />
                    <span className="text-xs font-semibold text-gold-600">Seller Hub</span>
                  </Link>
                )}
              </>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center space-x-4">
            {isAdmin ? (
              <Link to="/admin-dashboard" className="text-gold-600 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                <ShieldCheck className="w-5 h-5" />
                Admin
              </Link>
            ) : isSeller ? (
              <Link to="/seller-dashboard" className="text-gold-600 flex items-center gap-1 text-xs font-semibold uppercase tracking-wider">
                <BarChart3 className="w-5 h-5" />
                Seller
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
              <Link to="/admin-dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-gold-600 hover:text-royal-red-900 text-base font-medium">
                Admin Dashboard
              </Link>
            </>
          ) : isSeller ? (
            <>
              <Link to="/seller-dashboard" onClick={() => setMobileMenuOpen(false)} className="block text-gold-600 hover:text-royal-red-900 text-base font-medium">
                Seller Dashboard
              </Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-charcoal-700 hover:text-royal-red-900 text-base font-medium">
                {user?.shop_name || user?.first_name || "Seller Profile"}
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

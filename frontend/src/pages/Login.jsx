import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { Mail, Lock, ShieldAlert, Sparkles } from "lucide-react";
import { login, clearError } from "../features/authSlice";

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Clean error messages on mount
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Handle redirects on success
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect);
    }
  }, [isAuthenticated, navigate, redirect]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) return;
    dispatch(login({ email, password }));
  };

  return (
    <div className="max-w-md w-full mx-auto py-16 px-4 space-y-8">
      <div className="text-center space-y-3">
        <span className="text-gold-500 uppercase tracking-[0.3em] font-semibold text-xs flex items-center justify-center gap-1.5">
          <Sparkles className="w-4 h-4 fill-gold-500" /> Welcome Back
        </span>
        <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900">
          Sign In to Your Account
        </h1>
        <p className="text-neutral-500 text-xs sm:text-sm">
          Access your drapes collections, wishlists, and order histories.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-neutral-100 p-8 rounded-xl shadow-sm space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg text-xs font-semibold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" /> {error}
          </div>
        )}

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Email Address</label>
          <div className="relative">
            <input
              type="email"
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
              required
            />
            <Mail className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-charcoal-700 uppercase tracking-wider">Password</label>
            <a href="#" className="text-xs font-semibold text-royal-red-900 hover:underline">Forgot?</a>
          </div>
          <div className="relative">
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 pr-4 py-3 border border-neutral-200 rounded-lg text-sm bg-white outline-none focus:border-royal-red-900"
              required
            />
            <Lock className="absolute left-3 top-3.5 w-4 h-4 text-neutral-400" />
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-royal-red-900 hover:bg-royal-red-800 text-white font-bold py-3.5 rounded-full text-sm tracking-wider shadow-sm transition-all"
        >
          {loading ? "Authenticating..." : "Sign In"}
        </button>

        <p className="text-center text-xs text-neutral-500 font-medium">
          Don't have an account?{" "}
          <Link to={`/register?redirect=${encodeURIComponent(redirect)}`} className="text-royal-red-900 font-bold hover:underline">
            Register Here
          </Link>
        </p>
      </form>
    </div>
  );
}

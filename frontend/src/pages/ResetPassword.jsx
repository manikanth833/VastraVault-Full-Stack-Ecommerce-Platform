import React, { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, Check, Eye, EyeOff, Lock, Sparkles, ShieldCheck } from "lucide-react";
import api from "../services/api";

function getPasswordChecks(password) {
  return {
    minLength: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function formatError(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (Array.isArray(error)) return error.join(" ");
  if (typeof error === "object") {
    return Object.values(error)
      .flat()
      .map((entry) => (Array.isArray(entry) ? entry.join(" ") : String(entry)))
      .join(" ");
  }
  return "Unable to reset your password right now.";
}

export default function ResetPassword() {
  const navigate = useNavigate();
  const { uid, token } = useParams();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const checks = useMemo(() => getPasswordChecks(password), [password]);
  const allChecksMet = Object.values(checks).every(Boolean);
  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const canSubmit = Boolean(uid && token && allChecksMet && passwordsMatch && !loading);
  const matchMessage = confirmPassword
    ? passwordsMatch
      ? "Passwords match"
      : "Passwords do not match"
    : "";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const res = await api.post("/api/auth/reset-password/", {
        uid,
        token,
        password,
      });
      setSuccess(res.data?.detail || "Password reset successfully.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (err) {
      setError(formatError(err.response?.data?.password || err.response?.data?.token || err.response?.data?.detail || err.response?.data));
    } finally {
      setLoading(false);
    }
  };

  const RuleItem = ({ met, label }) => (
    <div className={`flex items-center gap-2 text-xs font-medium ${met ? "text-emerald-700" : "text-neutral-500"}`}>
      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${met ? "bg-emerald-100" : "bg-neutral-100"}`}>
        <Check className="h-3 w-3" />
      </span>
      {label}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="overflow-hidden rounded-[30px] border border-neutral-100 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2b0f16_0%,#5f1d28_52%,#1f0a10_100%)] px-8 py-10 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.2),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_26%)]" />
            <div className="relative space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-300 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 fill-gold-300" />
                Reset Access
              </span>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl font-bold tracking-wide">
                  Create a new password
                </h1>
                <p className="max-w-md text-sm leading-7 text-neutral-200">
                  Use a strong password to protect your account and keep your saree shopping or seller workspace secure.
                </p>
              </div>

              <div className="space-y-3 rounded-[24px] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold-300">
                  Password rules
                </p>
                <div className="space-y-2">
                  <RuleItem met={checks.minLength} label="Minimum 8 characters" />
                  <RuleItem met={checks.uppercase} label="At least one uppercase letter" />
                  <RuleItem met={checks.lowercase} label="At least one lowercase letter" />
                  <RuleItem met={checks.number} label="At least one number" />
                  <RuleItem met={checks.special} label="At least one special character" />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />
                  <p className="text-xs leading-6 text-neutral-200">
                    Your password is hashed securely. The reset link is time-limited and can only be used once.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-8 sm:px-8">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
                Password reset
              </p>
              <h2 className="font-serif text-3xl font-bold text-royal-red-900">
                Reset your password
              </h2>
              <p className="text-sm leading-6 text-neutral-500">
                Choose a secure password and confirm it below.
              </p>
            </div>

            {success && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                {success}
              </div>
            )}
            {error && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">New Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-9 pr-12 text-sm outline-none transition-colors focus:border-royal-red-900"
                  placeholder="Enter a strong password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-3.5 text-neutral-400 transition-colors hover:text-royal-red-900"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">Confirm Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-9 pr-12 text-sm outline-none transition-colors focus:border-royal-red-900"
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-3.5 text-neutral-400 transition-colors hover:text-royal-red-900"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {confirmPassword && (
                <p className={`text-xs font-semibold ${passwordsMatch ? "text-emerald-700" : "text-rose-700"}`}>
                  {matchMessage}
                </p>
              )}
            </div>

            <div className="space-y-2 rounded-2xl border border-neutral-100 bg-neutral-50 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-neutral-400">Strength check</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <RuleItem met={checks.minLength} label="Minimum length" />
                <RuleItem met={checks.uppercase} label="Uppercase letter" />
                <RuleItem met={checks.lowercase} label="Lowercase letter" />
                <RuleItem met={checks.number} label="Number" />
                <RuleItem met={checks.special} label="Special character" />
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-royal-red-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Updating password..." : "Reset Password"}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </button>

            <p className="text-center text-xs font-medium text-neutral-500">
              Need to go back?{" "}
              <Link to="/login" className="font-bold text-royal-red-900 hover:underline">
                Return to Sign In
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

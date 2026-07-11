import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import api from "../services/api";

function formatError(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  if (Array.isArray(error)) return error.join(" ");

  return Object.values(error)
    .flat()
    .map((entry) => (Array.isArray(entry) ? entry.join(" ") : String(entry)))
    .join(" ");
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const res = await api.post("/api/auth/forgot-password/", { email });
      setMessage(res.data?.detail || "If an account exists with this email, password reset instructions have been sent.");
    } catch (err) {
      setError(formatError(err.response?.data?.detail || err.response?.data) || "Unable to process your request right now.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg w-full mx-auto px-4 py-16">
      <div className="space-y-8 rounded-[28px] border border-neutral-100 bg-white p-8 shadow-sm">
        <div className="space-y-3 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-gold-100 bg-gold-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-700">
            <Sparkles className="h-4 w-4 fill-gold-500" />
            Password Recovery
          </span>
          <h1 className="font-serif text-3xl font-bold tracking-wide text-royal-red-900">
            Forgot your password?
          </h1>
          <p className="text-sm leading-6 text-neutral-500">
            Enter your account email and we&apos;ll send secure password reset instructions.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {message && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
              {message}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">Email Address</label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-neutral-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@email.com"
                className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-9 pr-4 text-sm outline-none transition-colors focus:border-royal-red-900"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-royal-red-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Sending reset link..." : "Send Reset Link"}
            {!loading && <ArrowRight className="h-4 w-4" />}
          </button>

          <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
              <p className="text-xs leading-6 text-neutral-600">
                For security, we never reveal whether an account exists. If the email is registered, reset instructions will be sent.
              </p>
            </div>
          </div>

          <p className="text-center text-xs font-medium text-neutral-500">
            Remember your password?{" "}
            <Link to="/login" className="font-bold text-royal-red-900 hover:underline">
              Back to Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

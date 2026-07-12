import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, Mail, RotateCcw, Sparkles, ShieldCheck } from "lucide-react";
import api from "../services/api";

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
  return "Unable to resend the verification email right now.";
}

export default function EmailVerificationPending() {
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get("email") || "", [searchParams]);

  const [email, setEmail] = useState(initialEmail);
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [verifySuccess, setVerifySuccess] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [otp, setOtp] = useState("");
  const [emailKnown, setEmailKnown] = useState(Boolean(initialEmail));

  const hasKnownEmail = emailKnown;

  useEffect(() => {
    if (!initialEmail) return;
    setEmail(initialEmail);
    setEmailKnown(true);
  }, [initialEmail]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const interval = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) {
      setResendError("Please enter the email address used to register.");
      return;
    }

    setResendLoading(true);
    setResendError("");
    setResendMessage("");
    setVerifyError("");

    try {
      const res = await api.post("/api/auth/resend-verification/", { email });
      setResendMessage(res.data?.detail || "If an account exists with this email, verification instructions have been sent.");
      setEmailKnown(true);
      setCooldown(45);
    } catch (err) {
      setResendError(formatError(err.response?.data?.detail || err.response?.data));
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!email) {
      setVerifyError("Please enter the email address used to register.");
      return;
    }
    if (!otp) {
      setVerifyError("Enter the 6-digit code exactly as received.");
      return;
    }

    setVerifyLoading(true);
    setVerifyError("");
    setVerifySuccess("");

    try {
      await api.post("/api/auth/verify-email-otp/", { email, otp });
      setVerifySuccess("Email verified successfully!");
      setOtp("");
    } catch (err) {
      setVerifyError(formatError(err.response?.data?.detail || err.response?.data));
    } finally {
      setVerifyLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <div className="overflow-hidden rounded-[30px] border border-neutral-100 bg-white shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#2b0f16_0%,#5f1d28_52%,#1f0a10_100%)] px-8 py-10 text-white">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.22),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.08),transparent_26%)]" />
            <div className="relative space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-300 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 fill-gold-300" />
                Verification Pending
              </span>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl font-bold tracking-wide">
                  Check your inbox
                </h1>
                <p className="max-w-md text-sm leading-7 text-neutral-200">
                  We&apos;ve sent a verification link to your email address. Confirming it unlocks the full Ananya Heritage Sarees account experience.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />
                  <p className="text-xs leading-6 text-neutral-200">
                    Keep this page open if needed. You can resend the verification email after the cooldown finishes.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="space-y-6 px-6 py-8 sm:px-8"
          >
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
                Email verification
              </p>
              <h2 className="font-serif text-3xl font-bold text-royal-red-900">
                Verify your account
              </h2>
              <p className="text-sm leading-6 text-neutral-500">
                We&apos;ve sent a verification link to{" "}
                <span className="font-semibold text-charcoal-900">{email || "your email address"}</span>.
                Please check your inbox.
              </p>
            </div>

            {resendMessage && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                {resendMessage}
              </div>
            )}
            {resendError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {resendError}
              </div>
            )}
            {verifySuccess && (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                <div className="space-y-2">
                  <p className="font-semibold">{verifySuccess}</p>
                  <p>
                    <Link to="/login" className="font-bold text-emerald-900 underline underline-offset-2">
                      Continue to sign in
                    </Link>
                  </p>
                </div>
              </div>
            )}
            {verifyError && (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                {verifyError}
              </div>
            )}

            <form onSubmit={handleResend} className="space-y-4">
              {!hasKnownEmail && (
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
              )}

              <button
                type="submit"
                disabled={resendLoading || cooldown > 0}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-royal-red-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {resendLoading
                  ? "Sending verification email..."
                  : cooldown > 0
                    ? `Resend available in ${cooldown}s`
                    : "Resend verification email"}
                {!resendLoading && cooldown === 0 && <RotateCcw className="h-4 w-4" />}
              </button>
            </form>

            <div className="flex items-center gap-4 py-1">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-neutral-400">
                or enter the 6-digit code from your email
              </p>
              <div className="h-px flex-1 bg-gradient-to-r from-transparent via-neutral-200 to-transparent" />
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-charcoal-700">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="123456"
                  className="w-full rounded-2xl border border-neutral-200 bg-white px-4 py-4 text-2xl tracking-[0.3em] text-center font-semibold outline-none transition-colors placeholder:tracking-[0.3em] focus:border-royal-red-900 focus:ring-2 focus:ring-royal-red-900/10"
                />
              </div>

              <button
                type="submit"
                disabled={verifyLoading || !email}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-600 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-gold-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {verifyLoading ? "Verifying code..." : "Verify Code"}
              </button>
            </form>

            <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-600" />
                <p className="text-xs leading-6 text-neutral-600">
                  Your account is created. Verification is the final step before sign-in.
                </p>
              </div>
            </div>

            <p className="text-center text-xs font-medium text-neutral-500">
              Already verified?{" "}
              <Link to="/login" className="font-bold text-royal-red-900 hover:underline">
                Back to Sign In
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

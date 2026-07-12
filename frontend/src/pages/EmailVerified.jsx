import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Mail, RotateCcw, Sparkles, ShieldCheck } from "lucide-react";
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
  return "Unable to verify your email right now.";
}

export default function EmailVerified() {
  const navigate = useNavigate();
  const { uid, token } = useParams();

  const [status, setStatus] = useState("loading");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [resendError, setResendError] = useState("");
  const [resendLoading, setResendLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const interval = setInterval(() => {
      setCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  useEffect(() => {
    let mounted = true;

    const verifyEmail = async () => {
      try {
        const res = await api.post("/api/auth/verify-email/", { uid, token });
        if (!mounted) return;
        setStatus("success");
        setMessage(res.data?.detail || "Email verified successfully.");
      } catch (err) {
        if (!mounted) return;
        setStatus("invalid");
        setError(formatError(err.response?.data?.token || err.response?.data?.detail || err.response?.data));
      }
    };

    if (uid && token) {
      verifyEmail();
    } else {
      setStatus("invalid");
      setError("This verification link is invalid or has expired.");
    }

    return () => {
      mounted = false;
    };
  }, [uid, token]);

  const invalidMessage = useMemo(
    () => error || "This verification link is invalid or has expired.",
    [error]
  );

  const handleResend = async (e) => {
    e.preventDefault();
    if (!email) {
      setResendError("Please enter the email address used to register.");
      return;
    }

    setResendLoading(true);
    setResendError("");
    setResendMessage("");

    try {
      const res = await api.post("/api/auth/resend-verification/", { email });
      setResendMessage(res.data?.detail || "If an account exists with this email, verification instructions have been sent.");
      setCooldown(45);
    } catch (err) {
      setResendError(formatError(err.response?.data?.detail || err.response?.data));
    } finally {
      setResendLoading(false);
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
                Email Verification
              </span>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl font-bold tracking-wide">
                  {status === "success" ? "Verified" : "Confirm your account"}
                </h1>
                <p className="max-w-md text-sm leading-7 text-neutral-200">
                  Verification keeps your Ananya Heritage Sarees account secure and unlocks the full login and account experience.
                </p>
              </div>

              <div className="rounded-[24px] border border-white/12 bg-white/8 p-5 backdrop-blur-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold-300" />
                  <p className="text-xs leading-6 text-neutral-200">
                    A verification link can only be used once and expires automatically.
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
            {status === "loading" && (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-gold-600">
                    Verifying email
                  </p>
                  <h2 className="font-serif text-3xl font-bold text-royal-red-900">
                    Checking your link
                  </h2>
                  <p className="text-sm leading-6 text-neutral-500">
                    Please wait while we confirm your verification link.
                  </p>
                </div>
                <div className="flex items-center gap-3 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-4 text-sm text-charcoal-600">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-royal-red-900/20 border-t-royal-red-900" />
                  Verifying your email address...
                </div>
              </>
            )}

            {status === "success" && (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-emerald-600">
                    Verification complete
                  </p>
                  <h2 className="font-serif text-3xl font-bold text-emerald-800">
                    Email verified!
                  </h2>
                  <p className="text-sm leading-6 text-neutral-500">
                    You can now log in and access full account features.
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm leading-6 text-emerald-800">
                  {message}
                </div>

                <div className="rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                    <p className="text-xs leading-6 text-neutral-600">
                      Your account verification is complete. Continue to sign in.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-royal-red-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-royal-red-800"
                >
                  Go to Sign In
                  <ArrowRight className="h-4 w-4" />
                </button>

                <p className="text-center text-xs font-medium text-neutral-500">
                  Need help?{" "}
                  <Link to="/forgot-password" className="font-bold text-royal-red-900 hover:underline">
                    Reset your password
                  </Link>
                </p>
              </>
            )}

            {status === "invalid" && (
              <>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-rose-600">
                    Link expired
                  </p>
                  <h2 className="font-serif text-3xl font-bold text-royal-red-900">
                    This verification link is invalid or has expired.
                  </h2>
                  <p className="text-sm leading-6 text-neutral-500">
                    Request a new verification email using the address you registered with.
                  </p>
                </div>

                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-800">
                  {invalidMessage}
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

                <form onSubmit={handleResend} className="space-y-4">
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

                <p className="text-center text-xs font-medium text-neutral-500">
                  Remembered your password?{" "}
                  <Link to="/login" className="font-bold text-royal-red-900 hover:underline">
                    Back to Sign In
                  </Link>
                </p>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useState } from "react";

export default function PremiumImage({
  src,
  alt,
  className = "",
  fallbackTitle = "ANANYA",
  fallbackSubtitle = "Heritage Sarees",
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  if (!src || hasError) {
    return (
      <div
        className={`relative overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.18),transparent_38%),linear-gradient(135deg,#2b0f16,#5f1d28_48%,#1f0a10)] ${className}`}
        aria-label={alt}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.12),transparent_30%)]" />
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-500 via-gold-300 to-transparent" />
        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(255,255,255,0.05),transparent_36%,rgba(255,255,255,0.06))]" />
        <div className="relative flex h-full w-full items-center justify-center p-6 text-center text-white">
          <div className="max-w-[85%] space-y-2">
            <div className="mx-auto h-12 w-12 rounded-full border border-white/15 bg-white/8 backdrop-blur-sm" />
            <p className="font-serif text-lg font-semibold tracking-[0.18em] text-gold-300">
              {fallbackTitle}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-neutral-200/90">
              {fallbackSubtitle}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setHasError(true)}
    />
  );
}

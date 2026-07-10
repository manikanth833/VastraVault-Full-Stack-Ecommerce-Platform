import React from "react";

export function ProductCardSkeleton() {
  return (
    <div className="bg-white border border-neutral-100 rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
      <div className="aspect-[3/4] skeleton-shimmer bg-neutral-200 w-full" />
      <div className="p-5 flex flex-col flex-grow space-y-3">
        <div className="h-3 w-1/4 skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-5 w-3/4 skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-4 w-1/2 skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-6 w-1/3 mt-4 skeleton-shimmer bg-neutral-200 rounded" />
      </div>
    </div>
  );
}

export function ProductCatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProductDetailSkeleton() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
      <div className="aspect-[3/4] skeleton-shimmer bg-neutral-200 w-full rounded-lg" />
      <div className="space-y-6">
        <div className="h-4 w-1/4 skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-10 w-3/4 skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-6 w-1/3 skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-20 w-full skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-10 w-1/2 skeleton-shimmer bg-neutral-200 rounded" />
        <div className="h-12 w-full mt-8 skeleton-shimmer bg-neutral-200 rounded" />
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-28 bg-neutral-200 rounded-lg" />
        ))}
      </div>
      <div className="h-80 bg-neutral-200 rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="h-64 bg-neutral-200 rounded-lg" />
        <div className="h-64 bg-neutral-200 rounded-lg" />
      </div>
    </div>
  );
}

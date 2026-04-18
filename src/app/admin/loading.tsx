/**
 * TeraLoka — Admin Loading Skeleton
 * Phase 2 · Batch 6 — Dashboard Overview
 * ------------------------------------------------------------
 * Next.js convention: `loading.tsx` otomatis render saat page
 * loading (Suspense boundary). Dipakai saat:
 * - First navigation ke /admin (kalau page pakai async component)
 * - Route transition antar segment admin
 *
 * Current admin/page.tsx adalah 'use client' + fetch di useEffect,
 * jadi sebenarnya `loading.tsx` tidak auto-fire. Tapi tetap disediakan
 * untuk Phase 3+ saat kita migrate ke RSC (React Server Components)
 * dengan data fetching di server.
 *
 * Sementara ini, juga dipakai sebagai visual reference kalau route
 * lain (misal /admin/users) trigger loading state.
 */

export default function AdminLoading() {
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome header skeleton */}
      <div className="space-y-2">
        <div className="h-8 w-72 rounded-lg bg-surface-muted animate-pulse" />
        <div className="h-4 w-96 rounded bg-surface-muted animate-pulse" />
      </div>

      {/* KPI row — 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 md:gap-4">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-xl bg-surface border border-border p-4 space-y-3"
          >
            <div className="h-11 w-11 rounded-xl bg-surface-muted animate-pulse" />
            <div className="h-9 w-16 rounded bg-surface-muted animate-pulse" />
            <div className="space-y-1.5">
              <div className="h-3 w-20 rounded bg-surface-muted animate-pulse" />
              <div className="h-2.5 w-28 rounded bg-surface-muted animate-pulse" />
            </div>
          </div>
        ))}
      </div>

      {/* Service Health Strip skeleton */}
      <div className="rounded-xl bg-surface border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="h-4 w-32 rounded bg-surface-muted animate-pulse" />
          <div className="h-3 w-40 rounded bg-surface-muted animate-pulse" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-14 rounded-lg bg-surface-muted animate-pulse"
            />
          ))}
        </div>
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 h-48 rounded-xl bg-surface-muted animate-pulse" />
        <div className="lg:col-span-4 h-48 rounded-xl bg-surface border border-border animate-pulse" />
        <div className="lg:col-span-3 h-48 rounded-xl bg-surface border border-border animate-pulse" />
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-7 h-72 rounded-xl bg-surface border border-border animate-pulse" />
        <div className="lg:col-span-5 h-72 rounded-xl bg-surface border border-border animate-pulse" />
      </div>

      {/* Insight row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-56 rounded-xl bg-surface border border-border animate-pulse" />
        <div className="h-56 rounded-xl bg-surface border border-border animate-pulse" />
      </div>
    </div>
  );
}

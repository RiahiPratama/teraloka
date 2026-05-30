// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — Route Loading Skeleton (Phase 4 Polish v14.0)
// PATH: src/app/(public)/bakabar/loading.tsx
// ────────────────────────────────────────────────────────────────
// Tampil otomatis saat Server Component page.tsx lagi fetch artikel
// (cold load + ganti tab kategori). Nutup blank-screen + kasih
// feedback transisi. Skeleton fokus above-the-fold (leaderboard + hero).
// ════════════════════════════════════════════════════════════════

export default function Loading() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex gap-5 items-start justify-center pt-3">

          <main className="flex-1 min-w-0" style={{ maxWidth: 1000 }}>

            {/* Top leaderboard skeleton */}
            <div className="w-full bg-gray-100 rounded-md animate-pulse mt-2" style={{ height: 90 }} />

            {/* Hero + sidebar skeleton */}
            <div className="mt-8 grid gap-7" style={{ gridTemplateColumns: '1fr 320px' }}>
              <div>
                <div className="w-full bg-gray-100 rounded-md animate-pulse" style={{ aspectRatio: '16/9' }} />
                <div className="h-6 bg-gray-100 rounded mt-5 animate-pulse" />
                <div className="h-4 bg-gray-100 rounded mt-3 w-3/4 animate-pulse" />
                <div className="h-px bg-gray-200 my-5" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="w-full bg-gray-100 rounded-md animate-pulse" style={{ aspectRatio: '16/9' }} />
                  <div className="w-full bg-gray-100 rounded-md animate-pulse" style={{ aspectRatio: '16/9' }} />
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="w-full bg-gray-100 rounded-xl animate-pulse" style={{ aspectRatio: '6/5' }} />
                <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-28 bg-gray-100 rounded-xl animate-pulse" />
              </div>
            </div>

          </main>

        </div>
      </div>
    </div>
  );
}

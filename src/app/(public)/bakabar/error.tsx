'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Route Error Boundary
// PATH: src/app/(public)/bakabar/error.tsx
// ────────────────────────────────────────────────────────────────
// Tangkap error tak terduga di route /bakabar (selain timeout fetch
// yang udah graceful). Ganti layar crash mentah jadi tampilan branded
// + tombol "Coba lagi" (reset) + link balik beranda. 'use client' wajib
// (Next.js error boundary).
// ════════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import Link from 'next/link';

export default function BakabarError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Observability — digest = id error server-side (kalau ada).
    console.error('[BAKABAR] route error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50 text-3xl">
          ⚠️
        </div>
        <h1
          className="text-2xl font-bold text-gray-900 mb-2"
          style={{ fontFamily: 'var(--font-lora), Georgia, serif' }}
        >
          Ada gangguan sebentar
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-6">
          Halaman ini gagal dimuat. Biasanya cuma sementara — coba muat ulang.
          Kalau masih bermasalah, kembali ke beranda BAKABAR.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center px-5 py-2.5 rounded-lg bg-[#0F4C81] text-white text-sm font-bold hover:bg-[#0d4068] transition-colors"
          >
            Coba lagi
          </button>
          <Link
            href="/bakabar"
            className="inline-flex items-center px-5 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 transition-colors"
          >
            Ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}

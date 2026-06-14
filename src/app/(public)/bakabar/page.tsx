// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — v17.0 (WS-5d — Hero-First Streaming Shell)
// PATH: src/app/(public)/bakabar/page.tsx
// ────────────────────────────────────────────────────────────────
// v17.0 UPDATE (13 Jun 2026, WS-5d — Streaming Refactor):
//   MASALAH (v16.0): `await Promise.all([~40 fetch])` jalan di body page
//     SEBELUM render apa-apa → server NAHAN seluruh HTML sampai fetch
//     paling lambat kelar → user lihat layar putih lama → blup semua bareng.
//     <Suspense> v16.0 dekoratif (yang suspend = page sendiri, fallback
//     gak pernah dipakai buat streaming).
//
//   FIX: HERO-FIRST STREAMING.
//     1. await HANYA fetch hero (1 call, ~0.6s) → render hero + ads
//        (skyscraper/leaderboard self-fetch) → HTML hero FLUSH DULUAN.
//     2. Below-fold (13 region + viral + campaign + report) pindah ke
//        <BelowFold> di dalam <Suspense> NYATA → STREAM nyusul, tiap
//        region punya boundary sendiri (urut atas-ke-bawah).
//     → User lihat hero+ads instan, region nyusul satu-satu (skeleton →
//        isi), BUKAN putih-lalu-nyembur-bareng.
//
//   🛡️ Hero TETAP HeroWithSidebar ('use client') — carousel TIDAK disentuh.
//      Slide-0 udah paint dari SSR (currentSlide=0 → translateX(0)), jadi
//      cabut-ke-server-component TIDAK perlu (itu refactor LCP terpisah).
//   🛡️ §2 timeout (9s artikel / 3.5s sekunder) dipertahankan di bakabar-fetch.
//   🛡️ Nav (type/location/q) cuma pengaruh HERO — region below-fold TIDAK
//      bergantung searchParams (perilaku v16.0 dijaga persis).
//
//   v16.0 (4 Jun): below-fold fetch → server (di BakabarShell, kini dihapus).
//   v14.0 (31 Mei): Opsi B RSC split — hero render dari server slides.
// ════════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import { preload } from 'react-dom';

import BelowFold from './BelowFold';
import HeroWithSidebar from '@/components/bakabar/HeroWithSidebar';
import DCASkyscraper from '@/components/bakabar/DCASkyscraper';
import DCATopLeaderboard from '@/components/bakabar/DCATopLeaderboard';

import { HERO_CAROUSEL_SLIDES, TERPOPULER_LIST } from '@/components/bakabar/region-data';
import type { HeroSlide, DummyArticle } from '@/components/bakabar/region-data';
import { resolveNav, fetchHeroArticles, fetchTerpopuler, toCarouselArticle } from '@/components/bakabar/bakabar-fetch';

type SearchParams = Record<string, string | string[] | undefined>;

// ─── Fallback below-fold (tampil ~0.5s saat campaign+report di-fetch) ──
// Sesudah ini, BelowFold render skeleton PER region (boundary sendiri).
function BelowFoldFallback() {
  return (
    <div aria-hidden="true">
      {[0, 1].map((i) => (
        <section key={i} className="my-12">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-[30px] rounded-sm" style={{ background: '#8B5CF6' }} />
            <div className="h-7 w-40 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="grid gap-5 items-start grid-cols-1 lg:grid-cols-3">
            <div className="w-full bg-gray-100 rounded-lg animate-pulse" style={{ aspectRatio: '4 / 5' }} />
            <div className="w-full bg-gray-100 rounded-lg animate-pulse" style={{ minHeight: 280 }} />
            <div className="w-full bg-gray-100 rounded-lg animate-pulse" style={{ minHeight: 280 }} />
          </div>
        </section>
      ))}
    </div>
  );
}

export default async function BakabarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { type, location, q } = resolveNav(sp);

  // 🔑 await hero + terpopuler (PARALEL) → flush cepat. Below-fold di-stream.
  // Terpopuler timeout 3.5s < hero 9s → gak nambah wall-clock worst-case.
  const [heroRaw, terpopulerFetched] = await Promise.all([
    fetchHeroArticles(type, location, q),
    fetchTerpopuler(5),
  ]);
  // 🛡️ Fallback statis kalau API kosong/gagal/521 → sidebar GAK PERNAH kosong.
  const terpopuler = terpopulerFetched.length ? terpopulerFetched : TERPOPULER_LIST;

  // Hero slide[idx] di-override dgn artikel asli kalau ada; sisanya fallback
  // ke HERO_CAROUSEL_SLIDES (statis) → hero TIDAK PERNAH kosong.
  const HERO_COUNT = HERO_CAROUSEL_SLIDES.length;
  const slides: HeroSlide[] = HERO_CAROUSEL_SLIDES.map((slide, idx) => {
    const heroReal = heroRaw[idx];
    const secStart = HERO_COUNT + idx * 2;
    const secReal = heroRaw.slice(secStart, secStart + 2).map(toCarouselArticle);
    return {
      ...slide,
      hero: heroReal ? toCarouselArticle(heroReal) : slide.hero,
      secondary: secReal.length === 2 ? (secReal as [DummyArticle, DummyArticle]) : slide.secondary,
    };
  });

  // PERF (WS-5c): preload gambar LCP (hero slide-0). React 19 emit
  // <link rel=preload as=image fetchpriority=high> ke <head> sebelum render.
  const lcpImage = slides[0]?.hero?.cover_image_url;
  if (lcpImage) {
    preload(lcpImage, { as: 'image', fetchPriority: 'high' });
  }

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      <div className="max-w-[1400px] mx-auto px-4">
        <div className="flex gap-5 items-start justify-center pt-3">

          <DCASkyscraper side="left" />

          <main className="flex-1 min-w-0" style={{ maxWidth: 1000 }} data-bakabar-content>

            <DCATopLeaderboard />

            {/* ── HERO + ADS sidebar — DI LUAR Suspense → FLUSH DULUAN ── */}
            <HeroWithSidebar slides={slides} terpopuler={terpopuler} />

            {/* ── BELOW-FOLD — STREAM nyusul (region per-boundary) ────── */}
            <Suspense fallback={<BelowFoldFallback />}>
              <BelowFold />
            </Suspense>

          </main>

          <DCASkyscraper side="right" />

        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// BAKABAR — Below-Fold Streaming Container  [L5-BAKABAR-BELOW-FOLD]
// PATH: src/app/(public)/bakabar/BelowFold.tsx
// ────────────────────────────────────────────────────────────────
// WS-5d (13 Jun 2026 — Streaming Refactor):
//   Server Component async. Dirender DI DALAM <Suspense> di page.tsx,
//   SETELAH hero. Tugas:
//     1. Fetch campaign + report SEKALI (2 call cepat) → hitung
//        house-assignment per region (index-derivable, hasil identik).
//     2. Map REGIONS → tiap region dibungkus <Suspense> SENDIRI →
//        <RegionServer> fetch + render independen. Region nyembur
//        urut atas-ke-bawah; yang cold (halbar ~1.7s) skeleton dulu,
//        nyusul, TANPA nge-block region lain.
//     3. Banner sisipan (idx 0 → political, idx 1 → inline), service
//        carousel, section Viral, newsletter — URUTAN & KOMPONEN
//        IDENTIK dengan BakabarShell lama. Nol ADS/layanan hilang.
//
//   🛡️ Section Viral: slug di luar REGIONS → TIDAK pass stackAds →
//      DCAStackBanner fallback fetch sendiri (perilaku lama, defense in depth).
// ════════════════════════════════════════════════════════════════

import { Suspense, Fragment } from 'react';

import RegionServer from '@/components/bakabar/RegionServer';
import RegionSection from '@/components/bakabar/RegionSection';
import LaIndieMoviePoliticalBanner from '@/components/bakabar/LaIndieMoviePoliticalBanner';
import LaIndieMovieServiceCarousel from '@/components/bakabar/LaIndieMovieServiceCarousel';
import DCAInlineBanner from '@/components/bakabar/DCAInlineBanner';
import WANewsletterWidget from '@/components/WANewsletterWidget';

import { REGIONS } from '@/components/bakabar/region-data';
import { VIRAL_MALUT } from '@/components/bakabar/viral-malut-data';
import type { RegionConfig } from '@/components/bakabar/region-data';
import {
  fetchCampaigns,
  fetchReports,
  fetchList,
  toRegionArticle,
  computeHouseAssignment,
} from '@/components/bakabar/bakabar-fetch';

// ─── Skeleton 1 region (dipakai sbg Suspense fallback per region) ──
// Tinggi & struktur niru RegionSection (header + grid 3 kolom) supaya
// gak ada layout shift pas konten asli masuk. Reserve, bukan kosong.
function RegionSkeleton({ region }: { region: RegionConfig }) {
  return (
    <section className="my-12" aria-hidden="true">
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
  );
}

// ─── Section Viral (server) — artikel source=social, di luar REGIONS ──
async function ViralServer() {
  const rawViral = await fetchList('source=social', 8);
  const viral = rawViral.map(toRegionArticle);
  if (!viral.length) return null; // no dummy — skip kalau kosong

  const liveViral: RegionConfig = {
    ...VIRAL_MALUT,
    featured: viral[0],
    trending_list: viral.slice(1),
  };

  // hideWeather (non-geografis); houseSlot 'ads'; TANPA stackAds →
  // DCAStackBanner fallback fetch sendiri (1 call, perilaku lama).
  return <RegionSection region={liveViral} houseSlot="ads" hideWeather />;
}

export default async function BelowFold() {
  // Campaign + report di-fetch SEKALI (cepat) → dasar house-assignment.
  const [campaigns, reports] = await Promise.all([fetchCampaigns(), fetchReports()]);

  return (
    <>
      {REGIONS.map((region, idx) => {
        const house = computeHouseAssignment(idx, campaigns, reports);
        return (
          <Fragment key={region.slug}>
            {/* Tiap region = boundary streaming sendiri → nyembur independen */}
            <Suspense fallback={<RegionSkeleton region={region} />}>
              <RegionServer region={region} house={house} />
            </Suspense>

            {/* Banner sisipan — IDENTIK posisi dgn BakabarShell lama */}
            {idx === 0 && <LaIndieMoviePoliticalBanner />}
            {idx === 1 && <DCAInlineBanner />}
          </Fragment>
        );
      })}

      <LaIndieMovieServiceCarousel />

      {/* Section Viral Maluku Utara — stream sendiri (artikel real source=social) */}
      <Suspense fallback={null}>
        <ViralServer />
      </Suspense>

      <div className="my-10">
        <WANewsletterWidget />
      </div>
    </>
  );
}

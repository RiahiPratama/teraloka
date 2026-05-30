'use client';

// ══════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE SHELL — Phase 4 Polish v14.1 (Client Interactivity)
// PATH: src/app/(public)/bakabar/BakabarShell.tsx
// ──────────────────────────────────────────────────────────────────
// v14.1 (31 Mei 2026): pass `sectionIndex={idx}` ke RegionSection
//   → untuk rotasi house content kolom-3 (Zakat tiap section ke-4).
//
// v14.0 (31 Mei 2026): di-extract dari page.tsx (Opsi B RSC split).
//   - Terima `slides` dari Server Component (artikel udah di-fetch server)
//   - Hero render LANGSUNG (no loading gate) → above-the-fold instan
//   - Trending ads tetap client-fetch (non-blocking, gak ganggu hero)
//   - Layout 3-kolom + region map + banner antar-section: UNCHANGED
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import WANewsletterWidget from '@/components/WANewsletterWidget';

import HeroWithSidebar from '@/components/bakabar/HeroWithSidebar';
import RegionSection from '@/components/bakabar/RegionSection';
import LaIndieMoviePoliticalBanner from '@/components/bakabar/LaIndieMoviePoliticalBanner';
import LaIndieMovieServiceCarousel from '@/components/bakabar/LaIndieMovieServiceCarousel';
import DCASkyscraper from '@/components/bakabar/DCASkyscraper';
import DCATopLeaderboard from '@/components/bakabar/DCATopLeaderboard';
import { SIDEBAR_MREC, TERPOPULER_LIST, REGIONS } from '@/components/bakabar/region-data';
import type { HeroSlide } from '@/components/bakabar/region-data';
import type { TrendingNativeAd } from '@/components/bakabar/TrendingArticleAd';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── BADONASI Strategic Inline Promo (unchanged) ──────────────────
function BadonasiInlinePromo() {
  return (
    <Link
      href="/fundraising"
      className="relative block my-8 rounded-lg overflow-hidden text-white cursor-pointer transition-all duration-300 hover:scale-[1.01]"
      style={{
        background: 'linear-gradient(135deg, #EC4899 0%, #9d174d 100%)',
        boxShadow: '0 6px 20px rgba(157, 23, 77, 0.25)',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(245,158,11,0.12) 0%, transparent 50%)',
      }} />
      <div className="absolute pointer-events-none" style={{
        right: -10, bottom: -20, fontSize: 110, opacity: 0.16, lineHeight: 1,
      }}>🤲</div>
      <div className="relative z-[2] p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-extrabold tracking-[1.5px] uppercase opacity-85 mb-1.5">
            BADONASI · Layanan TeraLoka
          </p>
          <h3 className="text-[18px] md:text-[22px] font-extrabold leading-tight mb-1"
            style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
            Galang Donasi untuk Sesama Warga MalUt
          </h3>
          <p className="text-[12px] opacity-90">
            Bantu kebutuhan mendesak warga di kampungmu — donasi mudah, transparan, langsung sampai.
          </p>
        </div>
        <span className="inline-block bg-white text-pink-700 px-4 py-2 rounded-md text-[11px] font-extrabold uppercase tracking-[0.5px] whitespace-nowrap self-start md:self-auto">
          Berdonasi →
        </span>
      </div>
    </Link>
  );
}

export default function BakabarShell({ slides }: { slides: HeroSlide[] }) {
  const [trendingAdsByRegion, setTrendingAdsByRegion] =
    useState<Record<string, TrendingNativeAd | null>>({});

  // Trending ads = client-fetch, NON-BLOCKING. Tidak menahan hero.
  const fetchTrendingAds = useCallback(async () => {
    try {
      const results = await Promise.all(
        REGIONS.map(async (r) => {
          try {
            const res = await fetch(
              `${API}/public/ads/by-position/trending_native?region=${encodeURIComponent(r.slug)}&limit=1`
            );
            const data = await res.json();
            const ad =
              data?.success && Array.isArray(data.data) && data.data[0]
                ? (data.data[0] as TrendingNativeAd)
                : null;
            return [r.slug, ad] as const;
          } catch {
            return [r.slug, null] as const;
          }
        })
      );
      const map: Record<string, TrendingNativeAd | null> = {};
      results.forEach(([slug, ad]) => { map[slug] = ad; });
      setTrendingAdsByRegion(map);
    } catch {
      setTrendingAdsByRegion({});
    }
  }, []);

  useEffect(() => { fetchTrendingAds(); }, [fetchTrendingAds]);

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

          <main className="flex-1 min-w-0" style={{ maxWidth: 1000 }}>

            <DCATopLeaderboard />

            <div className="mt-8">

              {/* Hero render LANGSUNG — slides selalu terisi (server / fallback statis) */}
              <HeroWithSidebar
                slides={slides}
                sidebar_mrec={SIDEBAR_MREC}
                terpopuler={TERPOPULER_LIST}
              />

              {REGIONS.map((region, idx) => (
                <div key={region.slug}>
                  <RegionSection
                    region={region}
                    trendingAd={trendingAdsByRegion[region.slug] ?? null}
                    sectionIndex={idx}
                  />

                  {idx === 0 && <LaIndieMoviePoliticalBanner />}
                  {idx === 1 && <BadonasiInlinePromo />}
                </div>
              ))}

              <LaIndieMovieServiceCarousel />

              <div className="my-10">
                <WANewsletterWidget />
              </div>

            </div>
          </main>

          <DCASkyscraper side="right" />

        </div>
      </div>
    </div>
  );
}

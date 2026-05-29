'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — Phase 1 v13.12 (Mission 7 Sub-Phase 7-B-2/3/4)
// PATH: src/app/(public)/bakabar/page.tsx
// ────────────────────────────────────────────────────────────────
// v13.12 UPDATE (15 Mei 2026):
//   - REMOVE import TopLeaderboardAd (hardcoded)
//   - REMOVE import TOP_LEADERBOARD const from region-data
//   - ADD <DCATopLeaderboard /> (fetch /by-position/top_leaderboard)
//   - Stack Banner Col 3: replacement happens INSIDE RegionSection
//     v10.4 (via DCAStackBanner) — page.tsx tidak perlu pass prop
//   - InlineBannerAd: dorment file, gak di-import (Mission 8 enable)
//
// History:
//   - v13.11: 7-B-1 DCASkyscraper
//   - v13.10: Mission 6 Phase 5 parent fetcher trending
//   - v13.9: Sprint 2A Batch D Final LEAN
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import WANewsletterWidget from '@/components/WANewsletterWidget';

import HeroWithSidebar from '@/components/bakabar/HeroWithSidebar';
import RegionSection from '@/components/bakabar/RegionSection';
import LaIndieMoviePoliticalBanner from '@/components/bakabar/LaIndieMoviePoliticalBanner';
import LaIndieMovieServiceCarousel from '@/components/bakabar/LaIndieMovieServiceCarousel';
import DCASkyscraper from '@/components/bakabar/DCASkyscraper';
import DCATopLeaderboard from '@/components/bakabar/DCATopLeaderboard';
import {
  SIDEBAR_MREC,
  TERPOPULER_LIST,
  HERO_CAROUSEL_SLIDES,
  REGIONS,
} from '@/components/bakabar/region-data';
import type { HeroSlide, DummyArticle } from '@/components/bakabar/region-data';
import type { TrendingNativeAd } from '@/components/bakabar/TrendingArticleAd';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── BADONASI Strategic Inline Promo ────────────────────────
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

function toCarouselArticle(a: any): DummyArticle {
  return {
    id: a.id, title: a.title, slug: a.slug, excerpt: a.excerpt,
    category: a.category || 'umum',
    published_at: a.published_at || a.created_at,
    source: a.source, source_name: a.source_name,
    cover_image_url: a.cover_image_url,
    is_viral: a.is_viral || false,
  };
}

function BakabarPageContent() {
  const searchParams = useSearchParams();

  const _navParam = searchParams.get('nav');
  const _legacyType = searchParams.get('type');
  const _legacyLoc = searchParams.get('location');
  const _currentNav =
    _navParam ||
    (_legacyType && _legacyType !== 'terbaru' ? _legacyType : null) ||
    (_legacyLoc && _legacyLoc !== 'all' ? _legacyLoc : null) ||
    'terbaru';
  const _isTypeKind =
    _currentNav === 'nasional' || _currentNav === 'viral' || _currentNav === 'terbaru';
  const type = _isTypeKind ? _currentNav : 'terbaru';
  const location = _isTypeKind ? 'all' : _currentNav;
  const q = searchParams.get('q') || '';

  const [realArticles, setRealArticles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendingAdsByRegion, setTrendingAdsByRegion] =
    useState<Record<string, TrendingNativeAd | null>>({});

  const fetchArticles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (type === 'viral') params.set('viral', 'true');
      if (type === 'nasional') params.set('source', 'rss');
      if (location !== 'all') params.set('location', location);
      if (q) params.set('q', q);
      params.set('limit', '12');

      const res = await fetch(`${API}/content/articles?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setRealArticles(data.data ?? []);
      }
    } catch {
      setRealArticles([]);
    } finally {
      setLoading(false);
    }
  }, [type, location, q]);

  const fetchTrendingAds = useCallback(async () => {
    try {
      const results = await Promise.all(
        REGIONS.map(async (r) => {
          try {
            const res = await fetch(
              `${API}/public/ads/by-position/trending_native?region=${encodeURIComponent(r.slug)}&limit=1`
            );
            const data = await res.json();
            const ad = data?.success && Array.isArray(data.data) && data.data[0]
              ? (data.data[0] as TrendingNativeAd) : null;
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

  useEffect(() => { fetchArticles(); }, [fetchArticles]);
  useEffect(() => { fetchTrendingAds(); }, [fetchTrendingAds]);

  const slides: HeroSlide[] = HERO_CAROUSEL_SLIDES.map((slide, idx) => {
    if (realArticles[idx]) {
      return { ...slide, hero: toCarouselArticle(realArticles[idx]) };
    }
    return slide;
  });

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

            {/* Mission 7-B-2: replace TopLeaderboardAd hardcoded → DCATopLeaderboard fetch */}
            <DCATopLeaderboard />

            <div className="mt-8">

              {!loading && (
                <HeroWithSidebar
                  slides={slides}
                  sidebar_mrec={SIDEBAR_MREC}
                  terpopuler={TERPOPULER_LIST}
                />
              )}

              {loading && (
                <div className="grid gap-7 mb-10" style={{ gridTemplateColumns: '1fr 320px' }}>
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
              )}

              {REGIONS.map((region, idx) => (
                <div key={region.slug}>
                  <RegionSection
                    region={region}
                    trendingAd={trendingAdsByRegion[region.slug] ?? null}
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

export default function BakabarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <p className="text-gray-400 text-sm">Memuat...</p>
        </div>
      }
    >
      <BakabarPageContent />
    </Suspense>
  );
}

'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — Phase 1 v13.9 (Sprint 2A Batch D Final)
// ────────────────────────────────────────────────────────────────
// Update dari v13.8 (15 Mei 2026):
//   - Remove InlineBannerAd loop antar region (terlalu banyak iklan)
//   - Remove "← Kembali ke beranda" link (kita di beranda, redundant)
//   - Add BADONASI strategic promo card between Ternate (idx=1) dan
//     Tidore (idx=2) — single ad placement, focused message
//   - Political banner v2.1 (LEAN) integrate
//   - Service carousel v1.1 (LEAN) integrate
//
// Ad strategy LOCKED:
//   - Top: TopLeaderboardAd (1)
//   - Hero: SidebarMREC (1)
//   - Regions: BADONASI promo (1, strategic placement)
//   - Service carousel: post-regions (closer)
//   - Sidebar: SkyAds L+R (2 sticky)
//   = 6 ad surfaces (down from ~13+ pre-cleanup)
//
// History prev:
//   - v13.8 Batch D2: Add LaIndieMovieServiceCarousel
//   - v13.7 Batch D: LaIndieMoviePoliticalBanner v1.0
//   - v13.6 Batch B v5a-fix: pt-16 sticky alignment (Pattern AA)
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import WANewsletterWidget from '@/components/WANewsletterWidget';

import TopLeaderboardAd from '@/components/bakabar/TopLeaderboardAd';
import HeroWithSidebar from '@/components/bakabar/HeroWithSidebar';
import RegionSection from '@/components/bakabar/RegionSection';
import LaIndieMoviePoliticalBanner from '@/components/bakabar/LaIndieMoviePoliticalBanner';
import LaIndieMovieServiceCarousel from '@/components/bakabar/LaIndieMovieServiceCarousel';
import {
  TOP_LEADERBOARD,
  SIDEBAR_MREC,
  TERPOPULER_LIST,
  HERO_CAROUSEL_SLIDES,
  REGIONS,
} from '@/components/bakabar/region-data';
import type { HeroSlide, DummyArticle } from '@/components/bakabar/region-data';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Inline SkyscraperAd ─────────────────────────────────────
function SkyscraperAd({ side }: { side: 'left' | 'right' }) {
  const config = side === 'left'
    ? {
        overline: 'BPJS Kesehatan MalUt',
        title: 'Daftar BPJS Online Tanpa Antre',
        body: 'Aktivasi 24 jam · Kantor cabang Ternate, Tobelo, Sofifi siap melayani warga Maluku Utara.',
        cta: 'Daftar Sekarang',
        gradient: 'linear-gradient(180deg, #003526 0%, #001a13 100%)',
      }
    : {
        overline: 'Pertamina · MalUt',
        title: 'Pertashop Buka Cabang Baru di Halmahera',
        body: 'BBM tersedia 24/7 di Halut, Tidore, Bacan & Sanana. Harga terjangkau, kualitas terjamin.',
        cta: 'Cari Lokasi',
        gradient: 'linear-gradient(180deg, #DC2626 0%, #7F1D1D 100%)',
      };

  return (
    <aside className="hidden xl:block w-[160px] shrink-0">
      <div
        className="sticky rounded-lg overflow-hidden text-white relative"
        style={{ top: 228, height: 600, background: config.gradient }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.12) 0%, transparent 60%)',
        }} />
        <div className="relative z-[2] p-5 flex flex-col h-full justify-between">
          <div>
            <p className="text-[9px] font-extrabold uppercase tracking-[1.2px] opacity-85 mb-2">
              {config.overline}
            </p>
            <h3 className="text-[17px] font-bold leading-[1.2] mb-2.5"
              style={{ fontFamily: "'Lora', Georgia, serif" }}>
              {config.title}
            </h3>
            <p className="text-[11px] leading-[1.45] opacity-85">{config.body}</p>
          </div>
          <button className="self-start px-3 py-1.5 rounded-md text-[10px] font-extrabold flex items-center gap-1"
            style={{ background: '#F59E0B', color: '#fff' }}>
            {config.cta} →
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── BADONASI Strategic Inline Promo ────────────────────────
// Single-card promo BADONASI service. Placement: between Ternate (idx=1)
// and Tidore (idx=2). Lean aesthetic match overall homepage.
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
      {/* Radial decoration */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(245,158,11,0.12) 0%, transparent 50%)',
        }}
      />

      {/* Big emoji decoration */}
      <div
        className="absolute pointer-events-none"
        style={{
          right: -10,
          bottom: -20,
          fontSize: 110,
          opacity: 0.16,
          lineHeight: 1,
        }}
      >
        🤲
      </div>

      <div className="relative z-[2] p-5 md:p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-extrabold tracking-[1.5px] uppercase opacity-85 mb-1.5">
            BADONASI · Layanan TeraLoka
          </p>
          <h3
            className="text-[18px] md:text-[22px] font-extrabold leading-tight mb-1"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            Galang Donasi untuk Sesama Warga MalUt
          </h3>
          <p className="text-[12px] opacity-90">
            Bantu kebutuhan mendesak warga di kampungmu — donasi mudah, transparan, langsung sampai.
          </p>
        </div>
        <span
          className="inline-block bg-white text-pink-700 px-4 py-2 rounded-md text-[11px] font-extrabold uppercase tracking-[0.5px] whitespace-nowrap self-start md:self-auto"
        >
          Berdonasi →
        </span>
      </div>
    </Link>
  );
}

function toCarouselArticle(a: any): DummyArticle {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category: a.category || 'umum',
    published_at: a.published_at || a.created_at,
    source: a.source,
    source_name: a.source_name,
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

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const slides: HeroSlide[] = HERO_CAROUSEL_SLIDES.map((slide, idx) => {
    if (realArticles[idx]) {
      return { ...slide, hero: toCarouselArticle(realArticles[idx]) };
    }
    return slide;
  });

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* PrayerBreakingBar di-render INSIDE CategoryTabs (sticky bareng). */}

      <div className="max-w-[1280px] mx-auto px-4">
        {/* pt-16 alignment with SkyAd sticky top:228. Pattern AA. */}
        <div className="flex gap-5 items-stretch justify-center pt-16">

          <SkyscraperAd side="left" />

          <main className="flex-1 min-w-0 max-w-4xl">

            <TopLeaderboardAd ad={TOP_LEADERBOARD} visual_symbol="M" />

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
                  <RegionSection region={region} />

                  {/* Batch D: Political Banner setelah Nasional (idx=0) */}
                  {idx === 0 && <LaIndieMoviePoliticalBanner />}

                  {/* BADONASI Strategic Promo: setelah Ternate (idx=1), sebelum Tidore (idx=2) */}
                  {idx === 1 && <BadonasiInlinePromo />}
                </div>
              ))}

              {/* Batch D2: Service Carousel (Layanan TeraLoka) — closer di akhir feed */}
              <LaIndieMovieServiceCarousel />

              <div className="my-10">
                <WANewsletterWidget />
              </div>

              {/* "Kembali ke beranda" link DIHAPUS (v13.9) — kita sudah di beranda */}
            </div>
          </main>

          <SkyscraperAd side="right" />

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

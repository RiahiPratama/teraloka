'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — Phase 1 v11 (Sub-Sprint 5F)
// ────────────────────────────────────────────────────────────────
// Fix dari v10:
//   - main className "w-full max-w-4xl min-w-0" → "flex-1 min-w-0 max-w-4xl"
//     w-full di flex context kurang stable. flex-1 (flex: 1 1 0%)
//     lebih predictable untuk distribute available space.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import WANewsletterWidget from '@/components/WANewsletterWidget';

import TopLeaderboardAd from '@/components/bakabar/TopLeaderboardAd';
import HeroWithSidebar from '@/components/bakabar/HeroWithSidebar';
import RegionSection from '@/components/bakabar/RegionSection';
import InlineBannerAd from '@/components/bakabar/InlineBannerAd';
import {
  TOP_LEADERBOARD,
  SIDEBAR_MREC,
  TERPOPULER_LIST,
  HERO_CAROUSEL_SLIDES,
  REGIONS,
  INLINE_BANNERS,
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
        style={{ top: 24, height: 600, background: config.gradient }}
      >
        <span className="absolute z-10 px-2 py-0.5 rounded text-[8px] font-extrabold uppercase tracking-[1px]"
          style={{ top: 8, right: 8, background: '#F59E0B', color: '#fff' }}>
          Iklan
        </span>
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

  const breaking = realArticles.filter((a) => a.is_breaking);

  return (
    <div className="min-h-screen bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&display=swap');
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>

      {/* OUTER WRAPPER: max-w-[1280px] */}
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex gap-5 items-start justify-center">

          {/* LEFT SIDEBAR (xl+ only) */}
          <SkyscraperAd side="left" />

          {/* MAIN CONTENT — flex-1 grabs available space, max-w-4xl caps */}
          <main className="flex-1 min-w-0 max-w-4xl">

            {/* BREAKING TICKER */}
            {breaking.length > 0 && (
              <div className="pt-3">
                <div className="flex items-center gap-3 bg-[#003526] text-white rounded-xl px-4 py-2.5">
                  <span className="text-xs font-black uppercase shrink-0 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse inline-block" />
                    BREAKING
                  </span>
                  <Link href={`/bakabar/${breaking[0]?.slug}`}
                    className="text-xs font-semibold flex-1 truncate hover:underline">
                    {breaking[0]?.title}
                  </Link>
                </div>
              </div>
            )}

            {/* Top Leaderboard */}
            <div className="pt-6">
              <TopLeaderboardAd ad={TOP_LEADERBOARD} visual_symbol="M" />
            </div>

            {/* Main Content */}
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
                  {idx < REGIONS.length - 1 && (
                    <InlineBannerAd ad={INLINE_BANNERS[idx % INLINE_BANNERS.length]} />
                  )}
                </div>
              ))}

              <div className="my-10">
                <WANewsletterWidget />
              </div>

              <div className="my-8 text-center pb-12">
                <Link href="/bakabar?nav=terbaru"
                  className="text-sm text-[#003526] font-semibold hover:underline">
                  ← Kembali ke beranda BAKABAR
                </Link>
              </div>
            </div>
          </main>

          {/* RIGHT SIDEBAR (xl+ only) */}
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

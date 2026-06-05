// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — Phase 4 Polish v16.0 (RSC Split — Server Shell)
// PATH: src/app/(public)/bakabar/page.tsx
// ────────────────────────────────────────────────────────────────
// v16.0 UPDATE (4 Juni 2026, WS-3+ — Below-Fold Fetch → Server):
//   - PINDAH 3 fetch below-fold dari client (BakabarShell useEffect) ke
//     SERVER (await Promise.all): trending_native per-region (12 call),
//     campaigns BADONASI, reports BALAPOR.
//   - MOTIVASI: hilangkan per-visitor explosion. Sebelumnya tiap
//     pengunjung = ±14 call ke Dalang (12 trending + 1 campaign + 1
//     report). Sekarang di-cache 60s → Dalang load KONSTAN berapapun
//     jumlah pengunjung concurrent (anti-fragile pre-launch).
//   - Homepage kini 100% server-rendered + data-cached. BakabarShell
//     jadi murni presentational (zero client fetch).
//
// v15.0 (4 Juni): WS-3 region wire-up server-side + revalidate60.
// v14.0 (31 Mei): Opsi B RSC split — hero fetch server, region client.
// ════════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import { preload } from 'react-dom';
import BakabarShell from './BakabarShell';
import { HERO_CAROUSEL_SLIDES, REGIONS } from '@/components/bakabar/region-data';
import type { HeroSlide, DummyArticle } from '@/components/bakabar/region-data';
import type { TrendingNativeAd } from '@/components/bakabar/TrendingArticleAd';
import type { BadonasiCampaign } from '@/components/bakabar/CampaignCol3Card';
import type { BalaporReport } from '@/components/bakabar/SuaraWargaCol3Card';
import type { StackBannerAd } from '@/components/bakabar/DCAStackBanner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ── Fetch policy ────────────────────────────────────────────────
// revalidate:60 → hasil fetch di-cache 60 detik (data cache Next.js).
// Region/trending/campaign/report fetch TIDAK bergantung searchParams
// → cache shared global, hemat invocation Dalang VPS + Vercel.
const FETCH_OPTS: RequestInit = { next: { revalidate: 60 } };

// ── Timeout guard (WS-5c, 5 Jun 2026; rev2 6 Jun) ───────────────
// page.tsx fetch ~40 endpoint Dalang di server (await Promise.all). Tanpa
// timeout, SATU endpoint hang = SELURUH render block → Vercel limit ~10s →
// halaman gagal tampil total. AbortController batasi tiap fetch; timeout →
// abort → throw → ke-catch di tiap fetcher → fallback ([] / null).
//
// rev2: PISAH timeout per prioritas. ARTIKEL = konten inti, JANGAN di-abort
// gampang — saat Dalang cold-start bisa 1-12 dtk (kebukti: run pertama
// ternate 12s, lalu warm 0.6s). Timeout 3.5s ketat ngebunuh artikel valid →
// region "kosong" palsu. Artikel pakai 9s (di bawah Vercel 10s). Slot
// SEKUNDER (ads/trending/campaign/report) tetap 3.5s — telat = slot kosong,
// gak fatal (bukan konten inti).
const TIMEOUT_ARTICLE_MS   = 9000;  // konten inti — longgar, toleran cold-start
const TIMEOUT_SECONDARY_MS = 3500;  // ads/trending/campaign/report — ketat

async function fetchWithTimeout(
  url: string,
  opts: RequestInit = {},
  timeoutMs: number = TIMEOUT_SECONDARY_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...opts, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// ── Mappers ─────────────────────────────────────────────────────
// CATATAN: TIDAK set `source` (tipe DummyArticle.source union sempit
// 'editorial'|'rss'|'balapor'; backend balikin 'social'/'original'/dst).

function toCarouselArticle(a: any): DummyArticle {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category: a.category || '',
    published_at: a.published_at || a.created_at,
    source_name: a.source_name,
    cover_image_url: a.cover_image_url ?? null,
    is_viral: a.is_viral || false,
  };
}

function toRegionArticle(a: any, i: number): DummyArticle {
  return {
    id: a.id,
    title: a.title,
    slug: a.slug,
    excerpt: a.excerpt,
    category: a.category || '',
    published_at: a.published_at || a.created_at || new Date().toISOString(),
    source_name: a.source_name,
    cover_image_url: a.cover_image_url ?? null,
    thumb_class: `thumb-${(i % 9) + 1}`,
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function pick(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

// Logika nav + legacy param (carry-over dari v13.12, dipindah ke server)
function resolveNav(sp: SearchParams) {
  const navParam = pick(sp.nav);
  const legacyType = pick(sp.type);
  const legacyLoc = pick(sp.location);

  const currentNav =
    navParam ||
    (legacyType && legacyType !== 'terbaru' ? legacyType : '') ||
    (legacyLoc && legacyLoc !== 'all' ? legacyLoc : '') ||
    'terbaru';

  const isTypeKind =
    currentNav === 'nasional' || currentNav === 'viral' || currentNav === 'terbaru';

  const type = isTypeKind ? currentNav : 'terbaru';
  const location = isTypeKind ? 'all' : currentNav;
  const q = pick(sp.q);

  return { type, location, q };
}

// ── Generic list fetch (resilient: gagal → []) ──────────────────
async function fetchList(query: string, limit: number): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(`${API}/content/articles?${query}&limit=${limit}`, FETCH_OPTS, TIMEOUT_ARTICLE_MS);
    const data = await res.json();
    return data?.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

// Hero/nav fetch — viral/nasional via ?type= (kontrak backend).
async function fetchHeroArticles(type: string, location: string, q: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (type === 'viral') params.set('type', 'viral');
  else if (type === 'nasional') params.set('type', 'nasional');
  if (location !== 'all') params.set('location', location);
  if (q) params.set('q', q);
  return fetchList(params.toString(), 12);
}

// Query per region: nasional → type, region geografis → location.
function regionQuery(slug: string): string {
  return slug === 'nasional' ? 'type=nasional' : `location=${encodeURIComponent(slug)}`;
}

// ── Below-fold fetch (v16.0: dipindah dari client BakabarShell) ──
// Trending native ads per region — 12 call paralel, di-cache 60s.
async function fetchTrendingByRegion(): Promise<Record<string, TrendingNativeAd | null>> {
  const entries = await Promise.all(
    REGIONS.map(async (r) => {
      try {
        const res = await fetchWithTimeout(
          `${API}/public/ads/by-position/trending_native?region=${encodeURIComponent(r.slug)}&limit=1`,
          FETCH_OPTS,
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
    }),
  );
  const map: Record<string, TrendingNativeAd | null> = {};
  entries.forEach(([slug, ad]) => { map[slug] = ad; });
  return map;
}

// region_stack ADS per region — WS-5c (5 Jun): dipindah dari client
// (DCAStackBanner useEffect ×13) ke server. limit=2 (maks slot ads-murni);
// komponen slice(0, maxAds) sesuai slot. Di-cache 60s + timeout-guarded.
async function fetchStackByRegion(): Promise<Record<string, StackBannerAd[]>> {
  const entries = await Promise.all(
    REGIONS.map(async (r) => {
      try {
        const res = await fetchWithTimeout(
          `${API}/public/ads/by-position/region_stack?region=${encodeURIComponent(r.slug)}&limit=2`,
          FETCH_OPTS,
        );
        const data = await res.json();
        const ads =
          data?.success && Array.isArray(data.data) ? (data.data as StackBannerAd[]) : [];
        return [r.slug, ads] as const;
      } catch {
        return [r.slug, [] as StackBannerAd[]] as const;
      }
    }),
  );
  const map: Record<string, StackBannerAd[]> = {};
  entries.forEach(([slug, ads]) => { map[slug] = ads; });
  return map;
}

async function fetchCampaigns(): Promise<BadonasiCampaign[]> {
  try {
    const res = await fetchWithTimeout(`${API}/funding/campaigns?limit=12`, FETCH_OPTS);
    const data = await res.json();
    return data?.success && Array.isArray(data.data) ? (data.data as BadonasiCampaign[]) : [];
  } catch {
    return [];
  }
}

async function fetchReports(): Promise<BalaporReport[]> {
  try {
    const res = await fetchWithTimeout(`${API}/public/reports/recent`, FETCH_OPTS);
    const data = await res.json();
    return data?.success && Array.isArray(data.data) ? (data.data as BalaporReport[]) : [];
  } catch {
    return [];
  }
}

export default async function BakabarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { type, location, q } = resolveNav(sp);

  // Fetch hero + region + viral + trending + campaign + report PARALEL di server.
  const regionTargets = REGIONS.map((r) => [r.slug, regionQuery(r.slug)] as const);

  const [heroRaw, regionRaw, viralRaw, trendingByRegion, stackByRegion, campaigns, reports] = await Promise.all([
    fetchHeroArticles(type, location, q),
    Promise.all(
      regionTargets.map(async ([slug, query]) => {
        const arts = await fetchList(query, 8);
        return [slug, arts.map(toRegionArticle)] as const;
      }),
    ),
    fetchList('source=social', 8),
    fetchTrendingByRegion(),
    fetchStackByRegion(),
    fetchCampaigns(),
    fetchReports(),
  ]);

  const regionArticles: Record<string, DummyArticle[]> = {};
  regionRaw.forEach(([slug, arts]) => { regionArticles[slug] = arts; });
  const viralArticles: DummyArticle[] = viralRaw.map(toRegionArticle);

  // Hero slide[idx] di-override dgn artikel asli kalau ada; sisanya
  // fallback ke HERO_CAROUSEL_SLIDES (statis) → hero TIDAK PERNAH kosong.
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

  // PERF (4 Jun 2026, WS-5c): preload gambar LCP (hero slide-0).
  // React 19 emit <link rel=preload as=image fetchpriority=high> ke <head>
  // SEBELUM render carousel → browser fetch gambar hero sejak parse HTML,
  // bukan nunggu hydrate. Kombinasi dgn preconnect (root layout) memangkas
  // LCP "resource load delay" 2.1 dtk. Gradient-fallback (cover null) →
  // lcpImage undefined → skip, gak ada yg di-preload.
  const lcpImage = slides[0]?.hero?.cover_image_url;
  if (lcpImage) {
    preload(lcpImage, { as: 'image', fetchPriority: 'high' });
  }

  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <BakabarShell
        slides={slides}
        regionArticles={regionArticles}
        viralArticles={viralArticles}
        trendingByRegion={trendingByRegion}
        stackByRegion={stackByRegion}
        campaigns={campaigns}
        reports={reports}
      />
    </Suspense>
  );
}

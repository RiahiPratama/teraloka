// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — Phase 4 Polish v15.0 (RSC Split — Server Shell)
// PATH: src/app/(public)/bakabar/page.tsx
// ────────────────────────────────────────────────────────────────
// v15.0 UPDATE (4 Juni 2026, WS-3 — Region Wire-Up Server-Side):
//   - PINDAH fetch artikel REGION (12 region MalUt + viral) dari client
//     (BakabarShell useEffect) ke SERVER (await Promise.all). Hilangkan
//     "content flash" dummy→real di latency Ternate + cegah klik dummy 404.
//   - Region articles dikirim ke BakabarShell via prop `regionArticles`
//     (Record<slug, DummyArticle[]>) + `viralArticles` (DummyArticle[]).
//   - Empty/gagal fetch = array kosong → BakabarShell render EMPTY-STATE
//     jujur (BUKAN fallback dummy palsu). Editorial integrity > visual.
//   - FIX mismatch hero fetch: viral/nasional sekarang pakai ?type=
//     (kontrak backend listArticles), bukan ?viral=true / ?source=rss.
//   - Aktifkan revalidate:60 (Risk-1 Vercel quota) — region fetch tak
//     bergantung searchParams → data-cache shared antar pengunjung.
//
// History:
//   - v14.0 (31 Mei): Opsi B RSC split — hero fetch server, region client.
//   - v13.12: full client fetch + loading gate (DEPRECATED).
// ════════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import BakabarShell from './BakabarShell';
import { HERO_CAROUSEL_SLIDES, REGIONS } from '@/components/bakabar/region-data';
import type { HeroSlide, DummyArticle } from '@/components/bakabar/region-data';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ── Fetch policy ────────────────────────────────────────────────
// revalidate:60 → hasil fetch di-cache 60 detik (data cache Next.js).
// Region fetch tidak bergantung searchParams → cache shared global,
// hemat invocation Dalang VPS + Vercel (Risk-1 quota).
const FETCH_OPTS: RequestInit = { next: { revalidate: 60 } };

// ── Mappers ─────────────────────────────────────────────────────
// CATATAN: TIDAK set `source` (tipe DummyArticle.source union sempit
// 'editorial'|'rss'|'balapor'; backend balikin 'social'/'original'/dst
// → set bakal error tsc strict). Mirror pola toDummy lama.

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
    const res = await fetch(`${API}/content/articles?${query}&limit=${limit}`, FETCH_OPTS);
    const data = await res.json();
    return data?.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

// Hero/nav fetch — FIX: viral/nasional via ?type= (kontrak backend).
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

export default async function BakabarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const { type, location, q } = resolveNav(sp);

  // Fetch hero + semua region + viral PARALEL di server.
  const regionTargets = REGIONS.map((r) => [r.slug, regionQuery(r.slug)] as const);

  const [heroRaw, regionRaw, viralRaw] = await Promise.all([
    fetchHeroArticles(type, location, q),
    Promise.all(
      regionTargets.map(async ([slug, query]) => {
        const arts = await fetchList(query, 8);
        return [slug, arts.map(toRegionArticle)] as const;
      }),
    ),
    fetchList('source=social', 8),
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

  // Suspense = safety net kalau ada child pakai useSearchParams.
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <BakabarShell
        slides={slides}
        regionArticles={regionArticles}
        viralArticles={viralArticles}
      />
    </Suspense>
  );
}

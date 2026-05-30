// ════════════════════════════════════════════════════════════════
// BAKABAR HOMEPAGE — Phase 4 Polish v14.0 (RSC Split — Server Shell)
// PATH: src/app/(public)/bakabar/page.tsx
// ────────────────────────────────────────────────────────────────
// v14.0 UPDATE (31 Mei 2026, Phase 4 Desktop Polish — Opsi B):
//   - CONVERT jadi Server Component (HAPUS 'use client')
//   - Fetch artikel hero/region di SERVER (await) → hilangkan client
//     loading-gate yang bikin hero (above-the-fold) telat render
//   - searchParams jadi async server prop (Next 16)
//   - Render <BakabarShell slides={...} /> (client) untuk interaktivitas
//   - Hero sekarang ada di initial HTML → first paint instan
//
// History:
//   - v13.12: client fetch + loading gate (DEPRECATED — perceived
//     perf kebalik: region instan, hero nyangkut skeleton)
// ════════════════════════════════════════════════════════════════

import { Suspense } from 'react';
import BakabarShell from './BakabarShell';
import { HERO_CAROUSEL_SLIDES } from '@/components/bakabar/region-data';
import type { HeroSlide, DummyArticle } from '@/components/bakabar/region-data';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ── Fetch policy ────────────────────────────────────────────────
// Pre-launch: no-store (selalu fresh, traffic rendah → aman).
// POST-LAUNCH: ganti ke { next: { revalidate: 60 } } biar hasil render
// di-cache 60 detik → hemat invocation Vercel (Risk-1 quota).
const FETCH_OPTS: RequestInit = { cache: 'no-store' };

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

async function fetchArticles(type: string, location: string, q: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (type === 'viral') params.set('viral', 'true');
  if (type === 'nasional') params.set('source', 'rss');
  if (location !== 'all') params.set('location', location);
  if (q) params.set('q', q);
  params.set('limit', '12');

  try {
    const res = await fetch(`${API}/content/articles?${params.toString()}`, FETCH_OPTS);
    const data = await res.json();
    return data?.success ? (data.data ?? []) : [];
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

  const realArticles = await fetchArticles(type, location, q);

  // Hero slide[idx] di-override dgn artikel asli kalau ada; sisanya
  // fallback ke HERO_CAROUSEL_SLIDES (statis) → hero TIDAK PERNAH kosong.
  const slides: HeroSlide[] = HERO_CAROUSEL_SLIDES.map((slide, idx) =>
    realArticles[idx]
      ? { ...slide, hero: toCarouselArticle(realArticles[idx]) }
      : slide
  );

  // Suspense = safety net kalau ada child pakai useSearchParams.
  // Fallback bg putih: tidak akan terlihat kecuali ada yang suspend.
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <BakabarShell slides={slides} />
    </Suspense>
  );
}

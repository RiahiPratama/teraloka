// ════════════════════════════════════════════════════════════════
// BAKABAR — Server Fetch Library  [L5-BAKABAR-FETCH-LIB]
// PATH: src/components/bakabar/bakabar-fetch.ts
// ────────────────────────────────────────────────────────────────
// WS-5d (13 Jun 2026 — Streaming Refactor):
//   Diekstrak dari page.tsx v16.0. Dipakai BERSAMA oleh tiga server
//   component: page.tsx (hero), BelowFold.tsx (campaign/report +
//   assignment house-slot), RegionServer.tsx (artikel/trending/stack
//   per region). SERVER-ONLY — JANGAN di-import dari komponen 'use client'.
//
//   🛡️ §2 PRESERVED (pelajaran cold-start — LOCKED):
//     - ARTIKEL (konten inti)  = 9000ms  → toleran Dalang cold-start.
//     - SEKUNDER (ads/trending/stack/campaign/report) = 3500ms → telat=kosong.
//     Mengubah angka ini = mengundang balik regresi §2 (region kosong palsu).
//
//   Behavior fetch IDENTIK dengan page.tsx v16.0; cuma struktur per-region
//   dipecah (1 region = 1 call) supaya bisa di-stream via <Suspense>.
// ════════════════════════════════════════════════════════════════

import type { DummyArticle } from './region-data';
import type { TrendingNativeAd } from './TrendingArticleAd';
import type { BadonasiCampaign } from './CampaignCol3Card';
import type { BalaporReport } from './SuaraWargaCol3Card';
import type { StackBannerAd } from './DCAStackBanner';

export const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// revalidate:60 → data cache Next.js. Region/trending/stack/campaign/report
// TIDAK bergantung searchParams → cache shared global → beban Dalang KONSTAN
// berapapun pengunjung concurrent (anti-fragile pre-launch, dari v16.0).
export const FETCH_OPTS: RequestInit = { next: { revalidate: 60 } };

export const TIMEOUT_ARTICLE_MS = 9000;   // konten inti — longgar, toleran cold-start
export const TIMEOUT_SECONDARY_MS = 3500;  // ads/trending/stack/campaign/report — ketat

export async function fetchWithTimeout(
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

// ── Mappers (IDENTIK dari page.tsx v16.0) ───────────────────────
// CATATAN: TIDAK set `source` (tipe DummyArticle.source union sempit;
// backend balikin 'social'/'original'/dst yang di luar union).
export function toCarouselArticle(a: any): DummyArticle {
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

export function toRegionArticle(a: any, i: number): DummyArticle {
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

// ── Nav resolve (carry-over v13.12 — IDENTIK) ───────────────────
type SearchParams = Record<string, string | string[] | undefined>;

export function pick(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export function resolveNav(sp: SearchParams) {
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

// ── List fetch (resilient: gagal → []) ──────────────────────────
export async function fetchList(query: string, limit: number): Promise<any[]> {
  try {
    const res = await fetchWithTimeout(
      `${API}/content/articles?${query}&limit=${limit}`,
      FETCH_OPTS,
      TIMEOUT_ARTICLE_MS, // 🛡️ konten inti → 9s, JANGAN diturunin (§2)
    );
    const data = await res.json();
    return data?.success ? (data.data ?? []) : [];
  } catch {
    return [];
  }
}

// Hero/nav fetch — viral/nasional via ?type= (kontrak backend).
export async function fetchHeroArticles(type: string, location: string, q: string): Promise<any[]> {
  const params = new URLSearchParams();
  if (type === 'viral') params.set('type', 'viral');
  else if (type === 'nasional') params.set('type', 'nasional');
  if (location !== 'all') params.set('location', location);
  if (q) params.set('q', q);
  return fetchList(params.toString(), 12);
}

// Terpopuler (sidebar) — backend sort=popular (view_count DESC, window 30 hari).
// Sekunder (sidebar) → timeout ketat 3.5s; gagal/521/kosong → [] (page.tsx fallback
// ke TERPOPULER_LIST statis biar sidebar gak pernah kosong). res.ok → 521 HTML gak
// di-parse. Map ke DummyArticle pakai toCarouselArticle (bentuk yg HeroWithSidebar mau).
export async function fetchTerpopuler(limit: number): Promise<DummyArticle[]> {
  try {
    const res = await fetchWithTimeout(
      `${API}/content/articles?sort=popular&limit=${limit}`,
      FETCH_OPTS,
      TIMEOUT_SECONDARY_MS,
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.data)) return [];
    return data.data.map(toCarouselArticle);
  } catch {
    return [];
  }
}

// ── Result-shaped fetch (BEDAIN sukses-kosong vs error) ─────────
// fetchHeroArticles/fetchTerpopuler lama collapse semua ke [] → mustahil bedain
// "DB kosong (sukses)" vs "API error/521". Fungsi baru ini balikin { ok, data }:
//   ok:true  = res.ok && data.success (data BOLEH kosong → empty-state JUJUR)
//   ok:false = throw/timeout/!res.ok/!data.success (error → empty-state LEMBUT)
// Dipakai page.tsx; fetchList lama DIBIARKAN (RegionServer pakai, jangan ubah).
export type FetchResult<T> = { ok: boolean; data: T[] };

export async function fetchHeroResult(
  type: string,
  location: string,
  q: string,
): Promise<FetchResult<any>> {
  const params = new URLSearchParams();
  if (type === 'viral') params.set('type', 'viral');
  else if (type === 'nasional') params.set('type', 'nasional');
  if (location !== 'all') params.set('location', location);
  if (q) params.set('q', q);
  try {
    const res = await fetchWithTimeout(
      `${API}/content/articles?${params.toString()}&limit=12`,
      FETCH_OPTS,
      TIMEOUT_ARTICLE_MS, // konten inti → 9s (§2)
    );
    if (!res.ok) return { ok: false, data: [] };
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.data)) return { ok: false, data: [] };
    return { ok: true, data: data.data };
  } catch {
    return { ok: false, data: [] };
  }
}

export async function fetchTerpopulerResult(limit: number): Promise<FetchResult<DummyArticle>> {
  try {
    const res = await fetchWithTimeout(
      `${API}/content/articles?sort=popular&limit=${limit}`,
      FETCH_OPTS,
      TIMEOUT_SECONDARY_MS,
    );
    if (!res.ok) return { ok: false, data: [] };
    const data = await res.json();
    if (!data?.success || !Array.isArray(data.data)) return { ok: false, data: [] };
    return { ok: true, data: data.data.map(toCarouselArticle) };
  } catch {
    return { ok: false, data: [] };
  }
}

// Query per region: nasional → type, region geografis → location.
export function regionQuery(slug: string): string {
  return slug === 'nasional' ? 'type=nasional' : `location=${encodeURIComponent(slug)}`;
}

// ── Per-region SECONDARY fetch (1 region; di-cache 60s) ─────────
// Dipecah dari fetchTrendingByRegion/fetchStackByRegion (loop ×13) →
// 1 region = 1 call, dipanggil di RegionServer biar bisa stream.
export async function fetchTrendingForRegion(slug: string): Promise<TrendingNativeAd | null> {
  try {
    const res = await fetchWithTimeout(
      `${API}/public/ads/by-position/trending_native?region=${encodeURIComponent(slug)}&limit=1`,
      FETCH_OPTS,
    );
    const data = await res.json();
    return data?.success && Array.isArray(data.data) && data.data[0]
      ? (data.data[0] as TrendingNativeAd)
      : null;
  } catch {
    return null;
  }
}

export async function fetchStackForRegion(slug: string): Promise<StackBannerAd[]> {
  try {
    const res = await fetchWithTimeout(
      `${API}/public/ads/by-position/region_stack?region=${encodeURIComponent(slug)}&limit=2`,
      FETCH_OPTS,
    );
    const data = await res.json();
    return data?.success && Array.isArray(data.data) ? (data.data as StackBannerAd[]) : [];
  } catch {
    return [];
  }
}

export async function fetchCampaigns(): Promise<BadonasiCampaign[]> {
  try {
    const res = await fetchWithTimeout(`${API}/funding/campaigns?limit=12`, FETCH_OPTS);
    const data = await res.json();
    return data?.success && Array.isArray(data.data) ? (data.data as BadonasiCampaign[]) : [];
  } catch {
    return [];
  }
}

export async function fetchReports(): Promise<BalaporReport[]> {
  try {
    const res = await fetchWithTimeout(`${API}/public/reports/recent`, FETCH_OPTS);
    const data = await res.json();
    return data?.success && Array.isArray(data.data) ? (data.data as BalaporReport[]) : [];
  } catch {
    return [];
  }
}

// ── House-slot assignment (INDEX-DERIVABLE — decoupled per region) ──
// 🛡️ Pengganti round-robin counter k/b di BakabarShell lama. Hasil IDENTIK:
//    slot region idx = idx%4 (1=kampanye, 2=balapor, sisanya ads). "Index ke-k
//    kampanye / ke-b balapor" = JUMLAH slot sejenis SEBELUM idx → bisa dihitung
//    independen tanpa loop berurutan (syarat agar tiap region bisa di-stream).
//    Kalau region X dulu dapet Kampanye#2, dia tetap dapet Kampanye#2.
export type HouseSlot = 'kampanye' | 'balapor' | 'ads';

export function houseSlotType(idx: number): HouseSlot {
  const mod = idx % 4;
  if (mod === 1) return 'kampanye';
  if (mod === 2) return 'balapor';
  return 'ads'; // mod 0 & 3 → ADS murni
}

// Ambil `count` laporan dari `all` mulai `offset` (wrap), tanpa duplikat dalam 1 kartu.
function windowReports(all: BalaporReport[], offset: number, count = 3): BalaporReport[] {
  if (!all.length) return [];
  const n = Math.min(count, all.length);
  const out: BalaporReport[] = [];
  for (let i = 0; i < n; i++) out.push(all[(offset + i) % all.length]);
  return out;
}

export type HouseAssignment = {
  slot: HouseSlot;
  campaign: BadonasiCampaign | null;
  reports: BalaporReport[];
};

export function computeHouseAssignment(
  idx: number,
  campaigns: BadonasiCampaign[],
  reports: BalaporReport[],
): HouseAssignment {
  const slot = houseSlotType(idx);

  if (slot === 'kampanye') {
    let k = 0; // jumlah slot kampanye di [0, idx)
    for (let j = 0; j < idx; j++) if (j % 4 === 1) k++;
    const campaign = campaigns.length ? campaigns[k % campaigns.length] : null;
    return { slot, campaign, reports: [] };
  }

  if (slot === 'balapor') {
    let b = 0; // jumlah slot balapor di [0, idx)
    for (let j = 0; j < idx; j++) if (j % 4 === 2) b++;
    return { slot, campaign: null, reports: windowReports(reports, b * 3, 3) };
  }

  return { slot, campaign: null, reports: [] };
}

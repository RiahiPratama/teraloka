'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR Command Center — Content Pulse (Dashboard SMART v1)
// PATH: src/components/admin/content/content-pulse.tsx
// ────────────────────────────────────────────────────────────────
// Tambahan Overview /admin/content buat solo founder yang rotasi
// antar-vertical. Dua sinyal yang BELUM ada di Mission Control:
//   1. Days-since-last-publish → nudge "ayo nulis" (dari velocity[]).
//   2. Content Gaps → kategori kosong/tipis (categories[] cross-ref
//      src/lib/categories.ts canonical).
// 🛡️ FOKUS BAKABAR. Data REUSE dari fetch newsroom-analytics?period=1y
//    di page.tsx (gak fetch ulang). RSS/draft/balapor TIDAK diduplikat
//    (sudah di MissionControlBakabar).
// ════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { Check, PenLine } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { useApi, ApiError } from '@/lib/api/client';
import { CATEGORIES } from '@/lib/categories';
import type { VelocityPoint, CategoryCount } from '@/types/newsroom-analytics';

const HUB_NEW = '/office/newsroom/bakabar/hub/new';
const THIN_THRESHOLD = 3;        // kategori: count < 3 → "tipis"
const REGION_THIN_THRESHOLD = 5; // daerah: total_articles < 5 → "tipis"

/** Hari sejak tanggal terakhir velocity punya count > 0. null = gak ada publish. */
function daysSinceLastPublish(velocity: VelocityPoint[]): { days: number; date: string } | null {
  const withPublish = velocity.filter((v) => v.count > 0);
  if (withPublish.length === 0) return null;
  // velocity terurut by date; ambil tanggal terakhir yang ada publish.
  const last = withPublish.reduce((a, b) => (a.date >= b.date ? a : b));
  const lastTime = new Date(last.date + 'T00:00:00').getTime();
  const days = Math.max(0, Math.floor((Date.now() - lastTime) / 86_400_000));
  return { days, date: last.date };
}

/* ─── 1. Days-since-last-publish banner ─── */
export function LastPublishBanner({ velocity }: { velocity: VelocityPoint[] }) {
  const info = daysSinceLastPublish(velocity);

  // Tone by urgency: <=2 hari santai, 3-6 perhatian, >=7 mendesak.
  const days = info?.days ?? null;
  const urgent = days !== null && days >= 7;
  const warn = days !== null && days >= 3 && days < 7;

  const toneClass = urgent
    ? 'bg-status-warning/8 border-status-warning/30'
    : warn
      ? 'bg-status-info/8 border-status-info/30'
      : 'bg-surface border-border';
  const accent = urgent ? 'text-status-warning' : warn ? 'text-status-info' : 'text-text';

  const message =
    days === null
      ? 'Belum ada artikel terbit'
      : days === 0
        ? 'Terbit hari ini'
        : `${days} hari sejak publish terakhir`;

  return (
    <Card padded className={`flex items-center justify-between gap-3 border ${toneClass}`}>
      <div className="min-w-0">
        <p className={`text-sm font-bold leading-tight ${accent}`}>{message}</p>
        <p className="text-xs text-text-muted mt-0.5">
          {days !== null && days >= 7
            ? 'Cadence turun — jaga ritme terbit biar pembaca balik.'
            : 'Jaga ritme terbit konten BAKABAR.'}
        </p>
      </div>
      <Link
        href={HUB_NEW}
        className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-brand-teal text-white text-xs font-bold hover:bg-brand-teal/90 transition-colors"
      >
        <PenLine size={14} aria-hidden /> Tulis
      </Link>
    </Card>
  );
}

/* ─── 2. Content Gaps (kategori kosong/tipis) ─── */
export function ContentGaps({ categories }: { categories: CategoryCount[] }) {
  // Map count per kategori dari analytics (name = key kategori, mis. 'infrastruktur').
  const countByKey = new Map<string, number>();
  for (const c of categories) countByKey.set(c.name.toLowerCase(), c.count);

  const empty: typeof CATEGORIES = [];
  const thin: Array<{ cat: (typeof CATEGORIES)[number]; count: number }> = [];
  for (const cat of CATEGORIES) {
    const count = countByKey.get(cat.key.toLowerCase()) ?? 0;
    if (count === 0) empty.push(cat);
    else if (count < THIN_THRESHOLD) thin.push({ cat, count });
  }

  // Gak ada gap → jangan ganggu (semua kategori cukup terisi).
  if (empty.length === 0 && thin.length === 0) return null;

  return (
    <Card padded>
      <p className="text-sm font-semibold text-text mb-1">Content Gaps</p>
      <p className="text-xs text-text-muted mb-3">
        Kategori yang masih kurang konten — kandidat produksi berikutnya.
      </p>

      {empty.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
            Kosong (0 artikel)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {empty.map((cat) => (
              <span
                key={cat.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-status-warning/8 border-status-warning/30 text-status-warning"
              >
                {cat.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {thin.length > 0 && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
            Tipis (&lt;{THIN_THRESHOLD} artikel)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {thin.map(({ cat, count }) => (
              <span
                key={cat.key}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-surface-muted border-border text-text-muted"
              >
                {cat.label}
                <span className="text-text-subtle">· {count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

/* ─── 3. Coverage Daerah (SMART v2 — region kosong/tipis) ─── */
// Self-fetch /admin/articles/by-location (11 region MalUt; Sofifi terpisah =
// seat provinsi, by-design). Mirror pola ContentGaps: chip kosong/tipis, fokus
// ke yang actionable. Graceful kalau gagal (return null, gak crash dashboard).

interface RegionCoverage {
  region_id:         string;
  region_name:       string;
  region_type:       string;
  bps_code:          string;
  total_articles:    number;
  last_published_at: string | null;
}

interface ByLocationResponse {
  regions: RegionCoverage[];
  meta: {
    total_articles_aggregated: number;
    unmapped_count:            number;
    regions_with_coverage:     number;
    regions_empty:             number;
    last_computed:             string;
  };
}

export function CoverageRegions() {
  const api = useApi();
  const [regions, setRegions] = useState<RegionCoverage[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get<ByLocationResponse>('/admin/articles/by-location', {
          signal: controller.signal,
        });
        if (cancelled) return;
        setRegions(res?.regions ?? []);
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError || (err as Error)?.name !== 'AbortError') {
          setFailed(true); // graceful — widget hilang, dashboard tetap jalan
        }
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [api]);

  // Gagal fetch atau belum ada data → jangan render (jangan ganggu dashboard).
  if (failed || !regions || regions.length === 0) return null;

  const empty = regions.filter((r) => r.total_articles === 0);
  const thin = regions
    .filter((r) => r.total_articles > 0 && r.total_articles < REGION_THIN_THRESHOLD)
    .sort((a, b) => a.total_articles - b.total_articles);
  const okCount = regions.length - empty.length - thin.length;

  return (
    <Card padded>
      <p className="text-sm font-semibold text-text mb-1">Coverage Daerah</p>
      <p className="text-xs text-text-muted mb-3">
        Sebaran konten per daerah Maluku Utara — daerah kurang = kandidat liputan berikutnya.
      </p>

      {empty.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
            Kosong (0 artikel)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {empty.map((r) => (
              <span
                key={r.region_id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-status-warning/8 border-status-warning/30 text-status-warning"
              >
                {r.region_name}
              </span>
            ))}
          </div>
        </div>
      )}

      {thin.length > 0 && (
        <div className="mb-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
            Tipis (&lt;{REGION_THIN_THRESHOLD} artikel)
          </p>
          <div className="flex flex-wrap gap-1.5">
            {thin.map((r) => (
              <span
                key={r.region_id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-surface-muted border-border text-text-muted"
              >
                {r.region_name}
                <span className="text-text-subtle">· {r.total_articles}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {okCount > 0 && (
        <p className="text-[11px] text-text-subtle flex items-center gap-1">
          <Check size={12} className="text-status-healthy shrink-0" aria-hidden />
          {empty.length === 0 && thin.length === 0
            ? `Semua ${regions.length} daerah ter-cover`
            : `${okCount} daerah lain cukup ter-cover`}
        </p>
      )}
    </Card>
  );
}

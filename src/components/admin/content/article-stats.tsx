/**
 * TeraLoka — ArticleStats
 * Phase 2 · Batch 7e1 — Content Panel Migration
 * Revisi 1 Jun 2026: hapus "Draft Perlu Perhatian" (redundan +
 *   kontradiksi dgn bucket "Draft Mangkrak" di Action Queue yg global,
 *   sedang card ini period-based → angka beda bikin bingung).
 * ------------------------------------------------------------
 * Top-level KPI cards (period-based) untuk RINGKASAN BAKABAR.
 *
 * 2 stats cards:
 * 1. Artikel Published — total published dalam period
 * 2. Total Views — aggregate views dari published articles
 *
 * Catatan: stale drafts kini DIWAKILI bucket "Draft Mangkrak"
 * (global) di komponen Action Queue, bukan di sini.
 */

import { Card } from '@/components/ui/card';
import { formatNum, type ArticleStats as Stats } from '@/types/articles';

interface ArticleStatsProps {
  stats: Stats;
  periodLabel: string;
  loading?: boolean;
}

/* ─── Inline SVG icons (lucide-react style, 20px) ─── */

const IconFileText = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const IconEye = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

/* ─── Single stat card ─── */

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  tone?: 'default' | 'warning' | 'healthy' | 'info';
  loading?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone = 'default',
  loading,
}: StatCardProps) {
  const toneClass: Record<NonNullable<StatCardProps['tone']>, string> = {
    default: 'text-text-muted bg-surface-muted',
    warning: 'text-status-warning bg-status-warning/12',
    healthy: 'text-status-healthy bg-status-healthy/12',
    info:    'text-status-info bg-status-info/12',
  };

  return (
    <Card padded className="flex-1">
      <div className="flex items-start gap-3">
        <div
          className={`flex items-center justify-center h-10 w-10 rounded-lg shrink-0 ${toneClass[tone]}`}
        >
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-text-muted leading-tight">
            {label}
          </p>
          {loading ? (
            <div className="mt-2 h-7 w-16 rounded bg-surface-muted animate-pulse" />
          ) : (
            <p className="text-2xl font-bold text-text mt-1 leading-none">
              {value}
            </p>
          )}
          <p className="text-[11px] text-text-subtle mt-1 leading-tight">{sub}</p>
        </div>
      </div>
    </Card>
  );
}

/* ─── Main component ─── */

export function ArticleStats({
  stats,
  periodLabel,
  loading = false,
}: ArticleStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <StatCard
        icon={<IconFileText />}
        label={`Artikel Published ${periodLabel}`}
        value={stats.published}
        sub="artikel terbit"
        tone="healthy"
        loading={loading}
      />

      <StatCard
        icon={<IconEye />}
        label={`Total Views ${periodLabel}`}
        value={formatNum(stats.totalViews)}
        sub="dari artikel published"
        tone="info"
        loading={loading}
      />
    </div>
  );
}

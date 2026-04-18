'use client';

/**
 * TeraLoka — SidebarMissionControl
 * Phase 2 · Batch 5a — Layout Shell
 * ------------------------------------------------------------
 * Wrapper MissionControlCard untuk konteks sidebar:
 * - Compact variant (width sidebar 256px)
 * - Fetch data langsung dari `/admin/stats`
 * - Handle loading + error state
 * - Derivasi urgent count dari raw stats
 *
 * Data derivation (sesuai PRD data mapping):
 *   urgent = stats.articles.draft
 *          + stats.reports.pending
 *          + stats.campaigns.pending
 *          + stats.listings.pending
 *   total  = sum semua pending + sum semua active (dipakai buat progress bar)
 *
 * Breakdown chip ditampilkan untuk service yg punya pending > 0.
 *
 * Contoh:
 *   <SidebarMissionControl token={authToken} />
 *
 *   // Static mode (kalau parent udah fetch)
 *   <SidebarMissionControl stats={preFetchedStats} />
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
  MissionControlCard,
  type MissionControlCardProps,
} from '@/components/dashboard/mission-control-card';
import type { ServiceKey } from '@/components/ui/badge';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

/* ─── Stats shape — subset dari /admin/stats response ─── */

interface AdminStatsMetric {
  total?: number;
  pending?: number;
  draft?: number;
}

export interface AdminStats {
  users?: AdminStatsMetric;
  listings?: AdminStatsMetric;
  articles?: AdminStatsMetric;
  campaigns?: AdminStatsMetric;
  reports?: AdminStatsMetric;
}

/* ─── Props ─── */

export interface SidebarMissionControlProps {
  /** JWT token — kalau ada, akan fetch otomatis */
  token?: string | null;
  /** Stats pre-fetched dari parent (opsional, alternatif dari token) */
  stats?: AdminStats;
  /** Override navigation onClick — default ke /admin */
  onClick?: () => void;
  /** Href target saat card diklik (kalau onClick tidak di-provide) */
  href?: string;
  className?: string;
}

/* ─── Derivasi urgent breakdown ─── */

interface DerivedMissionData {
  urgentCount: number;
  totalCount: number;
  breakdown: NonNullable<MissionControlCardProps['breakdown']>;
}

function deriveMission(stats: AdminStats): DerivedMissionData {
  const draft = stats.articles?.draft ?? 0;
  const reportsPending = stats.reports?.pending ?? 0;
  const campaignsPending = stats.campaigns?.pending ?? 0;
  const listingsPending = stats.listings?.pending ?? 0;

  const urgentCount =
    draft + reportsPending + campaignsPending + listingsPending;

  // Total = urgent + handled. Handled = total - pending untuk tiap kategori.
  const articlesTotal = stats.articles?.total ?? 0;
  const reportsTotal = stats.reports?.total ?? 0;
  const campaignsTotal = stats.campaigns?.total ?? 0;
  const listingsTotal = stats.listings?.total ?? 0;

  const totalCount =
    articlesTotal + reportsTotal + campaignsTotal + listingsTotal;

  const breakdown: DerivedMissionData['breakdown'] = [];
  if (reportsPending > 0) {
    breakdown.push({
      service: 'balapor' as ServiceKey,
      label: 'Laporan',
      count: reportsPending,
    });
  }
  if (draft > 0) {
    breakdown.push({
      service: 'bakabar' as ServiceKey,
      label: 'Artikel',
      count: draft,
    });
  }
  if (campaignsPending > 0) {
    breakdown.push({
      service: 'badonasi' as ServiceKey,
      label: 'Kampanye',
      count: campaignsPending,
    });
  }
  if (listingsPending > 0) {
    breakdown.push({
      service: 'bakos' as ServiceKey,
      label: 'Listing',
      count: listingsPending,
    });
  }

  return { urgentCount, totalCount, breakdown };
}

/* ─── Component ─── */

export function SidebarMissionControl({
  token,
  stats: propStats,
  onClick,
  href = '/admin',
  className,
}: SidebarMissionControlProps) {
  const [fetchedStats, setFetchedStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState<boolean>(
    propStats === undefined && Boolean(token)
  );
  const [error, setError] = useState<boolean>(false);

  // Fetch stats kalau token ada dan propStats gak di-provide
  useEffect(() => {
    if (propStats || !token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetch(`${API}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && d?.data) {
          setFetchedStats(d.data as AdminStats);
        } else {
          setError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [token, propStats]);

  const activeStats = propStats ?? fetchedStats;

  const handleClick = () => {
    if (onClick) onClick();
    else if (typeof window !== 'undefined' && href) {
      window.location.href = href;
    }
  };

  return (
    <div className={cn('shrink-0 px-3 pt-3', className)}>
      {loading ? (
        <div className="h-[88px] rounded-xl bg-white/[0.06] animate-pulse" />
      ) : error || !activeStats ? (
        // Error state — card minimal, gak bikin layout break
        <div
          className={cn(
            'rounded-xl p-3',
            'bg-gradient-to-br from-brand-teal via-brand-teal-light to-brand-blue',
            'text-white/90 text-[11px]'
          )}
        >
          <div className="font-bold text-[10px] tracking-wider uppercase text-brand-orange-light/90 mb-1">
            Mission Control
          </div>
          <p className="text-white/70 leading-relaxed">
            Data tidak bisa dimuat. Cek koneksi API.
          </p>
        </div>
      ) : (
        (() => {
          const { urgentCount, totalCount, breakdown } =
            deriveMission(activeStats);
          return (
            <MissionControlCard
              variant="compact"
              urgentCount={urgentCount}
              totalCount={totalCount}
              breakdown={breakdown}
              onClick={handleClick}
              emptyTitle="Semua beres!"
              emptyMessage="Tidak ada aksi tertunda."
            />
          );
        })()
      )}
    </div>
  );
}

'use client';

/**
 * TeraLoka — AdvertiserStatsCards
 * SESI 5A BATCH 2A (18 Mei 2026)
 * ------------------------------------------------------------
 * 4 stat cards untuk Tab Advertiser di /admin/ads.
 *
 * Cards (computed from list data, no extra API call):
 *   1. Total Advertiser   — overall count
 *   2. Aktif              — status='active' AND !founder_rejected
 *   3. Suspended          — status='suspended'
 *   4. Banned             — status='banned'
 *
 * Plus 1 extra subtle row: Founder Veto count (warning indicator).
 */

import { Users, CheckCircle2, Pause, Ban, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Advertiser } from './AdvertiserPanel';

export interface AdvertiserStatsCardsProps {
  advertisers: Advertiser[];
  loading?: boolean;
}

export default function AdvertiserStatsCards({ advertisers, loading }: AdvertiserStatsCardsProps) {
  const stats = computeStats(advertisers);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-4 py-3 rounded-xl bg-surface-muted/40 border border-border animate-pulse">
            <div className="h-8 w-12 bg-surface-muted rounded mb-2" />
            <div className="h-3 w-20 bg-surface-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Main 4 Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          icon={Users}
          label="Total Advertiser"
          value={stats.total}
          colorClass="text-text bg-surface-muted/40 border-border"
          iconClass="text-text-muted"
        />
        <StatCard
          icon={CheckCircle2}
          label="Aktif"
          value={stats.active}
          colorClass="text-status-healthy bg-status-healthy/8 border-status-healthy/30"
          iconClass="text-status-healthy"
        />
        <StatCard
          icon={Pause}
          label="Suspended"
          value={stats.suspended}
          colorClass="text-status-warning bg-status-warning/8 border-status-warning/30"
          iconClass="text-status-warning"
        />
        <StatCard
          icon={Ban}
          label="Banned"
          value={stats.banned}
          colorClass="text-balapor bg-balapor/8 border-balapor/30"
          iconClass="text-balapor"
        />
      </div>

      {/* Founder Veto Indicator (kalau ada) */}
      {stats.founder_vetoed > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-bakabar/8 border border-bakabar/30">
          <ShieldAlert size={14} className="text-bakabar shrink-0" />
          <p className="text-[11px] font-semibold text-bakabar">
            {stats.founder_vetoed} advertiser di-veto founder
          </p>
        </div>
      )}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  colorClass,
  iconClass,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  colorClass: string;
  iconClass: string;
}) {
  return (
    <div className={cn('flex flex-col gap-1 px-4 py-3 rounded-xl border', colorClass)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
          {label}
        </span>
        <Icon size={14} className={iconClass} />
      </div>
      <span className="text-[20px] font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

// ─── Compute Stats Helper ────────────────────────────────────

function computeStats(advertisers: Advertiser[]) {
  return advertisers.reduce(
    (acc, adv) => {
      acc.total++;
      if (adv.status === 'active' && !adv.founder_rejected) acc.active++;
      if (adv.status === 'suspended') acc.suspended++;
      if (adv.status === 'banned') acc.banned++;
      if (adv.founder_rejected) acc.founder_vetoed++;
      return acc;
    },
    { total: 0, active: 0, suspended: 0, banned: 0, founder_vetoed: 0 },
  );
}

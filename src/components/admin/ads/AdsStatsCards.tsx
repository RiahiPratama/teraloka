'use client';

/**
 * TeraLoka — AdsStatsCards
 * Sub-Phase 8-E Sesi 4 (18 Mei 2026)
 * ------------------------------------------------------------
 * CHANGE Sesi 4:
 *   - REMOVED Card #5 "Total Reach Lifetime" (vanity metric, Pattern T)
 *   - ADDED   Card #5 "Revenue Bulan Ini" (Phase 2 placeholder)
 *
 * Card behavior:
 *   - 'slot'     → click scroll ke panel Slot Inventory
 *   - 'active'   → click filter status='active' + scroll table
 *   - 'pending'  → click filter status='pending_review' + scroll table
 *   - 'ending'   → click filter status='active' + endingSoonOnly + scroll table
 *   - 'revenue'  → click navigate ke /admin/financial
 *
 * Pattern Compliance:
 *   - Pattern T  : NO vanity lifetime impressions
 *   - Pattern AAZ: Honest empty state (Revenue Rp 0 + "Coming Phase 2" badge)
 *   - Pattern AAY: Cross-page navigation ke /admin/financial untuk drill-down
 *
 * History:
 *   - 16 Mei 2026: v2 mirror BALAPOR ReportStats pattern
 *   - 18 Mei 2026: Sesi 4 — KILL vanity Total Reach + ADD Revenue placeholder
 */

import type { ReactNode } from 'react';
import {
  Crosshair,
  Megaphone,
  Hourglass,
  AlarmClock,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdRow } from './AdsCommandCenter';

const TOTAL_POSITIONS = 13; // dari VALID_POSITIONS Mission 7-B

export interface AdsStatsCardsProps {
  ads: AdRow[];
  total: number;
  /** Optional — click handler per card. id: slot/active/pending/ending/revenue */
  onCardClick?: (id: string) => void;
  loading?: boolean;
  className?: string;
}

interface StatDef {
  id: string;
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  iconBg: string;
  valueColor: string;
  alert?: boolean;
}

export default function AdsStatsCards({
  ads,
  total,
  onCardClick,
  loading = false,
  className,
}: AdsStatsCardsProps) {
  // ─── Real aggregation ──────────────────────────────────────────
  const activeAds = ads.filter((a) => a.status === 'active' && !a.deleted_at);

  const pendingReview = ads.filter(
    (a) => a.status === 'pending_review' && !a.deleted_at
  ).length;

  // Slot terisi: unique positions yg ada minimal 1 active ad
  const filledPositions = new Set<string>();
  activeAds.forEach((a) => a.positions.forEach((p) => filledPositions.add(p)));
  const slotFilled = filledPositions.size;
  const slotFillRate =
    TOTAL_POSITIONS > 0 ? Math.round((slotFilled / TOTAL_POSITIONS) * 100) : 0;

  // Akan berakhir: ends_at dalam 24 jam (active only)
  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;
  const endingSoon = activeAds.filter((a) => {
    const endsMs = new Date(a.ends_at).getTime();
    return endsMs > now && endsMs < next24h;
  }).length;

  const items: StatDef[] = [
    {
      id: 'slot',
      icon: <Crosshair size={18} />,
      label: 'Slot Terisi',
      value: `${slotFilled}/${TOTAL_POSITIONS}`,
      sub: `${slotFillRate}% inventory aktif`,
      iconBg: 'bg-ads/12 text-ads',
      valueColor: 'text-ads-strong dark:text-ads',
    },
    {
      id: 'active',
      icon: <Megaphone size={18} />,
      label: 'Ads Aktif',
      value: String(activeAds.length),
      sub: `Total: ${total} iklan`,
      iconBg: 'bg-status-info/12 text-status-info',
      valueColor: 'text-status-info',
    },
    {
      id: 'pending',
      icon: <Hourglass size={18} />,
      label: 'Pending Review',
      value: String(pendingReview),
      sub: pendingReview > 0 ? '⚠ Perlu tindakan' : '✓ Tidak ada antrian',
      iconBg:
        pendingReview > 0
          ? 'bg-status-critical/12 text-status-critical'
          : 'bg-surface-muted text-text-muted',
      valueColor: pendingReview > 0 ? 'text-status-critical' : 'text-text',
      alert: pendingReview > 0,
    },
    {
      id: 'ending',
      icon: <AlarmClock size={18} />,
      label: 'Akan Berakhir',
      value: String(endingSoon),
      sub: endingSoon > 0 ? '< 24 jam lagi' : 'Aman 24 jam ke depan',
      iconBg:
        endingSoon > 0
          ? 'bg-status-warning/12 text-status-warning'
          : 'bg-surface-muted text-text-muted',
      valueColor: endingSoon > 0 ? 'text-status-warning' : 'text-text',
      alert: endingSoon > 0,
    },
    // ─── Sesi 4: KILLED 'reach' (vanity), REPLACED dengan 'revenue' ──
    {
      id: 'revenue',
      icon: <Wallet size={18} />,
      label: 'Revenue Bulan Ini',
      value: 'Rp 0',
      sub: '⚠ Coming Money Phase 2',
      iconBg: 'bg-status-healthy/12 text-status-healthy',
      valueColor: 'text-text-muted',
    },
  ];

  return (
    <div
      className={cn(
        'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3',
        className
      )}
    >
      {items.map((s) => {
        const isClickable = Boolean(onCardClick);
        const Wrapper = isClickable ? 'button' : 'div';
        return (
          <Wrapper
            key={s.id}
            type={isClickable ? 'button' : undefined}
            onClick={isClickable ? () => onCardClick!(s.id) : undefined}
            className={cn(
              'flex items-center gap-3 p-4',
              'bg-surface border border-border rounded-xl',
              'transition-all text-left w-full',
              isClickable && [
                'cursor-pointer hover:border-ads/40 hover:bg-ads/3',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ads/30',
              ]
            )}
            title={
              isClickable
                ? s.id === 'revenue'
                  ? 'Buka Financial Dashboard'
                  : `Filter ke ${s.label}`
                : undefined
            }
          >
            <div
              className={cn(
                'flex items-center justify-center h-10 w-10 rounded-lg shrink-0',
                s.iconBg
              )}
            >
              {s.icon}
            </div>
            <div className="min-w-0">
              {loading ? (
                <>
                  <div className="h-7 w-16 rounded bg-surface-muted animate-pulse mb-1.5" />
                  <div className="h-2.5 w-20 rounded bg-surface-muted animate-pulse" />
                </>
              ) : (
                <>
                  <div
                    className={cn(
                      'text-2xl font-extrabold tabular-nums leading-none tracking-tight',
                      s.valueColor
                    )}
                  >
                    {s.value}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] mt-1 leading-tight',
                      s.alert
                        ? 'text-status-critical font-semibold'
                        : 'text-text-muted'
                    )}
                  >
                    {s.sub}
                  </div>
                </>
              )}
            </div>
          </Wrapper>
        );
      })}
    </div>
  );
}

'use client';

/**
 * TeraLoka — AdsBottomPanels
 * Sub-Phase 8-E Sesi 4 (18 Mei 2026)
 * ------------------------------------------------------------
 * CHANGE Sesi 4:
 *   - REMOVED Panel #3 "Performance by Position" (vanity lifetime, Pattern T)
 *   - ADDED   Panel #3 "Action Queue" — clickable urgent items
 *
 * 3 Panels:
 *   1. Slot Inventory — 13 positions × count filled/empty (top 6)
 *      ID: 'slot-inventory-panel' untuk scroll target
 *   2. Ads Pipeline — grouping by status, clickable filter
 *   3. Action Queue — 3 kategori urgent items (NEW)
 *
 * Action Queue Categories:
 *   - 📋 Pending Review     (status='pending_review' count)
 *   - ⏰ Akan Berakhir <24h (active + ends_at < now+24h)
 *   - 📉 Slot Kosong        (13 - filled positions count)
 *
 * Click behavior (via onActionQueueClick prop):
 *   - 'pending'      → filter status='pending_review' + scroll table
 *   - 'ending'       → filter status='active' + endingSoonOnly + scroll table
 *   - 'slot_kosong'  → scroll ke Panel #1 Slot Inventory (no filter change)
 *
 * Pattern Compliance:
 *   - Pattern T  : NO vanity lifetime impressions
 *   - Pattern AAZ: Honest empty state "✓ Semua aman" kalau zero
 *   - Pattern AAY: Action-oriented drill-down via filter
 *
 * History:
 *   - 16 Mei 2026: v2 (Tailwind utility + design tokens)
 *   - 18 Mei 2026: Sesi 4 — KILL vanity Performance + ADD Action Queue
 */

import {
  Check, Circle, AlertCircle, Wallet, Play, Pause, ArchiveX,
  CheckCircle2, AlarmClock, ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdRow } from './AdsCommandCenter';

const TOTAL_POSITIONS = 13;

export type ActionQueueKind = 'pending' | 'ending' | 'slot_kosong';

export interface AdsBottomPanelsProps {
  ads: AdRow[];
  /** Optional — click handler position di Slot Inventory */
  onPositionClick?: (positionKey: string) => void;
  /** Optional — click handler stage di Pipeline */
  onStageClick?: (status: string) => void;
  /** Optional — click handler Action Queue items (Sesi 4 NEW) */
  onActionQueueClick?: (kind: ActionQueueKind) => void;
  className?: string;
}

// 13 positions dengan label human-readable
const POSITIONS_META: Array<{ key: string; label: string; size: string }> = [
  { key: 'top_leaderboard',      label: 'Top Billboard',     size: '1680×220' },
  { key: 'skyscraper_left',      label: 'Sidebar Slot Kiri', size: '160×600'  },
  { key: 'skyscraper_right',     label: 'Sidebar Slot Kanan',size: '160×600'  },
  { key: 'trending_native',      label: 'Trending Native',   size: 'Inline'   },
  { key: 'region_stack',         label: 'Stack Banner',      size: 'Block'    },
  { key: 'political_banner',     label: 'Politisi Banner',   size: 'Hero'     },
  { key: 'homepage_hero_banner', label: 'Hero Fallback',     size: 'Hero'     },
  { key: 'inline_banner',        label: 'Inline 8:1',        size: '1600×200' },
  { key: 'native',               label: 'Native In-Article', size: 'Inline'   },
  { key: 'sidebar',              label: 'Sidebar Generic',   size: 'Vary'     },
  { key: 'banner',               label: 'Banner Generic',    size: 'Vary'     },
  { key: 'in_article',           label: 'In Article',        size: 'Inline'   },
  { key: 'homepage',             label: 'Homepage Generic',  size: 'Vary'     },
];

export default function AdsBottomPanels({
  ads,
  onPositionClick,
  onStageClick,
  onActionQueueClick,
  className,
}: AdsBottomPanelsProps) {
  const activeAds = ads.filter((a) => a.status === 'active' && !a.deleted_at);

  // ─── Panel 1 data: Slot Inventory (top 6) ─────────────────────
  const slotInventory = POSITIONS_META.map((pos) => {
    const filledCount = activeAds.filter((a) =>
      a.positions.includes(pos.key)
    ).length;
    return { ...pos, filled: filledCount };
  })
    .sort((a, b) => b.filled - a.filled)
    .slice(0, 6);

  // ─── Panel 2 data: Ads Pipeline ───────────────────────────────
  const pipelineStages = [
    {
      key:    'pending_review',
      label:  'Pending Review',
      sub:    'Perlu tindakan',
      icon:   <AlertCircle size={16} />,
      bg:     'bg-status-critical/8 hover:bg-status-critical/12',
      color:  'text-status-critical',
      count:  ads.filter((a) => a.status === 'pending_review' && !a.deleted_at).length,
    },
    {
      key:    'pending_payment',
      label:  'Pending Payment',
      sub:    'Nunggu transfer',
      icon:   <Wallet size={16} />,
      bg:     'bg-status-warning/8 hover:bg-status-warning/12',
      color:  'text-status-warning',
      count:  ads.filter((a) => a.status === 'pending_payment' && !a.deleted_at).length,
    },
    {
      key:    'active',
      label:  'Active',
      sub:    'Sedang tayang',
      icon:   <Play size={16} />,
      bg:     'bg-status-healthy/8 hover:bg-status-healthy/12',
      color:  'text-status-healthy',
      count:  activeAds.length,
    },
    {
      key:    'paused',
      label:  'Paused',
      sub:    'Di-pause manual',
      icon:   <Pause size={16} />,
      bg:     'bg-status-info/8 hover:bg-status-info/12',
      color:  'text-status-info',
      count:  ads.filter((a) => a.status === 'paused' && !a.deleted_at).length,
    },
    {
      key:    'expired',
      label:  'Expired',
      sub:    'Sudah berakhir',
      icon:   <ArchiveX size={16} />,
      bg:     'bg-surface-muted hover:bg-surface-muted/80',
      color:  'text-text-muted',
      count:  ads.filter((a) => a.status === 'expired' && !a.deleted_at).length,
    },
  ];

  // ─── Panel 3 data: Action Queue (NEW Sesi 4) ──────────────────
  const now = Date.now();
  const next24h = now + 24 * 60 * 60 * 1000;

  const pendingReviewCount = ads.filter(
    (a) => a.status === 'pending_review' && !a.deleted_at
  ).length;

  const endingSoonCount = activeAds.filter((a) => {
    const endsMs = new Date(a.ends_at).getTime();
    return endsMs > now && endsMs < next24h;
  }).length;

  const filledPositions = new Set<string>();
  activeAds.forEach((a) => a.positions.forEach((p) => filledPositions.add(p)));
  const slotKosongCount = Math.max(TOTAL_POSITIONS - filledPositions.size, 0);

  const actionQueueItems = [
    {
      key:       'pending' as ActionQueueKind,
      label:     'Pending Review',
      sub:       'Iklan menunggu approval',
      icon:      <AlertCircle size={16} />,
      bg:        'bg-status-critical/8 hover:bg-status-critical/15',
      color:     'text-status-critical',
      count:     pendingReviewCount,
      urgent:    pendingReviewCount > 0,
    },
    {
      key:       'ending' as ActionQueueKind,
      label:     'Akan Berakhir',
      sub:       'Active ads < 24 jam',
      icon:      <AlarmClock size={16} />,
      bg:        'bg-status-warning/8 hover:bg-status-warning/15',
      color:     'text-status-warning',
      count:     endingSoonCount,
      urgent:    endingSoonCount > 0,
    },
    {
      key:       'slot_kosong' as ActionQueueKind,
      label:     'Slot Kosong',
      sub:       `${slotKosongCount} dari ${TOTAL_POSITIONS} posisi belum terisi`,
      icon:      <Circle size={16} />,
      bg:        'bg-status-info/8 hover:bg-status-info/15',
      color:     'text-status-info',
      count:     slotKosongCount,
      urgent:    false, // info-level, bukan urgent
    },
  ];

  const allAreClean =
    pendingReviewCount === 0 && endingSoonCount === 0 && slotKosongCount === 0;

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3',
        className
      )}
    >
      {/* ── Panel 1: Slot Inventory ── */}
      <div id="slot-inventory-panel">
        <PanelCard
          title="SLOT INVENTORY"
          subtitle="Top 6 positions"
          icon={<CrosshairIcon className="text-ads" />}
        >
          <div className="flex flex-col">
            {slotInventory.map((slot, idx) => {
              const isLast = idx === slotInventory.length - 1;
              const isFilled = slot.filled > 0;
              const isClickable = Boolean(onPositionClick);
              const Wrapper = isClickable ? 'button' : 'div';
              return (
                <Wrapper
                  key={slot.key}
                  type={isClickable ? 'button' : undefined}
                  onClick={isClickable ? () => onPositionClick!(slot.key) : undefined}
                  className={cn(
                    'flex items-center justify-between gap-2 py-2.5',
                    !isLast && 'border-b border-border',
                    isClickable && 'hover:bg-surface-muted/40 transition-colors -mx-1 px-1 rounded'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={cn(
                        'flex items-center justify-center w-7 h-7 rounded-md shrink-0',
                        isFilled
                          ? 'bg-status-healthy/12 text-status-healthy'
                          : 'bg-surface-muted text-text-subtle'
                      )}
                    >
                      {isFilled ? <Check size={14} /> : <Circle size={14} />}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[12px] font-semibold text-text truncate">
                        {slot.label}
                      </div>
                      <div className="text-[10px] text-text-muted">
                        {slot.size}
                      </div>
                    </div>
                  </div>
                  <span
                    className={cn(
                      'shrink-0 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide',
                      isFilled
                        ? 'bg-status-healthy/12 text-status-healthy'
                        : 'bg-status-critical/12 text-status-critical'
                    )}
                  >
                    {isFilled ? `${slot.filled} aktif` : 'Empty'}
                  </span>
                </Wrapper>
              );
            })}
          </div>
        </PanelCard>
      </div>

      {/* ── Panel 2: Ads Pipeline ── */}
      <PanelCard
        title="ADS PIPELINE"
        subtitle="Status flow real-time"
        icon={<AlertCircle className="text-ads" />}
      >
        <div className="flex flex-col gap-2">
          {pipelineStages.map((stage) => {
            const isClickable = Boolean(onStageClick);
            const Wrapper = isClickable ? 'button' : 'div';
            return (
              <Wrapper
                key={stage.key}
                type={isClickable ? 'button' : undefined}
                onClick={isClickable ? () => onStageClick!(stage.key) : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg',
                  'transition-colors',
                  stage.bg,
                  isClickable && 'cursor-pointer'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={cn('shrink-0', stage.color)}>{stage.icon}</div>
                  <div className="min-w-0">
                    <div className={cn('text-[12px] font-bold leading-tight', stage.color)}>
                      {stage.label}
                    </div>
                    <div className={cn('text-[10px] opacity-80', stage.color)}>
                      {stage.sub}
                    </div>
                  </div>
                </div>
                <div className={cn('text-xl font-extrabold tabular-nums', stage.color)}>
                  {stage.count}
                </div>
              </Wrapper>
            );
          })}
        </div>
      </PanelCard>

      {/* ── Panel 3: Action Queue (NEW Sesi 4) ── */}
      <PanelCard
        title="ACTION QUEUE"
        subtitle="Tindakan urgent — klik untuk filter"
        icon={<ListChecks className="text-ads" />}
      >
        {allAreClean ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 py-8">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-status-healthy/12">
              <CheckCircle2 className="text-status-healthy" size={24} />
            </div>
            <p className="text-[13px] font-bold text-status-healthy">✓ Semua aman</p>
            <p className="text-[10px] text-text-muted text-center max-w-[200px]">
              Tidak ada item yang butuh action segera. Pertahankan!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {actionQueueItems.map((item) => {
              const isClickable = Boolean(onActionQueueClick);
              const Wrapper = isClickable ? 'button' : 'div';
              return (
                <Wrapper
                  key={item.key}
                  type={isClickable ? 'button' : undefined}
                  onClick={isClickable ? () => onActionQueueClick!(item.key) : undefined}
                  className={cn(
                    'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg',
                    'transition-colors',
                    item.bg,
                    isClickable && 'cursor-pointer'
                  )}
                  title={
                    isClickable
                      ? item.key === 'slot_kosong'
                        ? 'Scroll ke panel Slot Inventory'
                        : `Filter tabel ke ${item.label}`
                      : undefined
                  }
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={cn('shrink-0', item.color)}>{item.icon}</div>
                    <div className="min-w-0 text-left">
                      <div className={cn('text-[12px] font-bold leading-tight', item.color)}>
                        {item.label}
                      </div>
                      <div className={cn('text-[10px] opacity-80', item.color)}>
                        {item.sub}
                      </div>
                    </div>
                  </div>
                  <div className={cn('text-xl font-extrabold tabular-nums shrink-0', item.color)}>
                    {item.count}
                  </div>
                </Wrapper>
              );
            })}
          </div>
        )}
      </PanelCard>
    </div>
  );
}

// ─── Internal subcomponent: PanelCard ───────────────────────────

function PanelCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 min-h-[280px]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-[11px] font-bold text-text uppercase tracking-wider">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[10px] text-text-muted mt-0.5">{subtitle}</p>
          )}
        </div>
        {icon && <div className="shrink-0">{icon}</div>}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

// ─── Crosshair icon (renamed dari `Crosshair` lokal untuk avoid lucide collision) ──

function CrosshairIcon({ className }: { className?: string }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="22" y1="12" x2="18" y2="12" />
      <line x1="6" y1="12" x2="2" y2="12" />
      <line x1="12" y1="6" x2="12" y2="2" />
      <line x1="12" y1="22" x2="12" y2="18" />
    </svg>
  );
}

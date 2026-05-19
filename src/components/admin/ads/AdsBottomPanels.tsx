'use client';

/**
 * TeraLoka — AdsBottomPanels
 * Sub-Phase 8-E-4 (17 Mei 2026)
 * ------------------------------------------------------------
 * CHANGE Sub-Phase 8-E-4:
 *   - Action Queue panel sekarang render dari API data (/admin/ads/action-queue)
 *   - Expand 3 kategori → 5 kategori (tambah Pending Payment + Renewal Risk)
 *   - ActionQueueKind type: 5 values explicit
 *   - Empty state berdasarkan total_actions dari API (Pattern AAZ)
 *
 * 3 Panels:
 *   1. Slot Inventory — 13 positions × count filled/empty (top 6)
 *   2. Ads Pipeline — grouping by status, clickable filter
 *   3. Action Queue — 5 kategori dari API endpoint /action-queue
 *
 * Action Queue Categories (5 kategori dari API):
 *   - 📋 Pending Review     — count + items dari API
 *   - ⏰ Akan Berakhir <7d  — count + items dari API
 *   - 💰 Pending Payment    — count + items dari API (NEW E-3)
 *   - 🔄 Renewal Risk <30d  — count + items dari API (NEW E-3)
 *   - 📉 Slot Kosong        — count + items dari API
 *
 * Pattern Compliance:
 *   - Pattern T  : NO vanity lifetime impressions
 *   - Pattern AAZ: Honest empty state "✓ Semua aman" kalau total_actions=0
 *   - Pattern AAY: Action-oriented drill-down via filter
 *   - Backend = Otak (5 query parallel di action-queue-engine.ts)
 *   - Frontend = Wajah (display + capture click only)
 *
 * History:
 *   - 16 Mei 2026: v2 (Tailwind utility + design tokens)
 *   - 18 Mei 2026 sesi sebelumnya: Action Queue 3 kategori (client-derived)
 *   - 17 Mei 2026 Sub-Phase 8-E-4: render dari API 5 kategori
 */

import {
  Check, Circle, AlertCircle, Wallet, Play, Pause, ArchiveX,
  CheckCircle2, AlarmClock, ListChecks, RefreshCw, ArrowUpRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdRow } from './AdsCommandCenter';
// SESI 5D-2 (19 Mei 2026): Position render type model
import {
  POSITION_RENDER_METADATA,
  getPositionMetadata,
  computeCapacityStatus,
  formatCapacityDisplay,
  type CapacityStatus,
} from './position-render-metadata';

const TOTAL_POSITIONS = 13;

// ─── Action Queue Types (sync dengan backend action-queue-engine.ts) ──

export type ActionQueueKind =
  | 'pending_review'
  | 'expire_soon'
  | 'pending_payment'
  | 'renewal_risk'
  | 'slot_empty';

export interface ActionQueueItem {
  ad_id:           string;
  display_id:      string | null;
  title:           string | null;
  advertiser_name: string;
}

export interface PendingReviewItem extends ActionQueueItem {
  created_at:      string;
  hours_pending:   number;
  advertiser_type: string;
}

export interface ExpireSoonItem extends ActionQueueItem {
  ends_at:        string;
  days_remaining: number;
}

export interface PendingPaymentItem extends ActionQueueItem {
  advertiser_phone:      string | null;
  expected_payment_date: string | null;
  payment_due_at:        string | null;
  days_overdue:          number | null;
}

export interface RenewalRiskItem extends ActionQueueItem {
  ends_at:        string;
  days_remaining: number;
  renewal_status: string | null;
}

export interface SlotEmptyInfo {
  position:    string;
  has_pending: boolean;
}

export interface ActionQueueData {
  pending_review:  { count: number; items: PendingReviewItem[] };
  expire_soon:     { count: number; items: ExpireSoonItem[] };
  pending_payment: { count: number; items: PendingPaymentItem[] };
  renewal_risk:    { count: number; items: RenewalRiskItem[] };
  slot_empty:      { count: number; items: SlotEmptyInfo[] };
  total_actions:   number;
  generated_at:    string;
}

// ─── Component Props ─────────────────────────────────────────

export interface AdsBottomPanelsProps {
  ads: AdRow[];
  /** API data dari /admin/ads/action-queue (Sub-Phase 8-E-4) */
  actionQueueData: ActionQueueData | null;
  /** Loading state untuk action queue */
  actionQueueLoading?: boolean;
  /** Optional — click handler position di Slot Inventory */
  onPositionClick?: (positionKey: string) => void;
  /** Optional — click handler stage di Pipeline */
  onStageClick?: (status: string) => void;
  /** Optional — click handler Action Queue items */
  onActionQueueClick?: (kind: ActionQueueKind) => void;
  className?: string;
}

// SESI 5D-2 (19 Mei 2026): POSITIONS_META derived dari source-of-truth metadata.
// realDim + aspectRatio + renderType + capacity awareness sekarang akurat
// per audit komponen Bakabar (lihat position-render-metadata.ts).
const POSITIONS_META: Array<{ key: string; label: string; size: string }> = Object.values(
  POSITION_RENDER_METADATA
).map((meta) => ({
  key:   meta.key,
  label: meta.label,
  size:  meta.realDim, // dimensi spesifik real, bukan tebakan
}));

export default function AdsBottomPanels({
  ads,
  actionQueueData,
  actionQueueLoading = false,
  onPositionClick,
  onStageClick,
  onActionQueueClick,
  className,
}: AdsBottomPanelsProps) {
  const activeAds = ads.filter((a) => a.status === 'active' && !a.deleted_at);

  // ─── Panel 1 data: Slot Inventory (ALL 13 positions, SESI 5D-2) ─────────────────────
  const slotInventory = POSITIONS_META.map((pos) => {
    const filledCount = activeAds.filter((a) =>
      a.positions.includes(pos.key)
    ).length;
    return { ...pos, filled: filledCount };
  })
    .sort((a, b) => b.filled - a.filled);

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

  // ─── Panel 3 data: Action Queue dari API (Sub-Phase 8-E-4) ────
  // Pattern AAZ honest empty state: kalau actionQueueData null atau total=0
  const totalActions = actionQueueData?.total_actions ?? 0;
  const allAreClean = !actionQueueLoading && totalActions === 0;

  const actionQueueItems = [
    {
      key:       'pending_review' as ActionQueueKind,
      label:     'Pending Review',
      sub:       'Iklan menunggu approval',
      icon:      <AlertCircle size={16} />,
      bg:        'bg-status-critical/8 hover:bg-status-critical/15',
      color:     'text-status-critical',
      count:     actionQueueData?.pending_review.count ?? 0,
      urgent:    (actionQueueData?.pending_review.count ?? 0) > 0,
    },
    {
      key:       'expire_soon' as ActionQueueKind,
      label:     'Akan Berakhir',
      sub:       'Active ads <7 hari',
      icon:      <AlarmClock size={16} />,
      bg:        'bg-status-warning/8 hover:bg-status-warning/15',
      color:     'text-status-warning',
      count:     actionQueueData?.expire_soon.count ?? 0,
      urgent:    (actionQueueData?.expire_soon.count ?? 0) > 0,
    },
    {
      key:       'pending_payment' as ActionQueueKind,
      label:     'Pending Payment',
      sub:       'Advertiser belum bayar',
      icon:      <Wallet size={16} />,
      bg:        'bg-status-warning/8 hover:bg-status-warning/15',
      color:     'text-status-warning',
      count:     actionQueueData?.pending_payment.count ?? 0,
      urgent:    (actionQueueData?.pending_payment.count ?? 0) > 0,
    },
    {
      key:       'renewal_risk' as ActionQueueKind,
      label:     'Renewal Risk',
      sub:       'Active expire <30 hari',
      icon:      <RefreshCw size={16} />,
      bg:        'bg-status-warning/8 hover:bg-status-warning/15',
      color:     'text-status-warning',
      count:     actionQueueData?.renewal_risk.count ?? 0,
      urgent:    (actionQueueData?.renewal_risk.count ?? 0) >= 5,
    },
    {
      key:       'slot_empty' as ActionQueueKind,
      label:     'Slot Kosong',
      sub:       `${actionQueueData?.slot_empty.count ?? 0} dari ${TOTAL_POSITIONS} posisi`,
      icon:      <Circle size={16} />,
      bg:        'bg-status-info/8 hover:bg-status-info/15',
      color:     'text-status-info',
      count:     actionQueueData?.slot_empty.count ?? 0,
      urgent:    false,
    },
  ];

  // ─── Render ────────────────────────────────────────────────────
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3',
        className
      )}
    >
      {/* ── Panel 1: Slot Inventory (SESI 5E Phase 3b: PIPELINE-style colored rows) ── */}
      <div id="slot-inventory-panel">
        <PanelCard
          title="SLOT INVENTORY"
          subtitle={`Semua ${slotInventory.length} posisi`}
          icon={<CrosshairIcon className="text-ads" />}
        >
          <div className="flex flex-col gap-2 max-h-[340px] overflow-y-auto pr-1">
            {slotInventory.map((slot) => {
              const isFilled = slot.filled > 0;
              const isClickable = Boolean(onPositionClick);
              const Wrapper = isClickable ? 'button' : 'div';
              // SESI 5E Phase 3b: pre-compute capacity status untuk row bg color
              const meta = getPositionMetadata(slot.key);
              const status = computeCapacityStatus(slot.filled, meta.recommendedMaxActive);
              const display = formatCapacityDisplay(meta, slot.filled);
              const renderTypeLabel: Record<string, string> = {
                SINGLE_FIXED:   'POOL',
                CAROUSEL_MULTI: 'CAROUSEL',
                LIST_STACKED:   'LIST',
              };
              const statusBadgeStyle: Record<CapacityStatus, string> = {
                available:     'bg-status-warning/12 text-status-warning',
                optimal:       'bg-status-healthy/12 text-status-healthy',
                near_full:     'bg-amber-500/15 text-amber-500',
                over_capacity: 'bg-status-critical/12 text-status-critical',
                unlimited_ok:  'bg-status-healthy/12 text-status-healthy',
              };
              // Row bg semantic per status (mirror ADS PIPELINE + ACTION QUEUE pattern)
              const statusRowBg: Record<CapacityStatus, string> = {
                available:     'bg-status-warning/8 hover:bg-status-warning/12',
                optimal:       'bg-status-healthy/8 hover:bg-status-healthy/12',
                near_full:     'bg-amber-500/8 hover:bg-amber-500/15',
                over_capacity: 'bg-status-critical/8 hover:bg-status-critical/12',
                unlimited_ok:  'bg-status-healthy/8 hover:bg-status-healthy/12',
              };
              return (
                <Wrapper
                  key={slot.key}
                  type={isClickable ? 'button' : undefined}
                  onClick={isClickable ? () => onPositionClick!(slot.key) : undefined}
                  className={cn(
                    'flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg',
                    'transition-colors w-full text-left',
                    statusRowBg[status],
                    isClickable && 'cursor-pointer'
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
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={cn(
                      'px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide',
                      statusBadgeStyle[status]
                    )}>
                      {display}
                    </span>
                    <span className="text-[8px] text-text-subtle font-semibold tracking-wider">
                      {renderTypeLabel[meta.renderType] || 'UNKNOWN'}
                    </span>
                  </div>
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

      {/* ── Panel 3: Action Queue (5 kategori dari API — Sub-Phase 8-E-4) ── */}
      <PanelCard
        title="ACTION QUEUE"
        subtitle={
          actionQueueLoading
            ? 'Memuat data dari backend...'
            : actionQueueData
            ? `${totalActions} tindakan menunggu`
            : 'Tidak ada data'
        }
        icon={<ListChecks className="text-ads" />}
      >
        {actionQueueLoading && !actionQueueData ? (
          // Loading skeleton
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-12 rounded-lg bg-surface-muted animate-pulse"
              />
            ))}
          </div>
        ) : allAreClean ? (
          // Empty state — Pattern AAZ honest "Semua aman"
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
          // 5 kategori action list
          <div className="flex flex-col gap-1.5 overflow-y-auto max-h-[280px]">
            {actionQueueItems.map((item) => {
              const isClickable = Boolean(onActionQueueClick);
              const Wrapper = isClickable ? 'button' : 'div';
              const isZero = item.count === 0;

              return (
                <Wrapper
                  key={item.key}
                  type={isClickable ? 'button' : undefined}
                  onClick={
                    isClickable && !isZero
                      ? () => onActionQueueClick!(item.key)
                      : undefined
                  }
                  disabled={isZero}
                  className={cn(
                    'flex items-center justify-between gap-2 px-3 py-2 rounded-lg',
                    'transition-colors text-left w-full',
                    isZero ? 'opacity-40 cursor-not-allowed' : item.bg,
                    isClickable && !isZero && 'cursor-pointer'
                  )}
                  title={
                    isClickable && !isZero
                      ? item.key === 'slot_empty'
                        ? 'Scroll ke panel Slot Inventory'
                        : `Filter tabel ke ${item.label}`
                      : isZero
                      ? 'Tidak ada item'
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
                  <div className="flex items-center gap-1 shrink-0">
                    <div className={cn('text-lg font-extrabold tabular-nums', item.color)}>
                      {item.count}
                    </div>
                    {isClickable && !isZero && (
                      <ArrowUpRight size={12} className={cn('opacity-50', item.color)} />
                    )}
                  </div>
                </Wrapper>
              );
            })}

            {/* Timestamp freshness indicator */}
            {actionQueueData?.generated_at && (
              <p className="text-[9px] text-text-subtle text-center mt-1 italic">
                Update terakhir:{' '}
                {new Date(actionQueueData.generated_at).toLocaleTimeString('id-ID', {
                  hour:   '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </p>
            )}
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
    <div className="bg-surface border border-border rounded-xl p-4 flex flex-col gap-3 h-[420px]">
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

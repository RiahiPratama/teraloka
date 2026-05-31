/**
 * TeraLoka — AdsTableRow (v6 — SESI 5F Payment Recording)
 * Mission 8 Sub-Phase 8-C-1 → 8-E-5 → 8-E-6 → SESI 5F BATCH 4
 * ------------------------------------------------------------
 * v6 Changes (SESI 5F, 19 Mei 2026):
 *   - ADD button "Catat Bayar" untuk status pending_payment/pending_review/active/paused
 *   - Conditional: hide jika status=paid (sudah dibayar)
 *   - New prop: onRecordPayment(ad)
 *
 * v5 (Sub-Phase 8-E-6 Mini A + Mini C):
 *   - Mini A: Render display_id (ADS-2026-NNNN) di bawah ad title
 *   - Mini C: ADD Eye icon button di Aksi column → trigger preview modal
 *   - New prop: onPreview(ad)
 *
 * History:
 *   - 16 Mei 2026: v2 NEW
 *   - 16 Mei 2026: v3 +Edit button
 *   - 17 Mei 2026: v4 bulk checkbox cell
 *   - 17 Mei 2026: v5 display_id + Eye preview button
 *   - 19 Mei 2026: v6 +Catat Bayar button (SESI 5F)
 */

import Link from 'next/link';
import { Image as ImageIcon, Play, Pause, Check, X, Trash2, Undo2, Pencil, CheckSquare, Square, Eye, Wallet, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdRow } from './AdsCommandCenter';

export interface AdsTableRowProps {
  ad: AdRow;
  /** Sub-Phase 8-E-5: bulk selection state */
  isSelected: boolean;
  onSelectToggle: (adId: string) => void;
  /** Sub-Phase 8-E-6 Mini C: open preview modal */
  onPreview: (ad: AdRow) => void;
  /** SESI 5F: open payment record modal */
  onRecordPayment: (ad: AdRow) => void;
  onTransition: (adId: string, to: string) => void | Promise<void>;
  onSoftDelete: (adId: string, title: string) => void | Promise<void>;
  onRestore:    (adId: string) => void | Promise<void>;
  onReject:     (adId: string, title: string) => void | Promise<void>;
  onClick?: (ad: AdRow) => void;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; classes: string }
> = {
  draft:           { label: 'Draft',        classes: 'bg-surface-muted text-text-muted border border-dashed border-border' },
  pending_payment: { label: 'Pending Pay',  classes: 'bg-status-warning/12 text-status-warning' },
  pending_review:  { label: 'Review',       classes: 'bg-status-critical/12 text-status-critical' },
  active:          { label: 'Active',       classes: 'bg-status-healthy/12 text-status-healthy' },
  paused:          { label: 'Paused',       classes: 'bg-status-info/12 text-status-info' },
  rejected:        { label: 'Rejected',     classes: 'bg-balapor/12 text-balapor' },
  expired:         { label: 'Expired',      classes: 'bg-surface-muted text-text-muted' },
  deleted:         { label: 'Deleted',      classes: 'bg-balapor/12 text-balapor' },
};

export default function AdsTableRow({
  ad,
  isSelected,
  onSelectToggle,
  onPreview,
  onRecordPayment,
  onTransition,
  onSoftDelete,
  onRestore,
  onReject,
  onClick,
  className,
}: AdsTableRowProps) {
  const isDeleted = ad.deleted_at !== null;
  const isDCA = Array.isArray(ad.creative_frames) && ad.creative_frames.length >= 2;
  const status = STATUS_CONFIG[ad.status] ?? STATUS_CONFIG.expired;
  const adTitle = ad.title ?? '(no title)';

  const ctr =
    ad.impression_count > 0
      ? `${((ad.click_count / ad.impression_count) * 100).toFixed(2)}%`
      : '—';

  return (
    <tr
      className={cn(
        'border-b border-border last:border-b-0',
        'transition-colors',
        onClick && 'cursor-pointer hover:bg-surface-muted/40',
        isSelected && 'bg-ads/8',
        isDeleted && 'opacity-60',
        className
      )}
      onClick={onClick ? () => onClick(ad) : undefined}
    >
      {/* ─── Col 0: Checkbox ─── */}
      <td
        className="px-3 py-3 align-top w-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => onSelectToggle(ad.id)}
          className="flex items-center justify-center w-5 h-5 rounded hover:bg-surface-muted transition-colors"
          title={isSelected ? 'Hapus dari pilihan' : 'Pilih iklan ini'}
        >
          {isSelected ? (
            <CheckSquare size={14} className="text-ads" />
          ) : (
            <Square size={14} className="text-text-muted" />
          )}
        </button>
      </td>

      {/* ─── Col 1: Iklan (thumbnail + title + display_id) ─── */}
      <td className="px-3 py-3 align-top">
        <div className="flex items-center gap-3">
          {ad.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={ad.image_url}
              alt=""
              className="w-10 h-10 rounded-md object-cover shrink-0 bg-surface-muted"
            />
          ) : (
            <div className="w-10 h-10 rounded-md bg-surface-muted flex items-center justify-center shrink-0 text-text-subtle">
              <ImageIcon size={16} />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-text truncate max-w-[200px]">
              {adTitle}
            </div>

            {/* Sub-Phase 8-E-6 Mini A: display_id + ad_format + DCA badge */}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {ad.display_id && (
                <span
                  className="font-mono text-[9px] font-bold text-text-muted tracking-wide"
                  title="Display ID (untuk customer support reference)"
                >
                  {ad.display_id}
                </span>
              )}
              {ad.display_id && (
                <span className="text-text-subtle text-[9px]">·</span>
              )}
              {isDCA && (
                <span
                  className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide bg-ads-muted text-ads-strong dark:text-ads"
                  title={`Dynamic Creative — ${ad.creative_frames?.length} frames`}
                >
                  DCA {ad.creative_frames?.length}f
                </span>
              )}
              <span className="text-[10px] text-text-muted capitalize">
                {ad.ad_format}
              </span>
            </div>
          </div>
        </div>
      </td>

      {/* ─── Col 2: Advertiser ─── */}
      <td className="px-3 py-3 align-top">
        <div className="text-[11px] font-semibold text-text truncate max-w-[140px]">
          {ad.advertiser_name}
        </div>
        <div className="text-[10px] text-text-muted mt-0.5 capitalize">
          {ad.advertiser_type}
        </div>
      </td>

      {/* ─── Col 3: Status ─── */}
      <td className="px-3 py-3 align-top">
        <span
          className={cn(
            'inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide whitespace-nowrap',
            status.classes
          )}
        >
          {status.label}
        </span>
      </td>

      {/* ─── Col 4: Positions ─── */}
      <td className="px-3 py-3 align-top">
        <div className="flex flex-wrap gap-1 max-w-[160px]">
          {ad.positions.slice(0, 2).map((p) => (
            <span
              key={p}
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-bakabar/10 text-bakabar whitespace-nowrap"
              title={p}
            >
              {p}
            </span>
          ))}
          {ad.positions.length > 2 && (
            <span
              className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface-muted text-text-muted"
              title={ad.positions.slice(2).join(', ')}
            >
              +{ad.positions.length - 2}
            </span>
          )}
        </div>
      </td>

      {/* ─── Col 5: Region ─── */}
      <td className="px-3 py-3 align-top">
        {ad.target_regions === null ? (
          <span className="text-[10px] text-text-muted italic">
            Semua region
          </span>
        ) : (
          <div className="flex flex-wrap gap-1 max-w-[120px]">
            {ad.target_regions.slice(0, 2).map((r) => (
              <span
                key={r}
                className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-baronda/10 text-baronda whitespace-nowrap"
              >
                {r}
              </span>
            ))}
            {ad.target_regions.length > 2 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-surface-muted text-text-muted">
                +{ad.target_regions.length - 2}
              </span>
            )}
          </div>
        )}
      </td>

      {/* ─── Col 6: Impressions ─── */}
      <td className="px-3 py-3 align-top text-right">
        <div className="text-[11px] font-bold text-text tabular-nums">
          {formatNum(ad.impression_count)}
        </div>
        <div className="text-[10px] text-text-muted tabular-nums">
          {formatNum(ad.click_count)} clicks
        </div>
      </td>

      {/* ─── Col 7: CTR ─── */}
      <td className="px-3 py-3 align-top text-right">
        <span className="text-[11px] font-semibold text-text tabular-nums">
          {ctr}
        </span>
      </td>

      {/* ─── Col 8: Actions ─── */}
      <td
        className="px-3 py-3 align-top text-right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-1 justify-end flex-wrap">
          {/* Sub-Phase 8-E-6 Mini C: Eye preview button (always visible, first) */}
          <button
            type="button"
            onClick={() => onPreview(ad)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap',
              'bg-ads/12 text-ads hover:bg-ads/20'
            )}
            title="Lihat preview iklan"
          >
            <Eye size={11} />
            Lihat
          </button>

          {renderActions(ad, isDeleted, {
            onTransition,
            onSoftDelete,
            onRestore,
            onReject,
            onRecordPayment,
            adTitle,
          })}
        </div>
      </td>
    </tr>
  );
}

// ─── Action buttons renderer ──────────────────────────────────────

function renderActions(
  ad: AdRow,
  isDeleted: boolean,
  handlers: {
    onTransition: (id: string, to: string) => void | Promise<void>;
    onSoftDelete: (id: string, title: string) => void | Promise<void>;
    onRestore:    (id: string) => void | Promise<void>;
    onReject:     (id: string, title: string) => void | Promise<void>;
    onRecordPayment: (ad: AdRow) => void;
    adTitle:      string;
  }
) {
  const btnClass =
    'inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide transition-colors whitespace-nowrap';

  if (isDeleted) {
    return (
      <button
        type="button"
        onClick={() => handlers.onRestore(ad.id)}
        className={cn(btnClass, 'bg-status-info/12 text-status-info hover:bg-status-info/20')}
        title="Pulihkan dari Sampah"
      >
        <Undo2 size={11} />
        Restore
      </button>
    );
  }

  const buttons: React.ReactNode[] = [];

  // SESI 5F: Catat Bayar button — show untuk status yang belum final/paid
  // Hide kalau status='paid' (sudah dibayar) atau rejected/expired/deleted
  if (
    ad.status === 'pending_payment' ||
    ad.status === 'pending_review' ||
    ad.status === 'active' ||
    ad.status === 'paused'
  ) {
    buttons.push(
      <button
        key="record-payment"
        type="button"
        onClick={() => handlers.onRecordPayment(ad)}
        className={cn(btnClass, 'bg-status-healthy/12 text-status-healthy hover:bg-status-healthy/20')}
        title="Catat pembayaran iklan"
      >
        <Wallet size={11} />
        Bayar
      </button>
    );
  }

  if (ad.status === 'active') {
    buttons.push(
      <button
        key="pause"
        type="button"
        onClick={() => handlers.onTransition(ad.id, 'paused')}
        className={cn(btnClass, 'bg-status-info/12 text-status-info hover:bg-status-info/20')}
        title="Pause iklan sementara"
      >
        <Pause size={11} />
        Pause
      </button>
    );
  } else if (ad.status === 'paused') {
    buttons.push(
      <button
        key="resume"
        type="button"
        onClick={() => handlers.onTransition(ad.id, 'active')}
        className={cn(btnClass, 'bg-status-healthy/12 text-status-healthy hover:bg-status-healthy/20')}
        title="Resume iklan ke active"
      >
        <Play size={11} />
        Resume
      </button>
    );
  } else if (ad.status === 'pending_payment' || ad.status === 'pending_review') {
    buttons.push(
      <button
        key="activate"
        type="button"
        onClick={() => handlers.onTransition(ad.id, 'active')}
        className={cn(btnClass, 'bg-status-healthy/12 text-status-healthy hover:bg-status-healthy/20')}
        title="Aktifkan iklan (skip queue)"
      >
        <Check size={11} />
        Aktifkan
      </button>,
      <button
        key="reject"
        type="button"
        onClick={() => handlers.onReject(ad.id, handlers.adTitle)}
        className={cn(btnClass, 'bg-balapor/12 text-balapor hover:bg-balapor/20')}
        title="Tolak iklan dengan alasan"
      >
        <X size={11} />
        Reject
      </button>
    );
  }

  buttons.push(
    ad.status === 'draft' ? (
      <Link
        key="edit"
        href={`/admin/ads/${ad.id}/edit`}
        onClick={(e) => e.stopPropagation()}
        className={cn(btnClass, 'bg-ads/12 text-ads hover:bg-ads/20')}
        title="Lanjutkan & finalisasi draft ini"
      >
        Lanjutkan
        <ArrowRight size={11} />
      </Link>
    ) : (
      <Link
        key="edit"
        href={`/admin/ads/${ad.id}/edit`}
        onClick={(e) => e.stopPropagation()}
        className={cn(btnClass, 'bg-baronda/12 text-baronda hover:bg-baronda/20')}
        title="Edit detail iklan"
      >
        <Pencil size={11} />
        Edit
      </Link>
    )
  );

  buttons.push(
    <button
      key="delete"
      type="button"
      onClick={() => handlers.onSoftDelete(ad.id, handlers.adTitle)}
      className={cn(btnClass, 'bg-balapor/12 text-balapor hover:bg-balapor/20')}
      title="Hapus iklan ke Sampah"
    >
      <Trash2 size={11} />
      Hapus
    </button>
  );

  return buttons;
}

// ─── Helpers ─────────────────────────────────────────────────────

function formatNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

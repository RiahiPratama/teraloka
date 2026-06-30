'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — LaundryCard (1 row /businesses)
// PATH: src/components/balaundry/admin/LaundryCard.tsx
// Render row apa adanya (WAJAH only). Responsif 375px+desktop.
// Aksi per-row → callback ke page (page yang panggil useApi + modal).
// owner = owner_id (uuid, BE tidak join nama). lokasi = address.
// ════════════════════════════════════════════════════════════════
import type { AdminBusinessRow } from '@/lib/balaundry-links';
import { cn } from '@/lib/utils';

interface LaundryCardProps {
  row: AdminBusinessRow;
  /** True saat row ini sedang submit aksi → disable tombol. */
  busy?: boolean;
  onVerify: (row: AdminBusinessRow) => void;
  onReject: (row: AdminBusinessRow) => void;
  onToggleStatus: (row: AdminBusinessRow) => void;
  /** Multi-select (bulk-verify) */
  selected?: boolean;
  onToggleSelect?: (row: AdminBusinessRow) => void;
  /** Disable checkbox (mis. udah capai cap 100 & row ini belum kepilih). */
  selectDisabled?: boolean;
}

function Badge({
  icon,
  label,
  className,
}: {
  icon: string;
  label: string;
  className: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        className,
      )}
    >
      <span className="material-symbols-outlined text-[13px] leading-none">{icon}</span>
      {label}
    </span>
  );
}

function Meta({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
      <span className="material-symbols-outlined text-[15px] leading-none text-text-subtle">
        {icon}
      </span>
      {children}
    </span>
  );
}

export function LaundryCard({
  row,
  busy = false,
  onVerify,
  onReject,
  onToggleStatus,
  selected = false,
  onToggleSelect,
  selectDisabled = false,
}: LaundryCardProps) {
  const selectable = Boolean(onToggleSelect);
  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-4 transition-colors',
        selected ? 'border-balaundry ring-1 ring-balaundry/30' : 'border-border',
      )}
    >
      {/* ── Header: checkbox + nama + badges ── */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-2.5">
          {selectable && (
            <input
              type="checkbox"
              checked={selected}
              disabled={selectDisabled && !selected}
              onChange={() => onToggleSelect?.(row)}
              aria-label={`Pilih ${row.name}`}
              title={selectDisabled && !selected ? 'Maksimal 100 per bulk' : undefined}
              className="mt-0.5 h-4 w-4 shrink-0 accent-balaundry disabled:opacity-40"
            />
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-bold text-text">{row.name}</h3>
            <p className="mt-0.5 font-mono text-xs text-text-subtle">{row.display_id ?? '—'}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {row.is_verified ? (
            <Badge icon="verified" label="Terverifikasi" className="bg-status-healthy/12 text-status-healthy" />
          ) : (
            <Badge icon="pending" label="Pending" className="bg-status-warning/15 text-status-warning" />
          )}
          {row.is_active ? (
            <Badge icon="check_circle" label="Aktif" className="bg-surface-muted text-text-secondary" />
          ) : (
            <Badge icon="do_not_disturb_on" label="Nonaktif" className="bg-status-critical/12 text-status-critical" />
          )}
          {row.listing_tier === 'featured' && (
            <Badge icon="star" label="Featured" className="bg-balaundry-muted text-balaundry" />
          )}
        </div>
      </div>

      {/* ── Meta ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <Meta icon="person">Owner: <span className="font-mono">{row.owner_id.slice(0, 8)}</span></Meta>
        <Meta icon="location_on">{row.address?.trim() || '—'}</Meta>
        <Meta icon="dry_cleaning">{row.services_count} layanan</Meta>
        <Meta icon="receipt_long">{row.orders_count} pesanan</Meta>
        <Meta icon="workspace_premium">{row.subscription_tier}</Meta>
      </div>

      {/* ── Aksi ── */}
      <div className="mt-4 flex flex-wrap gap-2 border-t border-border-muted pt-3">
        {row.is_verified ? (
          <button
            type="button"
            onClick={() => onReject(row)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:text-text disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">cancel</span>
            Batalkan verifikasi
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onVerify(row)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg bg-balaundry px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Verifikasi
          </button>
        )}
        {row.is_active ? (
          <button
            type="button"
            onClick={() => onToggleStatus(row)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-status-critical/40 bg-surface px-3 py-1.5 text-xs font-semibold text-status-critical transition-colors hover:bg-status-critical/10 disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">block</span>
            Suspend
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onToggleStatus(row)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-balaundry/40 bg-surface px-3 py-1.5 text-xs font-semibold text-balaundry transition-colors hover:bg-balaundry-muted disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[16px]">play_circle</span>
            Aktifkan
          </button>
        )}
      </div>
    </div>
  );
}

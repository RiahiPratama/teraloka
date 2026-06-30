'use client';
// ════════════════════════════════════════════════════════════════
// BALAUNDRY Admin — MetricCard (Command Center)
// PATH: src/components/balaundry/admin/MetricCard.tsx
// Kartu metrik reusable. WAJAH only — render angka apa adanya.
// Token only (var --color-balaundry via util tailwind), Material Symbols.
// highlight = aksen "perlu aksi" (balaundry-surya), buat pending_verify.
// ════════════════════════════════════════════════════════════════
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  /** Material Symbols icon name (mis. 'storefront', 'verified', 'pending') */
  icon: string;
  label: string;
  value: number | string;
  hint?: string;
  /** Aksen alert (pending_verify / perlu aksi) */
  highlight?: boolean;
  loading?: boolean;
  /** CTA opsional di bawah angka (mis. "Verifikasi sekarang") */
  action?: ReactNode;
}

export function MetricCard({
  icon,
  label,
  value,
  hint,
  highlight = false,
  loading = false,
  action,
}: MetricCardProps) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface p-4">
        <div className="h-9 w-9 animate-pulse rounded-lg bg-surface-muted" />
        <div className="mt-3 h-7 w-16 animate-pulse rounded bg-surface-muted" />
        <div className="mt-2 h-4 w-24 animate-pulse rounded bg-surface-muted" />
      </div>
    );
  }

  const showAksiBadge = highlight && value !== 0 && value !== '0';

  return (
    <div
      className={cn(
        'rounded-xl border bg-surface p-4 transition-colors',
        highlight ? 'border-balaundry-surya/50' : 'border-border',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={cn(
            'inline-flex h-9 w-9 items-center justify-center rounded-lg',
            highlight
              ? 'bg-balaundry-surya/15 text-balaundry-surya'
              : 'bg-balaundry-muted text-balaundry',
          )}
        >
          <span className="material-symbols-outlined text-[20px] leading-none">
            {icon}
          </span>
        </span>
        {showAksiBadge && (
          <span className="inline-flex items-center rounded-full bg-balaundry-surya/15 px-2 py-0.5 text-[11px] font-semibold text-balaundry-surya">
            perlu aksi
          </span>
        )}
      </div>

      <div
        className={cn(
          'mt-3 text-2xl font-bold tabular-nums',
          highlight ? 'text-balaundry-surya' : 'text-text',
        )}
      >
        {value}
      </div>
      <div className="mt-0.5 text-sm text-text-muted">{label}</div>
      {hint && <div className="mt-0.5 text-xs text-text-subtle">{hint}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

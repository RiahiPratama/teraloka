'use client';

/**
 * TeraLoka — Ticker Badges (Admin)
 * ------------------------------------------------------------
 * 2 badge TERPISAH untuk taxonomy ticker baru (BUKAN 1 priority lama):
 *   - UrgensiBadge  → warna by urgensi (darurat=merah, breaking=kuning,
 *                     normal=info, promo=netral). Reuse <Badge variant="status">.
 *   - KategoriBadge → ikon lucide + label by kategori.
 *
 * Mapping enum (label + ikon lucide) ada di constants (TICKER_URGENSI /
 * TICKER_KATEGORI) — SATU sumber, dipakai admin & publik.
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { TICKER_URGENSI, TICKER_KATEGORI } from '@/utils/constants';
import type { TickerUrgensi, TickerKategori } from '@/types/common';

export function UrgensiBadge({ urgensi }: { urgensi: TickerUrgensi }) {
  const cfg = TICKER_URGENSI[urgensi];
  return (
    <Badge variant="status" status={cfg.status} size="sm">
      {cfg.label}
    </Badge>
  );
}

export function KategoriBadge({ kategori }: { kategori: TickerKategori }) {
  const cfg = TICKER_KATEGORI[kategori];
  const Icon = cfg.Icon;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full',
        'h-5 px-2 text-[11px] font-semibold whitespace-nowrap',
        'bg-surface-muted text-text-secondary border border-border'
      )}
    >
      <Icon size={12} className="shrink-0" aria-hidden="true" />
      {cfg.label}
    </span>
  );
}

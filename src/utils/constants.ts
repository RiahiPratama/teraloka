/** Design System TeraLoka */

export const COLORS = {
  primary: '#1B6B4A',    // hijau laut
  secondary: '#E8963A',  // sunset
  accent: '#2196F3',     // biru langit
  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#16A34A',
  muted: '#6B7280',
  background: '#FFFFFF',
  surface: '#F9FAFB',
} as const;

/**
 * Ticker taxonomy 2-field (sinkron backend). Pure data — tanpa React/lucide
 * supaya aman dipakai di server & client component.
 *
 * urgensi → warna (Badge status + CSS var buat dot publik). Match enum persis.
 * kategori → label + ikon lucide (SATU sumber, dipakai admin & publik). Ikon ini
 *   non-client value → aman diimpor di server component (Ticker.tsx) maupun client.
 *
 * CATATAN: FE TIDAK me-render urutan dari urgensi — backend yang sort + sticky
 * darurat + drop promo saat darurat. FE render response apa adanya.
 */
import {
  AlertTriangle,
  Ship,
  Landmark,
  HeartHandshake,
  Newspaper,
  Tag,
  type LucideIcon,
} from 'lucide-react';
import type {
  TickerUrgensi,
  TickerKategori,
} from '@/types/common';
import type { BadgeStatus } from '@/components/ui/badge';

export const TICKER_URGENSI: Record<
  TickerUrgensi,
  { label: string; status: BadgeStatus; dot: string }
> = {
  darurat: { label: 'Darurat', status: 'critical', dot: 'var(--color-status-critical)' },
  breaking: { label: 'Breaking', status: 'warning', dot: 'var(--color-status-warning)' },
  normal: { label: 'Normal', status: 'info', dot: 'var(--color-status-info)' },
  promo: { label: 'Promo', status: 'neutral', dot: 'var(--color-text-muted)' },
};

export const TICKER_KATEGORI: Record<
  TickerKategori,
  { label: string; Icon: LucideIcon }
> = {
  bahaya: { label: 'Bahaya', Icon: AlertTriangle },
  transport: { label: 'Transport', Icon: Ship },
  civic: { label: 'Civic', Icon: Landmark },
  kemanusiaan: { label: 'Kemanusiaan', Icon: HeartHandshake },
  berita: { label: 'Berita', Icon: Newspaper },
  komersial: { label: 'Komersial', Icon: Tag },
};

/** Kategori yang WAJIB punya expires_at (selaras gatekeep backend). */
export const TICKER_KATEGORI_REQUIRE_TTL: TickerKategori[] = ['bahaya', 'transport'];

export const LISTING_TIERS = {
  ekonomi: { maxPrice: 800_000, fee: 0, label: 'Ekonomi' },
  menengah: { maxPrice: 1_500_000, fee: 100_000, label: 'Menengah' },
  premium: { maxPrice: Infinity, fee: 200_000, label: 'Premium' },
} as const;

export const COMMISSION_RATES = {
  speed_tidore: { type: 'flat', amount: 2_000 },
  speed_long: { type: 'percentage', rate: 0.10 },
  ship: { type: 'percentage', rate: 0.10 },
  kos: { type: 'first_month', rate: 1 },
  property_sell: { type: 'percentage', rate: 0.01 },
  property_rent: { type: 'first_month', rate: 1 },
  vehicle_sell: { type: 'percentage', rate: 0.02 },
} as const;

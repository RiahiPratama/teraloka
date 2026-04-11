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

export const TICKER_PRIORITY = {
  darurat: { color: '#DC2626', emoji: '🔴', level: 1 },
  kemanusiaan: { color: '#2196F3', emoji: '🔵', level: 2 },
  breaking: { color: '#F59E0B', emoji: '🟡', level: 3 },
  transport: { color: '#16A34A', emoji: '🟢', level: 4 },
  promo: { color: '#9CA3AF', emoji: '⚪', level: 5 },
} as const;

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

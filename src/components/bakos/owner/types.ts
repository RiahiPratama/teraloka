// ════════════════════════════════════════════════════════════════
// BAKOS Owner — Shared FE Types (mirror backend OwnerOverview)
// PATH: src/components/bakos/owner/types.ts
// PENANDA: L5-FE-OWNER-TYPES
// ────────────────────────────────────────────────────────────────
// Frontend & backend = repo terpisah → tipe didefinisikan ulang di sini,
// sinkron dengan GET /bakos/owner/overview (owner-dashboard-service.ts).
// ════════════════════════════════════════════════════════════════

export type OwnerKosGate =
  | 'pending_verify' // draft → nunggu admin verifikasi (belum tayang)
  | 'live_locked' // active + kontak terkunci → tayang, belum bayar
  | 'live_unlocked' // active + kontak terbuka → langganan aktif
  | 'inactive'; // dijeda / nonaktif

export interface OwnerKosCard {
  id: string;
  display_id: string | null;
  title: string;
  slug: string;
  status: string;
  listing_fee_status: string;
  listing_tier: string | null; // ekonomi|menengah|premium
  price: number | null;
  cover_image_url: string | null;
  photos_count: number;
  rooms_sum: number;
  rooms_cap: number | null; // null = unlimited
  has_room_types: boolean;
  view_count: number;
  contact_count: number;
  gate: OwnerKosGate;
  created_at: string;
}

export interface OwnerSubscriptionInfo {
  tier: string;
  label: string;
  price_monthly: number;
  db_status: string; // none|active|expired|grace
  paid_until: string | null;
  is_expired: boolean;
  contact_active: boolean;
}

export interface OwnerQuotaInfo {
  listings_used: number;
  listings_max: number;
  can_add_listing: { ok: boolean; code?: string; message?: string };
  rooms_cap: number | null;
  photos_max: number;
}

export interface OwnerOverview {
  subscription: OwnerSubscriptionInfo;
  quota: OwnerQuotaInfo;
  listings: OwnerKosCard[];
}

// ─── Design tokens (mockup bakos-owner-dashboard.html) ───────────
export const BAKOS_TOKENS = {
  pageBg: '#EFEDE5',
  surface: '#FFFFFF',
  surfaceAlt: '#F7F6F1',
  border: '#D3D1C7',
  textPrimary: '#2C2C2A',
  textSecondary: '#5F5E5A',
  textTertiary: '#888780',
  accent: '#854F0B',
  accentBg: '#FAEEDA',
} as const;

// ─── Gate → tampilan badge ───────────────────────────────────────
export interface GateView {
  label: string;
  bg: string;
  fg: string;
  icon: 'clock' | 'lock' | 'check' | 'pause';
}

export const GATE_VIEW: Record<OwnerKosGate, GateView> = {
  pending_verify: { label: 'Menunggu verifikasi', bg: '#FAEEDA', fg: '#412402', icon: 'clock' },
  live_locked: { label: 'Tayang · kontak terkunci', bg: '#E6F1FB', fg: '#042C53', icon: 'lock' },
  live_unlocked: { label: 'Aktif', bg: '#E1F5EE', fg: '#04342C', icon: 'check' },
  inactive: { label: 'Dijeda', bg: '#F1EFE8', fg: '#5F5E5A', icon: 'pause' },
};

export function formatRp(n: number | null | undefined): string {
  if (n == null) return '—';
  return 'Rp ' + n.toLocaleString('id-ID');
}

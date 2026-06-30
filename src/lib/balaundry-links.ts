// ════════════════════════════════════════════════════════════════
// BALAUNDRY — Shared constants, types & helpers (public)
// PATH: src/lib/balaundry-links.ts
// Mirror pola src/components/bakos/public/bakos-links.ts.
// Display-only: tipe = whitelist field backend (anti-leak). FE render apa adanya.
// ════════════════════════════════════════════════════════════════

import type { SyntheticEvent } from 'react';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

// ─── Directory / detail laundry (15 field whitelist backend) ──────────
export interface Laundry {
  id: string;
  display_id: string | null;
  slug: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  whatsapp: string | null;
  operating_hours: unknown;       // jsonb — guard saat render
  photos: string[];
  cover_image_url: string | null;
  listing_tier: string;           // 'normal' | 'featured'
  rating_avg: number;
  rating_count: number;
  location_id: string | null;
  // detail-only (GET /laundry/:slug)
  created_at?: string;
  location_name?: string | null;
  services?: Service[];
}

// ─── Service (detail) ─────────────────────────────────────────────────
export interface Service {
  id: string;
  business_id: string;
  name: string;
  type: string;   // reguler|express|satuan|kiloan
  unit: string;   // kg|pcs
  price: number;
  est_hours: number | null;
}

// ─── Tracking (7 field — anti-leak, no customer info) ─────────────────
export interface TrackingResult {
  display_id: string;
  laundry_name: string | null;
  order_status: string;
  created_at: string;
  items_summary: { name: string; qty: number }[];
  total: number;
  timeline: { to_status: string; at: string }[];
}

// ─── Review (3 field — anti-leak) ─────────────────────────────────────
export interface Review {
  rating: number;
  comment: string | null;
  created_at: string;
}

// ─── Order status — label + tone (untuk badge/timeline tracking) ──────
// 14 status backend (state machine). tone → kelas warna di CSS.
export const ORDER_STATUS: Record<string, { label: string; tone: string }> = {
  pickup_requested:  { label: 'Permintaan jemput', tone: 'wait' },
  pickup_enroute:    { label: 'Kurir menuju lokasi', tone: 'go' },
  picked_up:         { label: 'Sudah dijemput', tone: 'go' },
  created:           { label: 'Pesanan dibuat', tone: 'wait' },
  received:          { label: 'Diterima outlet', tone: 'go' },
  washing:           { label: 'Dicuci', tone: 'go' },
  drying:            { label: 'Dikeringkan', tone: 'go' },
  ironing:           { label: 'Disetrika', tone: 'go' },
  packing:           { label: 'Dikemas', tone: 'go' },
  ready:             { label: 'Siap diambil', tone: 'ready' },
  delivery_enroute:  { label: 'Dalam pengantaran', tone: 'go' },
  delivered:         { label: 'Sudah diantar', tone: 'ready' },
  completed:         { label: 'Selesai', tone: 'done' },
  cancelled:         { label: 'Dibatalkan', tone: 'cancel' },
};

export function statusLabel(s: string): string {
  return ORDER_STATUS[s]?.label ?? s;
}

// ─── Helpers ──────────────────────────────────────────────────────────
export function formatRupiah(n: number): string {
  return `Rp ${Math.round(n).toLocaleString('id-ID')}`;
}

// Placeholder abu-abu (SVG inline) untuk gambar gagal load.
export const IMG_FALLBACK =
  "data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'%20width='400'%20height='320'%3E%3Crect%20width='400'%20height='320'%20fill='%23eef2f7'/%3E%3Cpath%20d='M200%20130l-58%2044v66h116v-66z'%20fill='none'%20stroke='%23b9c4d4'%20stroke-width='8'%20stroke-linejoin='round'/%3E%3C/svg%3E";

export function onImgError(e: SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget;
  if (img.dataset.fb) return;
  img.dataset.fb = '1';
  img.src = IMG_FALLBACK;
}

// ─── Admin: Command Center overview (GET /admin/balaundry/overview) ───
// Shape PERSIS kontrak BE (PRD §3). FE render apa adanya — NOL business logic.
export interface OverviewStats {
  businesses: {
    total: number;
    verified: number;
    pending_verify: number;
    active: number;
    inactive: number;
  };
  orders: {
    total: number;
    active: number;
    completed: number;
    today: number;
  };
  services_total: number;
  staff_total: number;
}

// Path builders (opsional — konsistensi).
export const directoryUrl = (params: string) => `${API_URL}/balaundry/directory${params ? `?${params}` : ''}`;
export const detailUrl = (slug: string) => `${API_URL}/balaundry/laundry/${encodeURIComponent(slug)}`;
export const reviewsUrl = (slug: string, params: string) =>
  `${API_URL}/balaundry/laundry/${encodeURIComponent(slug)}/reviews${params ? `?${params}` : ''}`;
export const trackUrl = (displayId: string) => `${API_URL}/balaundry/track/${encodeURIComponent(displayId)}`;

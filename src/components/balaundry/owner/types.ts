// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Shared types (owner-scoped, BUKAN shared lib)
// PATH: src/components/balaundry/owner/types.ts
// ────────────────────────────────────────────────────────────────
// Whitelist field dari kontrak BE (PRD §3). FE render apa adanya —
// NOL hitung ulang, NOL business logic. Mirror pola components/bakos/owner/types.
// ════════════════════════════════════════════════════════════════

// ─── Brand constant (PENGECUALIAN HEX TERDOKUMENTASI) ─────────────────
// SATU-SATUNYA hex yang diizinkan di owner BALAUNDRY: konstanta brand untuk
// komponen pihak-ketiga yang BUTUH string warna konkret (GeographicScopePicker
// melakukan math dark-lift, var(--...) tidak bisa dipakai). Mirror pola bakos
// (BAKOS_TOKENS.accent = '#854F0B'). Nilai = var(--color-balaundry) light
// (globals.css:106). HEX DI JSX/style TETAP HARAM — pakai var(--color-balaundry).
export const BALAUNDRY_BRAND = '#2563EB';

// GET /balaundry/owner/overview
export interface OwnerSubscriptionSummary {
  tier: string;
  db_status: string;
  paid_until: string | null;
  is_expired: boolean;
}

export interface OwnerSummaryStats {
  businesses_total: number;
  businesses_verified: number;
  businesses_active: number;
  orders_active: number;
  orders_today: number;
  orders_completed: number;
  revenue_completed: number;
  staff_total: number;
}

export interface OwnerBusinessCard {
  id: string;
  display_id: string | null;
  name: string;
  is_active: boolean;
  is_verified: boolean;
  rating_avg: number;
  rating_count: number;
  orders_active: number;
  orders_today: number;
  orders_completed: number;
  revenue_completed: number;
  services_count: number;
  staff_count: number;
}

export interface OwnerOverview {
  subscription: OwnerSubscriptionSummary;
  summary: OwnerSummaryStats;
  businesses: OwnerBusinessCard[];
}

// GET /balaundry/owner/businesses/:bizId/dashboard
export interface BusinessDashboardRecentOrder {
  display_id: string;
  order_status: string;
  total: number;
  created_at: string;
}

export interface BusinessDashboard {
  business_id: string;
  status_breakdown: Record<string, number>;
  revenue: { completed_total: number; today: number; this_month: number };
  payment: { paid: number; unpaid: number };
  recent_orders: BusinessDashboardRecentOrder[];
}

// Services (owner) — GET/POST/PATCH /balaundry/owner/businesses/:bizId/services
export type ServiceType = 'reguler' | 'express' | 'satuan' | 'kiloan';
export type ServiceUnit = 'kg' | 'pcs';

export interface OwnerService {
  id: string;
  business_id: string;
  name: string;
  type: string;   // ServiceType — string mentah dari BE
  unit: string;   // ServiceUnit
  price: number;
  est_hours: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Orders / POS (orders.ts)
export type DeliveryMode = 'dropoff' | 'pickup_delivery';
export type PaymentStatus = 'unpaid' | 'paid';

// Item snapshot beku dari BE — field opsional, render apa adanya (NOL compute).
export interface OrderItemSnapshot {
  service_id?: string;
  name?: string;
  qty: number;
  note?: string | null;
  price?: number;     // harga snapshot dari BE (display only)
  subtotal?: number;  // dari BE — JANGAN dihitung di FE
}

export interface Order {
  id: string;
  display_id: string;
  business_id?: string;
  order_status: string;
  total: number;             // 🔴 SUMBER TUNGGAL total = response BE. NOL compute FE.
  payment_status?: string;
  delivery_mode?: string;
  staff_id?: string | null;
  customer_contact?: { name?: string | null; wa?: string | null } | null;
  items?: OrderItemSnapshot[];
  note?: string | null;
  created_at: string;
}

// Staff / POS PIN (staff.ts) — StaffPublic, NO pin_hash (anti-leak).
export type StaffRole = 'kasir' | 'manager';

export interface StaffPublic {
  id: string;
  business_id: string;
  user_id: string | null;
  name: string;
  role: string;            // StaffRole — string mentah dari BE
  is_active: boolean;
  pin_set_at: string | null;
  created_at: string;
}

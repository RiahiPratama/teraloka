// ════════════════════════════════════════════════════════════════
// BALAUNDRY Owner — Shared types (owner-scoped, BUKAN shared lib)
// PATH: src/components/balaundry/owner/types.ts
// ────────────────────────────────────────────────────────────────
// Whitelist field dari kontrak BE (PRD §3). FE render apa adanya —
// NOL hitung ulang, NOL business logic. Mirror pola components/bakos/owner/types.
// ════════════════════════════════════════════════════════════════

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

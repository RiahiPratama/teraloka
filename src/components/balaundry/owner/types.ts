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

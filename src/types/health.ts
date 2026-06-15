/**
 * TeraLoka — System Health types
 * Sinkron dengan backend GET /health/deep (api.teraloka.com/health/deep).
 * FE meng-konsumsi lewat proxy server-side /api/health (HEALTH_SECRET server-only).
 */

/** Kunci service yang ditampilkan (final 4 — Vercel & Upstash di-drop dari UI). */
export type HealthServiceKey = 'self' | 'supabase' | 'fonnte' | 'waha';

/** WAHA raw session detail (paling rapuh — device fisik). */
export type WahaDetail = 'WORKING' | 'SCAN_QR_CODE' | 'FAILED' | 'STOPPED';

export interface ServiceHealth {
  /** 'ok' | 'degraded' | 'down' (atau varian lain dari backend). */
  status: string;
  latency_ms?: number;
  /** Hanya WAHA: status mentah session (WORKING/SCAN_QR_CODE/FAILED/STOPPED). */
  detail?: string;
  /** Opsional (WAHA): nama session — dirender hanya kalau backend mengirimnya. */
  session?: string;
}

export interface DeepHealth {
  status: 'ok' | 'degraded';
  checked_at: string;
  services: Record<HealthServiceKey, ServiceHealth>;
}

/* ─── Level 2 — historis (GET /admin/health/history?days=1..30) ─── */

/** Rentang waktu UI → param `days` backend (24h=1, 7d=7, 30d=30). */
export type HealthRange = '24h' | '7d' | '30d';

/** Insiden = transisi ke status 'down'. ended_at/duration null = masih berlangsung. */
export interface HealthIncident {
  started_at: string;
  ended_at: string | null;
  duration_min: number | null;
  detail: string | null;
}

/** Ringkasan historis per service. uptime_pct null = belum ada sample (jangan render 0%). */
export interface ServiceHistory {
  uptime_pct: number | null;
  samples: number;
  ok: number;
  down: number;
  latest: { status: 'ok' | 'down'; checked_at: string; detail: string | null } | null;
  /** ≤200 titik, urut lama→baru. latency_ms bisa null (tak diukur, mis. self). */
  sparkline: { checked_at: string; latency_ms: number | null }[];
  /** ≤50 insiden, urut baru→lama. */
  incidents: HealthIncident[];
}

export interface HealthHistorySummary {
  window_days: number;
  services: Record<HealthServiceKey, ServiceHistory>;
}

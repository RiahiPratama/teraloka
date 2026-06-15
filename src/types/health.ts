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

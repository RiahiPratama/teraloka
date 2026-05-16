/**
 * TeraLoka — Ad Settings Types & Defaults
 * PATH: src/lib/ad-settings.ts
 * Mission 8 Sub-Phase 8-D Phase 2 Turn 2
 * ────────────────────────────────────────────────────────────────
 * Single source of truth untuk per-article ad control:
 *   - AdFormatFilter type (mirror backend ads-engine)
 *   - AdSettings interface (mirror backend JSONB shape)
 *   - DEFAULT_AD_SETTINGS (NULL fallback)
 *   - buildFormatFilterParam() helper untuk fetch URL
 *
 * Backend cross-reference (Pattern AAT):
 *   - teraloka-api/src/domains/ads/public/ads-engine.ts AdFormatFilter type
 *   - teraloka-api/src/routes/content/articles.ts validateAdSettings()
 *   - DB column content.articles.ad_settings JSONB
 */

// ────────────────────────────────────────────────────────────────
// Types — mirror backend
// ────────────────────────────────────────────────────────────────

export type AdFormatFilter = 'all' | 'image_only' | 'text_only' | 'dca_only';

export interface AdSettings {
  body_inject_enabled:    boolean;
  sidebar_enabled:        boolean;
  after_article_enabled:  boolean;
  format_filter:          AdFormatFilter;
}

// ────────────────────────────────────────────────────────────────
// Defaults — NULL fallback (backward compat)
// ────────────────────────────────────────────────────────────────
//
// Saat article.ad_settings === null (artikel existing pre-Phase 2),
// frontend pakai DEFAULT yang preserve current behavior:
//   - All 3 slot enabled (body + sidebar + after-article)
//   - format_filter = 'all' = no filter

export const DEFAULT_AD_SETTINGS: AdSettings = {
  body_inject_enabled:    true,
  sidebar_enabled:        true,
  after_article_enabled:  true,
  format_filter:          'all',
};

// ────────────────────────────────────────────────────────────────
// Helper — resolve ad_settings dari article object
// ────────────────────────────────────────────────────────────────
//
// Defensive: kalau ad_settings malformed (mis. legacy data),
// fallback ke DEFAULT.

export function resolveAdSettings(raw: any): AdSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_AD_SETTINGS;
  }
  return {
    body_inject_enabled:    raw.body_inject_enabled !== false,
    sidebar_enabled:        raw.sidebar_enabled !== false,
    after_article_enabled:  raw.after_article_enabled !== false,
    format_filter:          isValidFormatFilter(raw.format_filter) ? raw.format_filter : 'all',
  };
}

const VALID_FORMAT_FILTERS: readonly AdFormatFilter[] = ['all', 'image_only', 'text_only', 'dca_only'];

function isValidFormatFilter(v: any): v is AdFormatFilter {
  return typeof v === 'string' && VALID_FORMAT_FILTERS.includes(v as AdFormatFilter);
}

// ────────────────────────────────────────────────────────────────
// Helper — build format query param untuk fetch URL
// ────────────────────────────────────────────────────────────────
//
// Skip kalau filter = 'all' (default, no need to send).
// Backend treat missing param as 'all' (backward compat).

export function buildFormatFilterParam(filter: AdFormatFilter | undefined | null): string {
  if (!filter || filter === 'all') return '';
  return `&format=${encodeURIComponent(filter)}`;
}

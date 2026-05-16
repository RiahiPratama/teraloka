/**
 * TeraLoka — Ad Settings Types & Defaults (v3 — γ Hybrid)
 * PATH: src/lib/ad-settings.ts
 * Mission 8 Sub-Phase 8-D Phase 2 v3 (Turn 3a Refine)
 * ────────────────────────────────────────────────────────────────
 * γ Hybrid schema: preset master + count granular override.
 *
 * v3 Changes (16 Mei 2026 Turn 3a):
 *   - Replace boolean enabled fields → count integer fields
 *   - Tambah preset master enum (none/few/medium/lots/custom)
 *   - resolvePresetCounts() helper untuk preset → count distribution
 *   - DEFAULT_AD_SETTINGS pakai preset='lots' (backward compat NULL)
 *
 * Cross-tier sync (Pattern AAT):
 *   - Backend articles.ts validateAdSettings()
 *   - Backend ads-engine.ts AdFormatFilter
 *   - DB column content.articles.ad_settings JSONB
 */

// ────────────────────────────────────────────────────────────────
// Types — mirror backend
// ────────────────────────────────────────────────────────────────

export type AdFormatFilter = 'all' | 'image_only' | 'text_only' | 'dca_only';

export type AdPreset = 'none' | 'few' | 'medium' | 'lots' | 'custom';

export interface AdSettings {
  preset:              AdPreset;
  body_inject_count:   number;   // 0-3
  sidebar_count:       number;   // 0-2
  after_article_count: number;   // 0-2
  format_filter:       AdFormatFilter;
}

// ────────────────────────────────────────────────────────────────
// Range limits (mirror backend validation)
// ────────────────────────────────────────────────────────────────

export const COUNT_RANGES = {
  body_inject:   { min: 0, max: 3 },
  sidebar:       { min: 0, max: 2 },
  after_article: { min: 0, max: 2 },
} as const;

export const VALID_PRESETS: readonly AdPreset[] = ['none', 'few', 'medium', 'lots', 'custom'];
export const VALID_FORMAT_FILTERS: readonly AdFormatFilter[] = ['all', 'image_only', 'text_only', 'dca_only'];

// ────────────────────────────────────────────────────────────────
// Preset → count distribution
// ────────────────────────────────────────────────────────────────

export interface PresetCounts {
  body_inject_count:   number;
  sidebar_count:       number;
  after_article_count: number;
}

export function resolvePresetCounts(preset: AdPreset, currentCounts?: PresetCounts): PresetCounts {
  switch (preset) {
    case 'none':
      return { body_inject_count: 0, sidebar_count: 0, after_article_count: 0 };
    case 'few':
      return { body_inject_count: 1, sidebar_count: 0, after_article_count: 0 };
    case 'medium':
      return { body_inject_count: 1, sidebar_count: 1, after_article_count: 1 };
    case 'lots':
      return { body_inject_count: 2, sidebar_count: 2, after_article_count: 1 };
    case 'custom':
      // Custom = use existing counts (no override)
      return currentCounts ?? { body_inject_count: 1, sidebar_count: 1, after_article_count: 1 };
  }
}

// ────────────────────────────────────────────────────────────────
// Preset metadata untuk UI dropdown
// ────────────────────────────────────────────────────────────────

export const PRESET_META: Record<AdPreset, { label: string; description: string }> = {
  none:   { label: 'Tanpa iklan',       description: 'Artikel bebas iklan (mis. konten sensitif)' },
  few:    { label: 'Sedikit (1 iklan)', description: '1 iklan di body artikel' },
  medium: { label: 'Sedang (3 iklan)',  description: '1 body + 1 sidebar + 1 setelah artikel' },
  lots:   { label: 'Banyak (5 iklan)',  description: '2 body + 2 sidebar + 1 setelah artikel' },
  custom: { label: 'Atur sendiri',      description: 'Editor pilih per zona manual' },
};

// ────────────────────────────────────────────────────────────────
// Defaults — backward compat
// ────────────────────────────────────────────────────────────────
//
// Saat article.ad_settings === null (artikel existing pre-Phase 2 v3),
// frontend pakai preset='lots' = preserve current behavior:
//   - 2 body inject + 2 sidebar + 1 after-article = 5 ads max
//   - format='all' (no filter)
//
// Artikel BARU yang dibuat via OFFICE form akan default ke 'medium'
// (handled di OFFICE form initial state, BUKAN di sini).

export const DEFAULT_AD_SETTINGS: AdSettings = {
  preset:              'lots',
  body_inject_count:   2,
  sidebar_count:       2,
  after_article_count: 1,
  format_filter:       'all',
};

// Default untuk artikel BARU (OFFICE form initial state)
export const NEW_ARTICLE_DEFAULT_AD_SETTINGS: AdSettings = {
  preset:              'medium',
  body_inject_count:   1,
  sidebar_count:       1,
  after_article_count: 1,
  format_filter:       'all',
};

// ────────────────────────────────────────────────────────────────
// Helper — resolve ad_settings dari article object (defensive)
// ────────────────────────────────────────────────────────────────

export function resolveAdSettings(raw: any): AdSettings {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return DEFAULT_AD_SETTINGS;
  }

  const preset = isValidPreset(raw.preset) ? raw.preset : 'lots';
  const format_filter = isValidFormatFilter(raw.format_filter) ? raw.format_filter : 'all';

  // Resolve count fields with defensive clamping
  const body_inject_count   = clampCount(raw.body_inject_count,   COUNT_RANGES.body_inject,   2);
  const sidebar_count       = clampCount(raw.sidebar_count,       COUNT_RANGES.sidebar,       2);
  const after_article_count = clampCount(raw.after_article_count, COUNT_RANGES.after_article, 1);

  return { preset, body_inject_count, sidebar_count, after_article_count, format_filter };
}

function clampCount(v: any, range: { min: number; max: number }, fallback: number): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) return fallback;
  return Math.max(range.min, Math.min(range.max, Math.floor(v)));
}

function isValidPreset(v: any): v is AdPreset {
  return typeof v === 'string' && VALID_PRESETS.includes(v as AdPreset);
}

function isValidFormatFilter(v: any): v is AdFormatFilter {
  return typeof v === 'string' && VALID_FORMAT_FILTERS.includes(v as AdFormatFilter);
}

// ────────────────────────────────────────────────────────────────
// Helper — build format query param untuk fetch URL
// ────────────────────────────────────────────────────────────────

export function buildFormatFilterParam(filter: AdFormatFilter | undefined | null): string {
  if (!filter || filter === 'all') return '';
  return `&format=${encodeURIComponent(filter)}`;
}

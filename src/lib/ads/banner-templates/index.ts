/**
 * TeraLoka — Banner Template Library Registry
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/index.ts
 *
 * Central registry untuk semua banner templates.
 * Export public API:
 *   - BANNER_TEMPLATES (array semua templates)
 *   - getBannerTemplate(id) — lookup by id
 *   - getBannerTemplatesBySegment(segment) — filter by segment
 *   - cloneBannerTemplateTimeline(template) — deep clone untuk safe mutation
 *
 * Phase 6+: tambah template baru, register di sini.
 * ────────────────────────────────────────────────────────────────
 */

import type { BannerTemplate, TemplateRegistry, TemplateSegment } from './types';
import type { AnimationTimelineConfig } from '@/components/public/ads/AdAnimatedBanner';

import { TRAVEL_CINEMATIC  } from './templates/travel-cinematic';
import { HOTEL_PREMIUM     } from './templates/hotel-premium';
import { UMKM_ENERGETIC    } from './templates/umkm-energetic';
import { EVENT_FESTIVAL    } from './templates/event-festival';
import { EVENT_MULTI_TEXT  } from './templates/event-multi-text';
import { AUTO_SHOWROOM     } from './templates/auto-showroom';

// ─── Re-export types ──────────────────────────────────────────────

export type {
  BannerTemplate,
  TemplateRegistry,
  TemplateSegment,
  TemplateMood,
} from './types';

// ─── Master Registry ──────────────────────────────────────────────

/**
 * All banner templates available di TeraLoka.
 * Order = display order di picker.
 */
export const BANNER_TEMPLATES: BannerTemplate[] = [
  TRAVEL_CINEMATIC,
  HOTEL_PREMIUM,
  UMKM_ENERGETIC,
  EVENT_FESTIVAL,
  EVENT_MULTI_TEXT,
  AUTO_SHOWROOM,
];

// ─── Lookup helpers ───────────────────────────────────────────────

/**
 * Get banner template by id. Returns undefined kalau gak ada.
 */
export function getBannerTemplate(id: string): BannerTemplate | undefined {
  return BANNER_TEMPLATES.find((t) => t.id === id);
}

/**
 * Filter templates by segment.
 */
export function getBannerTemplatesBySegment(segment: TemplateSegment): BannerTemplate[] {
  return BANNER_TEMPLATES.filter((t) => t.segment === segment);
}

/**
 * Deep clone template timeline untuk safe form state mutation.
 * Pakai saat admin pilih template → buat instance baru yang bisa di-modify.
 */
export function cloneBannerTemplateTimeline(template: BannerTemplate): AnimationTimelineConfig {
  return JSON.parse(JSON.stringify(template.timeline));
}

/**
 * Get list of unique segments dari BANNER_TEMPLATES.
 * Useful untuk segmented picker UI.
 */
export function getAvailableSegments(): TemplateSegment[] {
  const segments = new Set<TemplateSegment>();
  for (const t of BANNER_TEMPLATES) segments.add(t.segment);
  return Array.from(segments);
}

// ─── Stats helper (untuk debug/dashboard) ─────────────────────────

export function getTemplateStats() {
  return {
    total:         BANNER_TEMPLATES.length,
    bySegment:     {
      travel: getBannerTemplatesBySegment('travel').length,
      hotel:  getBannerTemplatesBySegment('hotel').length,
      umkm:   getBannerTemplatesBySegment('umkm').length,
      event:  getBannerTemplatesBySegment('event').length,
      auto:   getBannerTemplatesBySegment('auto').length,
    },
  };
}

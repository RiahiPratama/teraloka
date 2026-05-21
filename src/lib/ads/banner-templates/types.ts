/**
 * TeraLoka — Banner Template Library Types
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/types.ts
 *
 * Template library untuk admin solo founder craft banner cinematic
 * tanpa designer skill. Pilih template → isi text + upload bg = jadi.
 *
 * Pattern: registry-based, easy to extend di Phase 6+.
 * ────────────────────────────────────────────────────────────────
 */

import type { AnimationTimelineConfig } from '@/components/public/ads/AdAnimatedBanner';

/**
 * Banner template segmentation.
 * Use case driver untuk admin pick template berdasarkan klien type.
 */
export type TemplateSegment =
  | 'travel'      // Travel, Umroh, Wisata
  | 'hotel'       // Hotel, Resort, Akomodasi
  | 'umkm'        // UMKM, Retail, Flash Sale
  | 'event'       // Konser, Festival, Workshop
  | 'auto';       // Dealer, Showroom, Otomotif

/**
 * Mood/tone descriptor.
 */
export type TemplateMood =
  | 'cinematic'   // Slow, dramatic, premium feel
  | 'elegant'     // Calm, refined, B2B vibe
  | 'energetic'   // Fast, urgent, action-driven
  | 'festive'     // Fun, celebratory, build-up
  | 'showroom';   // Polished, product-focused

/**
 * Single banner template definition.
 *
 * Konvensi:
 *   - timeline: pre-configured AnimationTimelineConfig dengan variants[]
 *     + element_overrides yang udah di-craft cinematic per element
 *   - description_id: deskripsi Bahasa Indonesia untuk klien-friendly tooltip
 *   - preview_hint: hint untuk admin saat isi text variant
 */
export interface BannerTemplate {
  /** Unique kebab-case id. */
  id:                 string;

  /** Display name (Indonesia). */
  label:              string;

  /** Emoji icon untuk picker visual. */
  icon:               string;

  /** Segment driver (travel/hotel/umkm/event/auto). */
  segment:            TemplateSegment;

  /** Mood/tone descriptor. */
  mood:               TemplateMood;

  /** Tagline pendek (1-line) untuk picker subtitle. */
  tagline:            string;

  /** Deskripsi lengkap untuk admin tooltip. */
  description_id:     string;

  /** Use case target (siapa klien yang cocok). */
  target_use_case:    string;

  /**
   * Hint per variant untuk admin saat isi text.
   * Array sesuai jumlah variants di timeline.
   * Contoh: ['Hook headline (urgent)', 'Value proposition', 'CTA action']
   */
  variant_hints:      string[];

  /**
   * Pre-configured timeline.
   * Variants sudah punya element_overrides cinematic.
   * Admin tinggal: isi headline/body/cta + upload background_image per variant.
   */
  timeline:           AnimationTimelineConfig;
}

/**
 * Template registry export shape.
 */
export interface TemplateRegistry {
  templates: BannerTemplate[];
  byId:      Record<string, BannerTemplate>;
  bySegment: Record<TemplateSegment, BannerTemplate[]>;
}

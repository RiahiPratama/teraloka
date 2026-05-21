/**
 * TeraLoka — Animation Presets Library
 * SESI 5H Phase 5B (21 Mei 2026) — DCA-Aligned Refactor
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/animation-presets.ts
 *
 * 5 preset siap-pakai untuk admin form pilih cepat.
 * Preset structure mirror DCA familiar pattern: variants + transition + text reveal.
 *
 * Filosofi: "Manual-first, automate-later" — founder craft preset di sini,
 *           klien tinggal pilih preset → adjust isi variant.
 *
 * Setiap preset:
 *   - id          : unique identifier
 *   - label       : display name (Indonesia)
 *   - description : 1-line use case description
 *   - icon        : emoji untuk dropdown visual
 *   - timeline    : ready-to-use AnimationTimelineConfig
 *
 * Pattern AAO (JSONB-First) compliant.
 *
 * NOTE: variant.image_url DI-LEAVE EMPTY '' karena klien upload manual.
 *       Klien pilih preset → preset isi struktur variants kosong + transition
 *       + text reveal config → klien upload image per variant + edit text.
 * ────────────────────────────────────────────────────────────────
 */

import type {
  AnimationTimelineConfig,
  AnimationVariant,
  TransitionPattern,
  TextRevealPattern,
} from '@/components/public/ads/AdAnimatedBanner';

// ─── Types ────────────────────────────────────────────────────────

export type PresetMood =
  | 'professional'
  | 'premium'
  | 'energik'
  | 'festive'
  | 'elegant';

export interface AnimationPreset {
  /** Unique identifier (kebab-case). */
  id:             string;

  /** Display name di dropdown. */
  label:          string;

  /** 1-line description untuk hover/info. */
  description:    string;

  /** Tone descriptor. */
  mood:           PresetMood;

  /** Klien segment yang cocok. */
  target_segment: string;

  /** Emoji icon untuk dropdown. */
  icon:           string;

  /** Ready-to-INSERT timeline config. */
  timeline:       AnimationTimelineConfig;
}

// ─── Helper: Build empty variant template ─────────────────────────

function emptyVariant(order: number, headline: string, duration_ms = 4000): AnimationVariant {
  return {
    order,
    image_url:   '',      // klien upload manual
    headline,
    body:        null,
    cta_text:    null,
    duration_ms,
  };
}

// ─── 5 Preset Library ─────────────────────────────────────────────

/**
 * PRESET 1 — Single Banner Self-Promo
 *
 * 1 variant + text reveal animation.
 * Mirror Skenario B feel: single background dengan text muncul stagger.
 *
 * Mood: Professional, balanced.
 * Cocok: Konten in-house TeraLoka, partnership announcement, single message.
 */
const PRESET_SELF_PROMO: AnimationPreset = {
  id:             'self-promo',
  label:          'Single Banner Self-Promo',
  description:    '1 banner + text reveal halus — single message campaign',
  mood:           'professional',
  target_segment: 'Konten in-house TeraLoka, partnership',
  icon:           '📺',
  timeline: {
    variants: [
      emptyVariant(0, 'Judul Iklan Anda', 6000),
    ],
    transition_pattern:     'fade',
    transition_ms:          500,
    text_reveal_enabled:    true,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 150,
    loop:                   false,
  },
};

/**
 * PRESET 2 — Hotel/Wisata 3-Slide Carousel
 *
 * 3 variants + fade transition + text slide_in.
 * Mood: Premium, calm.
 * Cocok: Hotel, resort, wisata premium, jasa profesional kelas atas.
 */
const PRESET_HOTEL_PREMIUM: AnimationPreset = {
  id:             'hotel-premium',
  label:          'Hotel/Wisata 3-Slide',
  description:    '3 foto rotasi + text slide masuk — premium feel',
  mood:           'premium',
  target_segment: 'Hotel, resort, wisata, jasa profesional',
  icon:           '🏨',
  timeline: {
    variants: [
      emptyVariant(0, 'Kamar Deluxe Pemandangan Laut', 4000),
      emptyVariant(1, 'Restoran Mewah dengan Cita Rasa Lokal', 4000),
      emptyVariant(2, 'Book Now untuk Pengalaman Tak Terlupakan', 4000),
    ],
    transition_pattern:     'fade',
    transition_ms:          800,
    text_reveal_enabled:    true,
    text_reveal_pattern:    'slide_in',
    text_reveal_stagger_ms: 120,
    loop:                   true,
  },
};

/**
 * PRESET 3 — UMKM Flash Sale 5-Slide
 *
 * 5 variants + slide_left transition cepat + text fade_in.
 * Mood: Energik, urgent.
 * Cocok: UMKM, e-commerce, retail, promo flash sale, marketplace.
 */
const PRESET_UMKM_ENERGIK: AnimationPreset = {
  id:             'umkm-energik',
  label:          'UMKM Flash Sale 5-Slide',
  description:    '5 produk rotasi cepat + slide kiri — urgent flash sale',
  mood:           'energik',
  target_segment: 'UMKM, e-commerce, retail, promo flash sale',
  icon:           '🛒',
  timeline: {
    variants: [
      emptyVariant(0, 'Diskon 50% Lebaran!', 2500),
      emptyVariant(1, 'Gratis Ongkir Maluku Utara', 2500),
      emptyVariant(2, 'Beli 2 Gratis 1 Hari Ini', 2500),
      emptyVariant(3, 'Limited Stock - Buruan!', 2500),
      emptyVariant(4, 'Klik Sekarang →', 2500),
    ],
    transition_pattern:     'slide_left',
    transition_ms:          400,
    text_reveal_enabled:    true,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 100,
    loop:                   true,
  },
};

/**
 * PRESET 4 — Event/Festival 3-Slide
 *
 * 3 variants + slide_up transition + text_reveal char-by-char.
 * Mood: Festive, fun, build-up excitement.
 * Cocok: Konser, festival, workshop, exhibition, event announcement.
 */
const PRESET_EVENT_FESTIVAL: AnimationPreset = {
  id:             'event-festival',
  label:          'Event/Festival 3-Slide',
  description:    '3 frame event + slide atas + text reveal — festive feel',
  mood:           'festive',
  target_segment: 'Konser, festival, workshop, exhibition',
  icon:           '🎉',
  timeline: {
    variants: [
      emptyVariant(0, 'Festival Cengkeh Maluku Utara 2026', 4500),
      emptyVariant(1, '7-9 Agustus | Benteng Oranje, Ternate', 4500),
      emptyVariant(2, 'Tickets Now Available!', 4500),
    ],
    transition_pattern:     'slide_up',
    transition_ms:          600,
    text_reveal_enabled:    true,
    text_reveal_pattern:    'text_reveal',
    text_reveal_stagger_ms: 100,
    loop:                   true,
  },
};

/**
 * PRESET 5 — Minimalist Elegant Single
 *
 * 1 variant + no transition + text fade_in halus dengan stagger besar.
 * Mood: Elegant, tenang, refined.
 * Cocok: Bank, asuransi, jasa finansial, jasa profesional B2B.
 */
const PRESET_MINIMALIST: AnimationPreset = {
  id:             'minimalist',
  label:          'Minimalist Elegant Single',
  description:    '1 banner + fade halus elegant — bank, asuransi, B2B premium',
  mood:           'elegant',
  target_segment: 'Bank, asuransi, finansial, B2B profesional',
  icon:           '✨',
  timeline: {
    variants: [
      emptyVariant(0, 'Solusi Terpercaya untuk Anda', 8000),
    ],
    transition_pattern:     'none',
    transition_ms:          500,
    text_reveal_enabled:    true,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 250,
    loop:                   false,
  },
};

// ─── Export Library ───────────────────────────────────────────────

/**
 * Full preset library — ordered by use case priority.
 * Self-promo paling sering dipakai = di atas.
 */
export const ANIMATION_PRESETS: AnimationPreset[] = [
  PRESET_SELF_PROMO,
  PRESET_HOTEL_PREMIUM,
  PRESET_UMKM_ENERGIK,
  PRESET_EVENT_FESTIVAL,
  PRESET_MINIMALIST,
];

/**
 * Lookup preset by ID.
 */
export function getPresetById(id: string): AnimationPreset | undefined {
  return ANIMATION_PRESETS.find((p) => p.id === id);
}

/**
 * Get default preset (Self-Promo) untuk initial form state.
 */
export function getDefaultPreset(): AnimationPreset {
  return PRESET_SELF_PROMO;
}

/**
 * Deep clone preset timeline untuk safe mutation di form state.
 */
export function clonePresetTimeline(preset: AnimationPreset): AnimationTimelineConfig {
  return JSON.parse(JSON.stringify(preset.timeline));
}

/**
 * Build empty timeline (no preset selected, klien start from scratch).
 */
export function buildEmptyTimeline(): AnimationTimelineConfig {
  return {
    variants:               [emptyVariant(0, 'Judul Iklan Anda', 4000)],
    transition_pattern:     'fade',
    transition_ms:          500,
    text_reveal_enabled:    false,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 150,
    loop:                   false,
  };
}

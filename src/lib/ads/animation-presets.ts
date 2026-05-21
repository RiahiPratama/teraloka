/**
 * TeraLoka — Animation Presets Library
 * SESI 5H Phase 5A.6 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/animation-presets.ts
 *
 * 5 preset siap-pakai untuk admin form pilih cepat tanpa craft JSON manual.
 * Filosofi: "Manual-first, automate-later" — founder craft preset di sini,
 *           klien (atau founder sendiri di workflow) tinggal pilih.
 *
 * Setiap preset:
 *   - id            : unique identifier (untuk dropdown value)
 *   - label         : display name (Indonesia)
 *   - description   : 1-line use case description
 *   - mood          : tone descriptor (professional/premium/energik/festive/elegant)
 *   - target_segment: klien yang cocok pakai preset ini
 *   - timeline      : AnimationTimelineConfig (struktur sama dengan
 *                     yang di-store di DB ads.animation_timeline JSONB)
 *
 * Pattern: AAO (JSONB-First) compliant — timeline ready-to-INSERT.
 *
 * Selectors yang dipakai di preset = match dengan AdAnimatedBanner DOM:
 *   - .logo       : advertiser logo (kalau ada)
 *   - .headline   : ad.title
 *   - .body       : ad.body
 *   - .cta        : "Pelajari Lebih Lanjut" button
 *
 * ────────────────────────────────────────────────────────────────
 */

import type { AnimationTimelineConfig } from '@/components/public/ads/AdAnimatedBanner';

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

  /** Emoji icon untuk dropdown (visual scanning). */
  icon:           string;

  /** Ready-to-INSERT timeline config. */
  timeline:       AnimationTimelineConfig;
}

// ─── 5 Preset Library ─────────────────────────────────────────────

/**
 * PRESET 1 — TeraLoka Self-Promo
 *
 * Animation story:
 *   t=0     → Logo fade in subtle
 *   t=400ms → Headline slide dari kiri (energetic emphasis)
 *   t=1000ms → Body fade in (supporting detail)
 *   t=1500ms → CTA text reveal char-by-char (call-to-action)
 *
 * Total: 3000ms.
 * Mood: Professional, balanced.
 * Cocok: Konten in-house TeraLoka, partnership announcement.
 */
const PRESET_SELF_PROMO: AnimationPreset = {
  id:             'self-promo',
  label:          'TeraLoka Self-Promo',
  description:    'Logo fade → headline slide → body fade → CTA reveal (3 detik)',
  mood:           'professional',
  target_segment: 'Konten in-house TeraLoka, partnership',
  icon:           '📺',
  timeline: {
    duration_ms: 3000,
    loop:        false,
    steps: [
      {
        target_selector: '.logo',
        pattern:         'fade_in',
        delay:           0,
        duration:        500,
      },
      {
        target_selector: '.headline',
        pattern:         'slide_in',
        from:            'left',
        delay:           400,
        duration:        600,
      },
      {
        target_selector: '.body',
        pattern:         'fade_in',
        delay:           1000,
        duration:        500,
      },
      {
        target_selector: '.cta',
        pattern:         'text_reveal',
        unit:            'char',
        delay:           1500,
        duration:        1000,
      },
    ],
  },
};

/**
 * PRESET 2 — Hotel/Wisata Premium
 *
 * Animation story:
 *   t=0     → Logo fade in elegant
 *   t=500ms → Headline scale-in (premium "zoom in" feel)
 *   t=1200ms → Body fade in
 *   t=1800ms → CTA fade in (subtle, gak overlay flashy)
 *
 * Total: 2800ms.
 * Mood: Premium, calm.
 * Cocok: Hotel, resort, wisata premium, jasa profesional kelas atas.
 */
const PRESET_HOTEL_PREMIUM: AnimationPreset = {
  id:             'hotel-premium',
  label:          'Hotel/Wisata Premium',
  description:    'Elegant scale-in + fade — vibe mewah & tenang (2.8 detik)',
  mood:           'premium',
  target_segment: 'Hotel, resort, wisata, jasa profesional',
  icon:           '🏨',
  timeline: {
    duration_ms: 2800,
    loop:        false,
    steps: [
      {
        target_selector: '.logo',
        pattern:         'fade_in',
        delay:           0,
        duration:        600,
      },
      {
        target_selector: '.headline',
        pattern:         'scale',
        delay:           500,
        duration:        800,
      },
      {
        target_selector: '.body',
        pattern:         'fade_in',
        delay:           1200,
        duration:        600,
      },
      {
        target_selector: '.cta',
        pattern:         'fade_in',
        delay:           1800,
        duration:        500,
      },
    ],
  },
};

/**
 * PRESET 3 — UMKM Energik
 *
 * Animation story:
 *   t=0     → Headline slide dari atas + bounce ringan (attention grabber)
 *   t=500ms → Body slide dari kiri (energy continuation)
 *   t=1000ms → CTA scale-in dengan overshoot (action emphasis)
 *
 * Total: 1800ms.
 * Mood: Energik, urgent, action-oriented.
 * Cocok: UMKM, e-commerce, retail, promo flash sale.
 *
 * Note: Logo skip di preset ini karena emphasis ke message, bukan brand.
 *       Klien UMKM biasanya brand recognition rendah, fokus offer.
 */
const PRESET_UMKM_ENERGIK: AnimationPreset = {
  id:             'umkm-energik',
  label:          'UMKM Energik',
  description:    'Slide cepat + scale CTA — urgent feel (1.8 detik)',
  mood:           'energik',
  target_segment: 'UMKM, e-commerce, retail, promo flash sale',
  icon:           '🛒',
  timeline: {
    duration_ms: 1800,
    loop:        false,
    steps: [
      {
        target_selector: '.headline',
        pattern:         'slide_in',
        from:            'top',
        delay:           0,
        duration:        500,
      },
      {
        target_selector: '.body',
        pattern:         'slide_in',
        from:            'left',
        delay:           500,
        duration:        500,
      },
      {
        target_selector: '.cta',
        pattern:         'scale',
        delay:           1000,
        duration:        600,
      },
    ],
  },
};

/**
 * PRESET 4 — Event/Festival
 *
 * Animation story:
 *   t=0     → Logo scale-in subtle (brand intro)
 *   t=600ms → Headline text reveal word-by-word (excitement build-up)
 *   t=1600ms → Body fade in
 *   t=2200ms → CTA slide dari bawah (action call)
 *
 * Total: 3200ms.
 * Mood: Festive, fun, build-up.
 * Cocok: Konser, festival, workshop, exhibition, event announcement.
 */
const PRESET_EVENT_FESTIVAL: AnimationPreset = {
  id:             'event-festival',
  label:          'Event/Festival',
  description:    'Build-up dengan word reveal + slide CTA — festive (3.2 detik)',
  mood:           'festive',
  target_segment: 'Konser, festival, workshop, exhibition',
  icon:           '🎉',
  timeline: {
    duration_ms: 3200,
    loop:        false,
    steps: [
      {
        target_selector: '.logo',
        pattern:         'scale',
        delay:           0,
        duration:        600,
      },
      {
        target_selector: '.headline',
        pattern:         'text_reveal',
        unit:            'word',
        delay:           600,
        duration:        1000,
      },
      {
        target_selector: '.body',
        pattern:         'fade_in',
        delay:           1600,
        duration:        500,
      },
      {
        target_selector: '.cta',
        pattern:         'slide_in',
        from:            'bottom',
        delay:           2200,
        duration:        500,
      },
    ],
  },
};

/**
 * PRESET 5 — Minimalist Premium
 *
 * Animation story:
 *   Semua elemen fade in subtle berurutan, NO slide/scale/text reveal.
 *   Pure minimal entrance — focus content, motion sebagai "garnish" saja.
 *
 *   t=0     → Logo fade in
 *   t=400ms → Headline fade in
 *   t=800ms → Body fade in
 *   t=1200ms → CTA fade in
 *
 * Total: 1800ms.
 * Mood: Elegant, tenang, refined.
 * Cocok: Bank, asuransi, jasa finansial, jasa profesional B2B,
 *        klien yang mau "tampil profesional" tanpa flashy.
 */
const PRESET_MINIMALIST: AnimationPreset = {
  id:             'minimalist',
  label:          'Minimalist Premium',
  description:    'Pure fade halus berurutan — elegant & tenang (1.8 detik)',
  mood:           'elegant',
  target_segment: 'Bank, asuransi, finansial, B2B profesional',
  icon:           '✨',
  timeline: {
    duration_ms: 1800,
    loop:        false,
    steps: [
      {
        target_selector: '.logo',
        pattern:         'fade_in',
        delay:           0,
        duration:        500,
      },
      {
        target_selector: '.headline',
        pattern:         'fade_in',
        delay:           400,
        duration:        500,
      },
      {
        target_selector: '.body',
        pattern:         'fade_in',
        delay:           800,
        duration:        500,
      },
      {
        target_selector: '.cta',
        pattern:         'fade_in',
        delay:           1200,
        duration:        500,
      },
    ],
  },
};

// ─── Export Library ───────────────────────────────────────────────

/**
 * Full preset library array — ordered by use case priority.
 * Founder paling sering pakai = di atas.
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
 * Returns undefined kalau preset tidak ditemukan.
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
 * (Tanpa clone, edit form akan mutate library object — bug.)
 */
export function clonePresetTimeline(preset: AnimationPreset): AnimationTimelineConfig {
  return JSON.parse(JSON.stringify(preset.timeline));
}

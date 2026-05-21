/**
 * TeraLoka — Banner Template: Travel Cinematic
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/templates/travel-cinematic.ts
 *
 * Cinematic 3-scene storytelling untuk Travel/Umroh/Wisata.
 *
 * Scene 1: Hook         — "Promo Spesial!" dengan headline besar fade in
 * Scene 2: Destination  — "Mecca Madinah" dengan dramatic slide + image pan feel
 * Scene 3: CTA          — "Hubungi Sekarang" dengan pulse loop
 *
 * Mood: Cinematic, dramatic, premium feel.
 * Target: Travel umroh, wisata religi, paket wisata premium.
 * ────────────────────────────────────────────────────────────────
 */

import type { BannerTemplate } from '../types';

export const TRAVEL_CINEMATIC: BannerTemplate = {
  id:                 'travel-cinematic',
  label:              'Travel Cinematic',
  icon:               '🎬',
  segment:            'travel',
  mood:               'cinematic',
  tagline:            '3-scene dramatic storytelling untuk Travel/Umroh/Wisata',
  description_id:     'Cinematic 3-slide: Hook → Destinasi → CTA. Cocok untuk biro travel umroh, wisata religi, paket wisata premium yang butuh feel dramatic.',
  target_use_case:    'Biro Umroh, Travel Wisata, Paket Religi, Tour & Travel premium',
  variant_hints: [
    'Scene 1 (Hook): Headline urgent + tagline brand (cth: "Promo Spesial Umroh 2026!")',
    'Scene 2 (Destination): Nama destinasi + value proposition (cth: "Mecca Madinah, Premium Hotel")',
    'Scene 3 (CTA): Call-to-action + urgency (cth: "Daftar Sekarang, Limited Seat!")',
  ],
  timeline: {
    variants: [
      // ─── SCENE 1: HOOK ───
      {
        order:       0,
        image_url:   '',  // Admin upload bg cinematic hook
        headline:    '',  // Admin isi: "Promo Spesial Umroh!"
        body:        '',  // Admin isi: optional tagline
        cta_text:    null,
        duration_ms: 3500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'scale_in',
            delay_ms:        200,
            duration_ms:     700,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'xl',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        900,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'none',
          },
          cta: {
            visible:         false,
            animation:       'none',
            delay_ms:        0,
            duration_ms:     0,
            position:        'bottom_center',
            text_color:      'white',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'none',
          },
          logo: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        0,
            duration_ms:     400,
            position:        'top_left',
            text_color:      'white',
            text_size:       'md',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 2: DESTINATION ───
      {
        order:       1,
        image_url:   '',  // Admin upload bg destinasi
        headline:    '',  // Admin isi: "Mecca Madinah"
        body:        '',  // Admin isi: value proposition
        cta_text:    null,
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'right',
            delay_ms:        300,
            duration_ms:     700,
            position:        'middle_left',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'left',
            background_tint: 'black',
          },
          body: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'right',
            delay_ms:        700,
            duration_ms:     600,
            position:        'middle_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
          cta: {
            visible:         false,
            animation:       'none',
            delay_ms:        0,
            duration_ms:     0,
            position:        'bottom_center',
            text_color:      'white',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'none',
          },
          logo: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        0,
            duration_ms:     400,
            position:        'top_left',
            text_color:      'white',
            text_size:       'md',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 3: CTA ───
      {
        order:       2,
        image_url:   '',  // Admin upload bg CTA (atau pakai bg sebelumnya)
        headline:    '',  // Admin isi: urgency headline
        body:        '',  // Admin isi: closing tagline
        cta_text:    '',  // Admin isi: "Daftar Sekarang"
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        200,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        600,
            duration_ms:     400,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'sm',
            text_align:      'center',
            background_tint: 'none',
          },
          cta: {
            visible:         true,
            animation:       'pulse',
            delay_ms:        1200,
            duration_ms:     500,
            position:        'bottom_center',
            text_color:      'white',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'amber',
          },
          logo: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        0,
            duration_ms:     400,
            position:        'top_left',
            text_color:      'white',
            text_size:       'md',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
    ],
    transition_pattern:     'fade',
    transition_ms:          800,
    text_reveal_enabled:    false,  // Per-element override handle animations
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 150,
    loop:                   true,
  },
};

/**
 * TeraLoka — Banner Template: Auto Showroom
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/templates/auto-showroom.ts
 *
 * Showroom 3-scene untuk Dealer/Otomotif.
 *
 * Scene 1: Hero        — Foto mobil + brand name dramatic
 * Scene 2: Spec        — Spec/feature unggulan
 * Scene 3: Offer       — Cicilan/CTA test drive
 *
 * Mood: Showroom, polished, product-focused.
 * Target: Dealer mobil, dealer motor, showroom, otomotif.
 * ────────────────────────────────────────────────────────────────
 */

import type { BannerTemplate } from '../types';

export const AUTO_SHOWROOM: BannerTemplate = {
  id:                 'auto-showroom',
  label:              'Auto Showroom',
  icon:               '🚗',
  segment:            'auto',
  mood:               'showroom',
  tagline:            'Polished 3-scene product showcase untuk Dealer Otomotif',
  description_id:     'Showroom 3-slide product-focused: Hero → Spec → Offer. Cocok untuk dealer mobil, motor, showroom otomotif yang butuh feel polished.',
  target_use_case:    'Dealer Mobil, Dealer Motor, Showroom Otomotif, Rental Mobil',
  variant_hints: [
    'Scene 1 (Hero): Brand + model (cth: "Toyota New Avanza 2026")',
    'Scene 2 (Spec): Spec unggulan (cth: "1.5L · 7 Seater · Hybrid")',
    'Scene 3 (Offer): Cicilan + CTA (cth: "DP 25jt - Test Drive Sekarang")',
  ],
  timeline: {
    variants: [
      // ─── SCENE 1: HERO ───
      {
        order:       0,
        image_url:   '',
        headline:    '',  // "Toyota New Avanza"
        body:        '',  // "2026 Edition"
        cta_text:    null,
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'left',
            delay_ms:        300,
            duration_ms:     700,
            position:        'middle_left',
            text_color:      'white',
            text_size:       'xl',
            text_align:      'left',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        1100,
            duration_ms:     500,
            position:        'middle_left',
            text_color:      'amber',
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
            position:        'top_right',
            text_color:      'white',
            text_size:       'md',
            text_align:      'right',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 2: SPEC ───
      {
        order:       1,
        image_url:   '',
        headline:    '',  // "1.5L · 7 Seater"
        body:        '',  // "Hybrid · Smart Safety"
        cta_text:    null,
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'bottom',
            delay_ms:        300,
            duration_ms:     600,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'center',
            background_tint: 'black',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        900,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'sm',
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
            position:        'top_right',
            text_color:      'white',
            text_size:       'md',
            text_align:      'right',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 3: OFFER ───
      {
        order:       2,
        image_url:   '',
        headline:    '',  // "DP Mulai 25jt"
        body:        '',  // "Cicilan Ringan + Bonus Aksesoris"
        cta_text:    '',  // "Test Drive Sekarang"
        duration_ms: 4500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'scale_in',
            delay_ms:        200,
            duration_ms:     600,
            position:        'middle_right',
            text_color:      'amber',
            text_size:       'xl',
            text_align:      'right',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        800,
            duration_ms:     500,
            position:        'middle_right',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'right',
            background_tint: 'none',
          },
          cta: {
            visible:         true,
            animation:       'pulse',
            delay_ms:        1400,
            duration_ms:     500,
            position:        'bottom_right',
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
    transition_pattern:     'slide_left',
    transition_ms:          700,
    text_reveal_enabled:    false,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 150,
    loop:                   true,
  },
};

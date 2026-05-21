/**
 * TeraLoka — Banner Template: Hotel Premium
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/templates/hotel-premium.ts
 *
 * Elegant 3-scene untuk Hotel/Resort/Akomodasi premium.
 *
 * Scene 1: Brand     — Logo + hotel name elegant entrance
 * Scene 2: Feature   — Kamar/fasilitas dengan text slide
 * Scene 3: Book      — CTA "Book Now" dengan pulse
 *
 * Mood: Elegant, calm, refined.
 * Target: Hotel, resort, villa, akomodasi premium.
 * ────────────────────────────────────────────────────────────────
 */

import type { BannerTemplate } from '../types';

export const HOTEL_PREMIUM: BannerTemplate = {
  id:                 'hotel-premium',
  label:              'Hotel Premium',
  icon:               '🏨',
  segment:            'hotel',
  mood:               'elegant',
  tagline:            'Elegant 3-scene untuk Hotel/Resort/Akomodasi',
  description_id:     'Elegant 3-slide: Brand → Feature → Book. Cocok untuk hotel, resort, villa premium yang butuh feel calm dan refined.',
  target_use_case:    'Hotel, Resort, Villa, Akomodasi Premium, Boutique Inn',
  variant_hints: [
    'Scene 1 (Brand): Nama hotel + tagline elegant (cth: "Hotel Bahari Ternate")',
    'Scene 2 (Feature): Fasilitas unggulan (cth: "Kamar Premium View Laut")',
    'Scene 3 (Book): CTA reservasi (cth: "Book Now Special Rate")',
  ],
  timeline: {
    variants: [
      // ─── SCENE 1: BRAND ───
      {
        order:       0,
        image_url:   '',
        headline:    '',  // "Hotel Bahari Ternate"
        body:        '',  // "Pemandangan Laut Eksotis"
        cta_text:    null,
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        400,
            duration_ms:     800,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'xl',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        1200,
            duration_ms:     600,
            position:        'middle_center',
            text_color:      'white',
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
            duration_ms:     500,
            position:        'top_center',
            text_color:      'white',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 2: FEATURE ───
      {
        order:       1,
        image_url:   '',
        headline:    '',  // "Kamar Premium"
        body:        '',  // "View Laut · Sarapan · Spa"
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
            text_size:       'lg',
            text_align:      'left',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'left',
            delay_ms:        700,
            duration_ms:     700,
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
            duration_ms:     500,
            position:        'top_left',
            text_color:      'white',
            text_size:       'md',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 3: BOOK ───
      {
        order:       2,
        image_url:   '',
        headline:    '',  // "Special Rate"
        body:        '',  // "Mulai Rp 850rb/malam"
        cta_text:    '',  // "Book Sekarang"
        duration_ms: 4500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        200,
            duration_ms:     600,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'scale_in',
            delay_ms:        700,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'none',
          },
          cta: {
            visible:         true,
            animation:       'pulse',
            delay_ms:        1300,
            duration_ms:     600,
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
            duration_ms:     500,
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
    transition_ms:          1000,
    text_reveal_enabled:    false,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 150,
    loop:                   true,
  },
};

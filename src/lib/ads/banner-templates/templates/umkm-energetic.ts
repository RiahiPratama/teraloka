/**
 * TeraLoka — Banner Template: UMKM Energetic
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/templates/umkm-energetic.ts
 *
 * Energetic 5-scene flash sale untuk UMKM/Retail.
 *
 * Scene 1: Urgency    — "DISKON 50%" merah dramatic
 * Scene 2: Product    — Foto produk + harga
 * Scene 3: Bonus      — "Gratis Ongkir Maluku Utara"
 * Scene 4: Stock      — "Limited Stock - Buruan!"
 * Scene 5: CTA        — "Klik Sekarang" pulse merah
 *
 * Mood: Energetic, fast, urgent.
 * Target: UMKM Ternate, e-commerce, retail, flash sale, marketplace.
 * ────────────────────────────────────────────────────────────────
 */

import type { BannerTemplate } from '../types';

export const UMKM_ENERGETIC: BannerTemplate = {
  id:                 'umkm-energetic',
  label:              'UMKM Energetic',
  icon:               '🛒',
  segment:            'umkm',
  mood:               'energetic',
  tagline:            'Fast 5-scene urgency untuk UMKM Flash Sale',
  description_id:     'Energetic 5-slide rotasi cepat: Urgency → Product → Bonus → Stock → CTA. Cocok untuk UMKM Ternate, e-commerce, retail flash sale.',
  target_use_case:    'UMKM Ternate, E-commerce, Retail, Flash Sale, Marketplace',
  variant_hints: [
    'Scene 1 (Urgency): Diskon besar dramatic (cth: "DISKON 50%!")',
    'Scene 2 (Product): Nama produk + harga (cth: "Sambal Roa Khas - Rp 25rb")',
    'Scene 3 (Bonus): Bonus value (cth: "GRATIS Ongkir Maluku Utara")',
    'Scene 4 (Stock): Urgency stock (cth: "Stok Terbatas - 50 PCS")',
    'Scene 5 (CTA): Action call (cth: "Klik Sekarang!")',
  ],
  timeline: {
    variants: [
      // ─── SCENE 1: URGENCY ───
      {
        order:       0,
        image_url:   '',
        headline:    '',  // "DISKON 50%"
        body:        '',  // optional
        cta_text:    null,
        duration_ms: 2500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'scale_in',
            delay_ms:        100,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'xl',
            text_align:      'center',
            background_tint: 'red',
          },
          body: {
            visible:         false,
            animation:       'none',
            delay_ms:        0,
            duration_ms:     0,
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
            duration_ms:     300,
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 2: PRODUCT ───
      {
        order:       1,
        image_url:   '',
        headline:    '',  // "Sambal Roa Khas"
        body:        '',  // "Rp 25.000"
        cta_text:    null,
        duration_ms: 2500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'left',
            delay_ms:        100,
            duration_ms:     400,
            position:        'middle_left',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'left',
            background_tint: 'black',
          },
          body: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'left',
            delay_ms:        500,
            duration_ms:     400,
            position:        'middle_left',
            text_color:      'amber',
            text_size:       'md',
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
            duration_ms:     300,
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 3: BONUS ───
      {
        order:       2,
        image_url:   '',
        headline:    '',  // "GRATIS Ongkir"
        body:        '',  // "Khusus Maluku Utara"
        cta_text:    null,
        duration_ms: 2500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        100,
            duration_ms:     400,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'xl',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        500,
            duration_ms:     400,
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
            duration_ms:     300,
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 4: STOCK URGENCY ───
      {
        order:       3,
        image_url:   '',
        headline:    '',  // "STOK TERBATAS!"
        body:        '',  // "Hanya 50 PCS Tersisa"
        cta_text:    null,
        duration_ms: 2500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'scale_in',
            delay_ms:        100,
            duration_ms:     400,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'center',
            background_tint: 'red',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        500,
            duration_ms:     400,
            position:        'middle_center',
            text_color:      'red',
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
            duration_ms:     300,
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 5: CTA ───
      {
        order:       4,
        image_url:   '',
        headline:    '',  // "Buruan Order!"
        body:        '',  // optional
        cta_text:    '',  // "Klik Sekarang"
        duration_ms: 3000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        100,
            duration_ms:     400,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         false,
            animation:       'none',
            delay_ms:        0,
            duration_ms:     0,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'center',
            background_tint: 'none',
          },
          cta: {
            visible:         true,
            animation:       'pulse',
            delay_ms:        700,
            duration_ms:     400,
            position:        'bottom_center',
            text_color:      'white',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'red',
          },
          logo: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        0,
            duration_ms:     300,
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
    ],
    transition_pattern:     'slide_left',
    transition_ms:          400,
    text_reveal_enabled:    false,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 100,
    loop:                   true,
  },
};

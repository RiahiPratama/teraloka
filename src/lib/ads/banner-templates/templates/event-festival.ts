/**
 * TeraLoka — Banner Template: Event Festival
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/templates/event-festival.ts
 *
 * Festive 3-scene untuk Event/Festival/Konser/Workshop.
 *
 * Scene 1: Event Name  — Nama event dengan text_reveal effect
 * Scene 2: Detail      — Tanggal + venue dramatic
 * Scene 3: Tickets     — CTA "Tickets Available" pulse
 *
 * Mood: Festive, fun, build-up excitement.
 * Target: Konser, festival, workshop, exhibition, event.
 * ────────────────────────────────────────────────────────────────
 */

import type { BannerTemplate } from '../types';

export const EVENT_FESTIVAL: BannerTemplate = {
  id:                 'event-festival',
  label:              'Event Festival',
  icon:               '🎉',
  segment:            'event',
  mood:               'festive',
  tagline:            'Festive 3-scene build-up untuk Event/Konser/Festival',
  description_id:     'Festive 3-slide build-up: Event Name → Detail → Tickets. Cocok untuk konser, festival, workshop, pameran yang butuh feel excitement.',
  target_use_case:    'Konser, Festival, Workshop, Pameran, Event Komunitas',
  variant_hints: [
    'Scene 1 (Event Name): Nama event + tagline (cth: "Festival Cengkeh 2026")',
    'Scene 2 (Detail): Tanggal + venue (cth: "7-9 Agustus | Benteng Oranje, Ternate")',
    'Scene 3 (Tickets): Action call (cth: "Get Your Tickets Now!")',
  ],
  timeline: {
    variants: [
      // ─── SCENE 1: EVENT NAME ───
      {
        order:       0,
        image_url:   '',
        headline:    '',  // "Festival Cengkeh 2026"
        body:        '',  // "Celebrating Maluku Utara"
        cta_text:    null,
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'text_reveal',
            delay_ms:        300,
            duration_ms:     1200,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'xl',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        1700,
            duration_ms:     500,
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
            duration_ms:     400,
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 2: DETAIL ───
      {
        order:       1,
        image_url:   '',
        headline:    '',  // "7-9 Agustus 2026"
        body:        '',  // "Benteng Oranje, Ternate"
        cta_text:    null,
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'top',
            delay_ms:        300,
            duration_ms:     600,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'lg',
            text_align:      'center',
            background_tint: 'purple',
          },
          body: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'bottom',
            delay_ms:        700,
            duration_ms:     600,
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
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 3: TICKETS ───
      {
        order:       2,
        image_url:   '',
        headline:    '',  // "Tickets Now Available!"
        body:        '',  // "Mulai Rp 50rb"
        cta_text:    '',  // "Beli Tiket"
        duration_ms: 4500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'scale_in',
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
            animation:       'fade_in',
            delay_ms:        800,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'sm',
            text_align:      'center',
            background_tint: 'none',
          },
          cta: {
            visible:         true,
            animation:       'pulse',
            delay_ms:        1400,
            duration_ms:     500,
            position:        'bottom_center',
            text_color:      'white',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'purple',
          },
          logo: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        0,
            duration_ms:     400,
            position:        'top_left',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'left',
            background_tint: 'none',
          },
        },
      },
    ],
    transition_pattern:     'slide_up',
    transition_ms:          600,
    text_reveal_enabled:    false,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 100,
    loop:                   true,
  },
};

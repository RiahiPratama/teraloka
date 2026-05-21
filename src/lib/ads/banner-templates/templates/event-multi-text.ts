/**
 * TeraLoka — Banner Template: Event Multi-Text (Kumparan Style)
 * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/banner-templates/templates/event-multi-text.ts
 *
 * Pattern Kumparan: 1 background image + 3 scene rotasi text berubah-ubah.
 * Admin upload SHARED BACKGROUND di top section, lalu isi text per scene.
 *
 * Scene 1: Hook            — "COMING SOON" + tagline event
 * Scene 2: Schedule        — Tanggal venues (multi-kota)
 * Scene 3: Info/CTA        — URL atau action call
 *
 * Reference: Kumparan home banner Tech Culture Fest BYD style.
 *
 * Mood: Showroom, polished, event-driven.
 * Target: Tech event, conference, festival, exhibition multi-kota.
 * ────────────────────────────────────────────────────────────────
 */

import type { BannerTemplate } from '../types';

export const EVENT_MULTI_TEXT: BannerTemplate = {
  id:                 'event-multi-text',
  label:              'Event Multi-Text (Kumparan Style)',
  icon:               '📣',
  segment:            'event',
  mood:               'showroom',
  tagline:            '1 background + 3 scene text berubah (Kumparan style)',
  description_id:     'Pattern Kumparan-style: 1 background image (upload sekali di "Shared Background"), text rotasi 3 scene. Hemat storage + consistent visual. Cocok untuk event multi-kota, conference, tech event.',
  target_use_case:    'Tech Event, Conference, Festival Multi-Kota, Exhibition',
  variant_hints: [
    'Scene 1 (Hook): "COMING SOON" + tagline event (cth: "BANDUNG • SURABAYA · FREE ENTRY")',
    'Scene 2 (Schedule): Tanggal venues (cth: "JAKARTA 20-24 MAY · MEDAN 3-7 JUNE · SEMARANG 17-21 JUNE")',
    'Scene 3 (Info/CTA): URL atau action (cth: "For more info visit https://example.com")',
  ],
  timeline: {
    variants: [
      // ─── SCENE 1: HOOK ───
      {
        order:       0,
        image_url:   '',  // Empty → fallback ke shared_background_url
        headline:    '',  // "COMING SOON"
        body:        '',  // "BANDUNG • SURABAYA · FREE ENTRY"
        cta_text:    null,
        duration_ms: 3500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'scale_in',
            delay_ms:        200,
            duration_ms:     600,
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
            text_color:      'white',
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
            position:        'top_right',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'right',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 2: SCHEDULE ───
      {
        order:       1,
        image_url:   '',  // Empty → fallback ke shared_background_url
        headline:    '',  // "JAKARTA 20-24 MAY 2026"
        body:        '',  // "MEDAN 3-7 JUNE · SEMARANG 17-21 JUNE"
        cta_text:    null,
        duration_ms: 4000,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'slide_in',
            slide_from:      'right',
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
            animation:       'slide_in',
            slide_from:      'left',
            delay_ms:        700,
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
            duration_ms:     400,
            position:        'top_right',
            text_color:      'white',
            text_size:       'sm',
            text_align:      'right',
            background_tint: 'none',
          },
        },
      },
      // ─── SCENE 3: INFO/CTA ───
      {
        order:       2,
        image_url:   '',  // Empty → fallback ke shared_background_url
        headline:    '',  // "For more information"
        body:        '',  // "visit https://example.com"
        cta_text:    null,
        duration_ms: 3500,
        element_overrides: {
          headline: {
            visible:         true,
            animation:       'fade_in',
            delay_ms:        300,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'white',
            text_size:       'md',
            text_align:      'center',
            background_tint: 'none',
          },
          body: {
            visible:         true,
            animation:       'scale_in',
            delay_ms:        800,
            duration_ms:     500,
            position:        'middle_center',
            text_color:      'amber',
            text_size:       'lg',
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
            text_size:       'sm',
            text_align:      'right',
            background_tint: 'none',
          },
        },
      },
    ],
    transition_pattern:     'fade',
    transition_ms:          600,
    text_reveal_enabled:    false,
    text_reveal_pattern:    'fade_in',
    text_reveal_stagger_ms: 150,
    loop:                   true,
    shared_background_url:  '',  // Admin upload 1 image di sini, semua variant pakai ini
  },
};

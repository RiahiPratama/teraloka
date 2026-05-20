/**
 * TeraLoka — Animation Helper: Slide Pattern
 * SESI 5H Phase 1 (20 Mei 2026) — GSAP Banner Foundation Track B
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/animations/slide.ts
 *
 * Pattern 2 dari 3 GSAP patterns Phase 1:
 *   ✅ Fade in/out (fade.ts)
 *   ✅ Slide in (this file)
 *   ⏳ Text reveal (text-reveal.ts)
 *
 * Use cases:
 *   - CTA button slide from right (call-to-action emphasis)
 *   - Headline slide from top
 *   - Image slide from side (left/right)
 *   - Logo slide from left (logo-first entrance)
 *
 * Default ease 'power3.out' (sharper deceleration → energetic feel,
 * cocok untuk CTA emphasis).
 *
 * Pattern RRR consistency:
 *   { pattern: 'slide_in', delay, duration, from: 'left'|'right'|'top'|'bottom' }
 * ────────────────────────────────────────────────────────────────
 */

import type { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────

/**
 * Direction asal slide-in animation.
 */
export type SlideDirection = 'left' | 'right' | 'top' | 'bottom';

export interface SlideConfig {
  /** Arah asal element slide-in. Default 'left'. */
  from?:     SlideDirection;
  /** Delay sebelum animation start (ms). Default 0. */
  delay?:    number;
  /** Duration animation (ms). Default 500. */
  duration?: number;
  /** Distance offset dari arah `from` (px). Default 100 untuk horizontal, 50 vertical. */
  distance?: number;
  /** Easing function. Default 'power3.out'. */
  ease?:     string;
}

// ─── Defaults ─────────────────────────────────────────────────────

const SLIDE_DEFAULTS = {
  from:     'left' as SlideDirection,
  delay:    0,
  duration: 500,
  ease:     'power3.out',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Resolve initial offset (x, y) berdasarkan direction.
 * Vertical slides pakai distance lebih kecil (50px) untuk natural feel.
 */
function getInitialOffset(
  direction: SlideDirection,
  distance?: number,
): { x: number; y: number } {
  const horizontalDist = distance ?? 100;
  const verticalDist   = distance ?? 50;

  switch (direction) {
    case 'left':   return { x: -horizontalDist, y: 0 };
    case 'right':  return { x:  horizontalDist, y: 0 };
    case 'top':    return { x: 0, y: -verticalDist };
    case 'bottom': return { x: 0, y:  verticalDist };
  }
}

/**
 * Apply slide-in animation ke target element via GSAP timeline.
 *
 * Element starts offset dari final position + opacity 0,
 * transitions to final position + opacity 1.
 *
 * @param tl       GSAP timeline instance
 * @param target   DOM element atau CSS selector
 * @param config   Animation config (from, delay, duration, distance, ease)
 *
 * Example:
 *   const tl = gsap.timeline();
 *   applySlideIn(tl, '.cta', { from: 'bottom', delay: 1500, duration: 400 });
 *   applySlideIn(tl, '.logo', { from: 'left', delay: 200, duration: 500 });
 */
export function applySlideIn(
  tl:     gsap.core.Timeline,
  target: gsap.TweenTarget,
  config: SlideConfig = {},
): void {
  const direction = config.from     ?? SLIDE_DEFAULTS.from;
  const delay     = config.delay    ?? SLIDE_DEFAULTS.delay;
  const duration  = config.duration ?? SLIDE_DEFAULTS.duration;
  const ease      = config.ease     ?? SLIDE_DEFAULTS.ease;
  const offset    = getInitialOffset(direction, config.distance);

  tl.fromTo(
    target,
    {
      x:       offset.x,
      y:       offset.y,
      opacity: 0,
    },
    {
      x:        0,
      y:        0,
      opacity:  1,
      duration: duration / 1000,
      ease,
    },
    delay / 1000,
  );
}

/**
 * Apply final static state untuk slide pattern (untuk reduce-motion fallback).
 *
 * Bukan animasi — langsung set ke end state (x=0, y=0, opacity=1).
 * Element tampil di posisi akhirnya tanpa gerakan.
 */
export function applySlideStatic(target: HTMLElement): void {
  target.style.transform = 'translate(0, 0)';
  target.style.opacity   = '1';
}

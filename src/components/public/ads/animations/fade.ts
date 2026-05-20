/**
 * TeraLoka — Animation Helper: Fade Pattern
 * SESI 5H Phase 1 (20 Mei 2026) — GSAP Banner Foundation Track B
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/animations/fade.ts
 *
 * Pattern 1 dari 3 GSAP patterns Phase 1:
 *   ✅ Fade in/out (this file)
 *   ⏳ Slide in (slide.ts)
 *   ⏳ Text reveal (text-reveal.ts)
 *
 * Use cases:
 *   - Logo reveal saat banner start
 *   - Image background fade in
 *   - Subtle entrance untuk any element
 *   - Subheadline emphasis after main reveal
 *
 * Pattern RRR (NEW): Animation Timeline JSON Schema v1.0
 *   Format consistent across 3 helpers:
 *   { pattern: 'fade_in' | 'fade_out', delay: number, duration: number }
 *
 * Filosofi:
 *   - Fade = subtle, non-aggressive (Editorial-ADS Firewall safe)
 *   - Default ease 'power2.out' (smooth deceleration, natural feel)
 * ────────────────────────────────────────────────────────────────
 */

import type { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────

/**
 * Config untuk fade pattern.
 * delay + duration dalam milliseconds (consistent dengan JSON timeline).
 */
export interface FadeConfig {
  /** Delay sebelum animation start (ms). Default 0. */
  delay?:    number;
  /** Duration animation (ms). Default 500. */
  duration?: number;
  /** Easing function (GSAP ease string). Default 'power2.out'. */
  ease?:     string;
}

// ─── Defaults ─────────────────────────────────────────────────────

const FADE_DEFAULTS = {
  delay:    0,
  duration: 500,
  ease:     'power2.out',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Apply fade-in animation ke target element via GSAP timeline.
 *
 * Element starts at opacity 0, transitions to opacity 1.
 *
 * @param tl       GSAP timeline instance (dari gsap.timeline())
 * @param target   DOM element atau CSS selector
 * @param config   Animation config (delay, duration, ease)
 *
 * Example:
 *   const tl = gsap.timeline();
 *   applyFadeIn(tl, '.logo', { delay: 0, duration: 500 });
 *   applyFadeIn(tl, '.headline', { delay: 500, duration: 600 });
 */
export function applyFadeIn(
  tl:     gsap.core.Timeline,
  target: gsap.TweenTarget,
  config: FadeConfig = {},
): void {
  const delay    = config.delay    ?? FADE_DEFAULTS.delay;
  const duration = config.duration ?? FADE_DEFAULTS.duration;
  const ease     = config.ease     ?? FADE_DEFAULTS.ease;

  tl.fromTo(
    target,
    { opacity: 0 },
    {
      opacity:  1,
      duration: duration / 1000,
      ease,
    },
    delay / 1000,
  );
}

/**
 * Apply fade-out animation ke target element via GSAP timeline.
 *
 * Element starts at opacity 1, transitions to opacity 0.
 *
 * Use case: phase out element setelah animation sequence selesai
 *           (rare di Phase 1 — biasanya elements stay visible).
 */
export function applyFadeOut(
  tl:     gsap.core.Timeline,
  target: gsap.TweenTarget,
  config: FadeConfig = {},
): void {
  const delay    = config.delay    ?? FADE_DEFAULTS.delay;
  const duration = config.duration ?? FADE_DEFAULTS.duration;
  const ease     = config.ease     ?? FADE_DEFAULTS.ease;

  tl.to(
    target,
    {
      opacity:  0,
      duration: duration / 1000,
      ease,
    },
    delay / 1000,
  );
}

/**
 * Apply final static state untuk fade pattern (untuk reduce-motion fallback).
 *
 * Bukan animasi — langsung set ke end state (opacity 1).
 * Dipakai saat user prefers-reduced-motion atau slow network.
 */
export function applyFadeStatic(target: HTMLElement): void {
  target.style.opacity = '1';
}

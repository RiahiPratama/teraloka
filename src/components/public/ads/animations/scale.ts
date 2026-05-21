/**
 * TeraLoka — Animation Helper: Scale Pattern
 * SESI 5H Phase 5A.2 (21 Mei 2026) — GSAP Banner Foundation Track B
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/animations/scale.ts
 *
 * Pattern 4 dari helpers Phase 5A:
 *   ✅ Fade in/out (fade.ts)
 *   ✅ Slide in (slide.ts)
 *   ✅ Text reveal (text-reveal.ts)
 *   ✅ Scale (this file) ← NEW
 *   ✅ Stagger group (stagger-group.ts) ← NEW
 *
 * Use cases:
 *   - Logo entrance "zoom in" subtle
 *   - Badge "pop in" attention
 *   - CTA button emphasize
 *   - Card grid item entrance
 *
 * Technique:
 *   GSAP fromTo dari scale 0.8 + opacity 0 → scale 1 + opacity 1
 *   Dengan transform-origin center untuk natural feel.
 *
 * Filosofi:
 *   - Scale HALUS (founder LOCKED: scale halus, bukan scale berlebihan)
 *   - Default 0.8 (subtle) — bukan 0.5 atau 0 (overdramatic)
 *   - Ease 'back.out(1.4)' = subtle overshoot kasi karakter, gak shaky
 *
 * Pattern RRR consistency:
 *   { pattern: 'scale', delay, duration, from_scale?, ease? }
 *
 * Default ease 'back.out(1.4)' — gentle overshoot, premium feel.
 * ────────────────────────────────────────────────────────────────
 */

import type { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────

export interface ScaleConfig {
  /** Delay sebelum animation start (ms). Default 0. */
  delay?:    number;

  /** Animation duration (ms). Default 600. */
  duration?: number;

  /**
   * Scale awal — element start dari scale ini, animate ke 1.
   * Range: 0 - 1 (0=invisible point, 1=normal size).
   * Default: 0.8 (subtle, sesuai founder LOCKED "halus").
   *
   * Avoid:
   *   - < 0.5 = overdramatic (mengganggu reading)
   *   - > 0.95 = imperceptible (waste of animation budget)
   */
  from_scale?: number;

  /** Easing function. Default 'back.out(1.4)' (subtle overshoot). */
  ease?: string;
}

// ─── Defaults ─────────────────────────────────────────────────────

const SCALE_DEFAULTS = {
  delay:      0,
  duration:   600,
  from_scale: 0.8,
  ease:       'back.out(1.4)',
} as const;

/**
 * Validate from_scale dalam range aman (0.5 - 1.0).
 * Out-of-range → clamp ke default.
 */
function safeFromScale(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return SCALE_DEFAULTS.from_scale;
  }
  // Clamp range untuk avoid overdramatic atau imperceptible
  return Math.max(0.5, Math.min(0.95, value));
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Apply scale-in animation ke target element via GSAP timeline.
 *
 * Element animate dari:
 *   - scale: from_scale (e.g. 0.8) + opacity 0
 * Menuju:
 *   - scale: 1 + opacity 1
 *
 * Transform-origin center untuk natural "zoom in" feel.
 *
 * @param tl       GSAP timeline instance
 * @param target   HTMLElement atau selector string
 * @param config   Animation config
 *
 * Example:
 *   applyScaleIn(tl, logoEl, { delay: 0, duration: 500 });
 *   applyScaleIn(tl, badgeEl, { delay: 800, duration: 400, from_scale: 0.6 });
 */
export function applyScaleIn(
  tl:     gsap.core.Timeline,
  target: HTMLElement | string,
  config: ScaleConfig = {},
): void {
  const delay      = config.delay      ?? SCALE_DEFAULTS.delay;
  const duration   = config.duration   ?? SCALE_DEFAULTS.duration;
  const from_scale = safeFromScale(config.from_scale);
  const ease       = config.ease       ?? SCALE_DEFAULTS.ease;

  tl.fromTo(
    target,
    {
      opacity:         0,
      scale:           from_scale,
      transformOrigin: 'center center',
    },
    {
      opacity:  1,
      scale:    1,
      duration: duration / 1000,
      ease,
    },
    delay / 1000,
  );
}

/**
 * Apply final static state untuk scale (untuk reduce-motion fallback).
 *
 * Bukan animasi — element langsung tampil di final state (scale 1, opacity 1).
 */
export function applyScaleStatic(target: HTMLElement): void {
  target.style.opacity   = '1';
  target.style.transform = 'scale(1)';
}

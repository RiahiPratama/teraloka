/**
 * TeraLoka — Animation Helper: Pulse Pattern
 * SESI 5H Phase 5B Path Y (21 Mei 2026) — Tier 2 Full
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/animations/pulse.ts
 *
 * Pulse animation untuk attention-grabbing elements (CTA button, badge).
 *
 * Technique:
 *   - GSAP yoyo timeline (scale 1 ↔ 1.05 loop)
 *   - Subtle pulse, gak agresif
 *   - Default ease: power1.inOut (smooth)
 *
 * Use cases:
 *   - CTA button: "Klik Sekarang!" pulse loop
 *   - Promo badge: "DISKON 50%" attention
 *   - Limited offer indicator
 *
 * Filosofi:
 *   - SUBTLE (founder LOCKED: pulse halus, bukan agresif)
 *   - Loop INFINITE tapi gentle
 *   - Auto-stop saat element off-screen (IntersectionObserver handled di parent)
 * ────────────────────────────────────────────────────────────────
 */

import type { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────

export interface PulseConfig {
  /** Delay sebelum pulse start (ms). Default 0. */
  delay?:        number;

  /** Per-cycle duration (ms). Default 1000 (subtle slow pulse). */
  duration?:     number;

  /**
   * Max scale di pulse peak. Default 1.05 (subtle).
   * Range: 1.02 - 1.15 (clamp untuk avoid agresif).
   */
  max_scale?:    number;

  /** Easing function. Default 'power1.inOut' (smooth). */
  ease?:         string;
}

// ─── Defaults ─────────────────────────────────────────────────────

const PULSE_DEFAULTS = {
  delay:     0,
  duration:  1000,
  max_scale: 1.05,
  ease:      'power1.inOut',
} as const;

/**
 * Validate max_scale dalam range subtle.
 */
function safeMaxScale(value: number | undefined): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return PULSE_DEFAULTS.max_scale;
  }
  return Math.max(1.02, Math.min(1.15, value));
}

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Apply pulse animation ke target element via GSAP timeline.
 *
 * Pulse cycle: scale 1 → max_scale → 1 (yoyo + repeat infinite)
 * Transform-origin center untuk natural pulse feel.
 *
 * @param tl       GSAP timeline instance
 * @param target   HTMLElement atau selector string
 * @param config   Animation config
 */
export function applyPulse(
  tl:     gsap.core.Timeline,
  target: HTMLElement | string,
  config: PulseConfig = {},
): void {
  const delay    = config.delay     ?? PULSE_DEFAULTS.delay;
  const duration = config.duration  ?? PULSE_DEFAULTS.duration;
  const maxScale = safeMaxScale(config.max_scale);
  const ease     = config.ease      ?? PULSE_DEFAULTS.ease;

  // Pulse: scale 1 → max → 1 (yoyo + repeat -1)
  tl.to(
    target,
    {
      scale:            maxScale,
      transformOrigin:  'center center',
      duration:         duration / 1000,
      ease,
      repeat:           -1,
      yoyo:             true,
    },
    delay / 1000,
  );
}

/**
 * Apply final static state untuk pulse (untuk reduce-motion fallback).
 * No-op karena pulse = element tetap di scale 1 (resting state).
 */
export function applyPulseStatic(target: HTMLElement): void {
  target.style.opacity   = '1';
  target.style.transform = 'scale(1)';
}

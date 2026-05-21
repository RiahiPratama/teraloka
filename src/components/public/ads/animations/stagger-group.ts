/**
 * TeraLoka — Animation Helper: Stagger Group Pattern
 * SESI 5H Phase 5A.2 (21 Mei 2026) — GSAP Banner Foundation Track B
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/animations/stagger-group.ts
 *
 * Pattern 5 dari helpers Phase 5A:
 *   ✅ Fade in/out (fade.ts)
 *   ✅ Slide in (slide.ts)
 *   ✅ Text reveal (text-reveal.ts)
 *   ✅ Scale (scale.ts)
 *   ✅ Stagger group (this file) ← NEW
 *
 * BEDA dari helpers lain:
 *   - Other helpers target 1 element
 *   - Stagger group target MULTIPLE elements (children selector)
 *   - Cocok untuk: feature list, badge cluster, icon row, gallery
 *
 * Use cases:
 *   - 3-4 fitur produk muncul satu-per-satu
 *   - Badge "Premium" + "Best Seller" + "Diskon" cluster
 *   - Nav items entrance
 *   - Photo gallery thumbnail entrance
 *
 * Technique:
 *   - Resolve children via CSS selector (e.g., '.stagger-item')
 *   - GSAP fromTo dengan stagger config
 *   - Each child animate dari opacity:0 + y:offset → opacity:1 + y:0
 *
 * Filosofi:
 *   - Subtle stagger (default 0.1s) — bukan over-staggered yang lama
 *   - Default 4 children optimal (Phase 1 testing) — kalau lebih banyak,
 *     auto-clamp stagger biar total durasi gak overflow
 *
 * Pattern RRR consistency:
 *   { pattern: 'stagger_group',
 *     target_selector: '.parent .child',  ← multi-element selector
 *     delay, duration,
 *     stagger?, y_offset?, ease? }
 *
 * Default ease 'power2.out' (gentle deceleration).
 * ────────────────────────────────────────────────────────────────
 */

import type { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────

export interface StaggerGroupConfig {
  /** Delay sebelum animation start (ms). Default 0. */
  delay?:    number;

  /** Per-item animation duration (ms). Default 500. */
  duration?: number;

  /**
   * Stagger delay antar items (ms).
   * Default 100ms (subtle, smooth flow).
   * Auto-clamp jika items × stagger > 2000ms (avoid overflow).
   */
  stagger?:  number;

  /**
   * Y offset (px) — items mulai dari posisi ini, slide naik ke 0.
   * Default 12 (subtle lift).
   * Use 0 untuk pure fade tanpa motion.
   */
  y_offset?: number;

  /** Easing function. Default 'power2.out' (gentle deceleration). */
  ease?: string;
}

// ─── Defaults ─────────────────────────────────────────────────────

const STAGGER_DEFAULTS = {
  delay:    0,
  duration: 500,
  stagger:  100,
  y_offset: 12,
  ease:     'power2.out',
  max_total_stagger_ms: 2000,
} as const;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Resolve children elements dari selector string atau parent element.
 *
 * @param parentOrSelector  Parent HTMLElement atau selector string
 *                           (e.g., '.stagger-group .item')
 * @returns                 Array of HTMLElement children (atau empty array)
 */
function resolveChildren(
  parentOrSelector: HTMLElement | string,
): HTMLElement[] {
  if (typeof parentOrSelector === 'string') {
    // Selector langsung query semua matching elements
    const nodes = document.querySelectorAll<HTMLElement>(parentOrSelector);
    return Array.from(nodes);
  }

  // HTMLElement → return semua direct children
  const children = Array.from(parentOrSelector.children) as HTMLElement[];
  return children;
}

/**
 * Compute safe stagger value (clamp untuk avoid total durasi overflow).
 *
 * @param requestedStagger  Stagger value yang diminta (ms)
 * @param itemCount         Jumlah items
 * @returns                 Safe stagger (ms)
 */
function safeStagger(requestedStagger: number, itemCount: number): number {
  if (itemCount <= 1) return 0;

  const totalIfApplied = requestedStagger * (itemCount - 1);
  if (totalIfApplied <= STAGGER_DEFAULTS.max_total_stagger_ms) {
    return requestedStagger;
  }

  // Clamp: distribute max_total across items
  return STAGGER_DEFAULTS.max_total_stagger_ms / (itemCount - 1);
}

/**
 * Apply stagger group animation ke multiple targets via GSAP timeline.
 *
 * Children animate dari:
 *   - opacity: 0, y: y_offset
 * Menuju:
 *   - opacity: 1, y: 0
 * Dengan stagger antar items.
 *
 * @param tl                     GSAP timeline instance
 * @param parentOrSelector       Parent HTMLElement (auto-find children),
 *                                ATAU selector string langsung ke children
 *                                (e.g., '.stagger-group > .item')
 * @param config                 Animation config
 *
 * Example:
 *   const parentEl = document.querySelector('.feature-list');
 *   applyStaggerGroup(tl, parentEl, { delay: 600, stagger: 80 });
 *
 *   // Atau via selector langsung:
 *   applyStaggerGroup(tl, '.badge-cluster .badge', { delay: 800, y_offset: 8 });
 */
export function applyStaggerGroup(
  tl:               gsap.core.Timeline,
  parentOrSelector: HTMLElement | string,
  config:           StaggerGroupConfig = {},
): void {
  const children = resolveChildren(parentOrSelector);

  if (children.length === 0) {
    console.warn(
      `[StaggerGroup] No children found for target. Skipping animation.`,
    );
    return;
  }

  const delay    = config.delay    ?? STAGGER_DEFAULTS.delay;
  const duration = config.duration ?? STAGGER_DEFAULTS.duration;
  const yOffset  = config.y_offset ?? STAGGER_DEFAULTS.y_offset;
  const ease     = config.ease     ?? STAGGER_DEFAULTS.ease;

  const requestedStagger = config.stagger ?? STAGGER_DEFAULTS.stagger;
  const stagger          = safeStagger(requestedStagger, children.length);

  tl.fromTo(
    children,
    {
      opacity: 0,
      y:       yOffset,
    },
    {
      opacity:  1,
      y:        0,
      duration: duration / 1000,
      stagger:  stagger / 1000,
      ease,
    },
    delay / 1000,
  );
}

/**
 * Apply final static state untuk stagger group (untuk reduce-motion fallback).
 *
 * Semua children langsung tampil di final state (opacity 1, transform reset).
 *
 * @param parentOrSelector  Parent HTMLElement atau selector string
 */
export function applyStaggerGroupStatic(
  parentOrSelector: HTMLElement | string,
): void {
  const children = resolveChildren(parentOrSelector);

  for (const child of children) {
    child.style.opacity   = '1';
    child.style.transform = 'translateY(0px)';
  }
}

/**
 * TeraLoka — Animation Helper: Text Reveal Pattern
 * SESI 5H Phase 1 (20 Mei 2026) — GSAP Banner Foundation Track B
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/animations/text-reveal.ts
 *
 * Pattern 3 dari 3 GSAP patterns Phase 1:
 *   ✅ Fade in/out (fade.ts)
 *   ✅ Slide in (slide.ts)
 *   ✅ Text reveal (this file)
 *
 * Use cases:
 *   - Headline reveal char by char (premium feel, premium tier)
 *   - CTA button text reveal
 *   - Promo announcement
 *
 * Technique:
 *   1. Split text content jadi array of chars (or words)
 *   2. Wrap each char dalam <span class="char"> dengan opacity 0
 *   3. GSAP stagger animate opacity 1 dengan delay between chars
 *
 * Default ease 'power1.out' (gentle deceleration, readable typing-like feel).
 *
 * Edge cases handled:
 *   - HTML entity preservation (&nbsp; untuk spaces)
 *   - innerHTML overwrite — caller WAJIB pakai element kosong / dedicated text
 *   - Re-call same element = re-split (idempotent via cleanup ref)
 *
 * Pattern RRR consistency:
 *   { pattern: 'text_reveal', delay, duration, stagger, unit?: 'char'|'word' }
 *
 * Filosofi:
 *   - Text reveal = premium feel (cocok klien Bronze/Silver/Gold)
 *   - Avoid di basic tier (klien UMKM gak butuh sophistication this level)
 * ────────────────────────────────────────────────────────────────
 */

import type { gsap } from 'gsap';

// ─── Types ────────────────────────────────────────────────────────

/**
 * Unit split untuk text reveal:
 *   - 'char': per character (default, paling smooth)
 *   - 'word': per word (faster total duration, less granular)
 */
export type TextRevealUnit = 'char' | 'word';

export interface TextRevealConfig {
  /** Delay sebelum animation start (ms). Default 0. */
  delay?:    number;
  /** Total duration approximation (ms). Default 1000. */
  duration?: number;
  /** Per-char/word stagger delay (ms). Default auto-compute dari duration. */
  stagger?:  number;
  /** Split unit: 'char' atau 'word'. Default 'char'. */
  unit?:     TextRevealUnit;
  /** Easing function. Default 'power1.out'. */
  ease?:     string;
}

// ─── Defaults ─────────────────────────────────────────────────────

const TEXT_REVEAL_DEFAULTS = {
  delay:    0,
  duration: 1000,
  unit:     'char' as TextRevealUnit,
  ease:     'power1.out',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────

/**
 * Escape HTML special chars untuk safety (prevent XSS via timeline JSON).
 * Note: text content dari klien advertiser via founder review — masih
 * defensive untuk avoid accidental HTML injection.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Split text content jadi array of HTML span elements.
 * Spaces direplace dengan &nbsp; untuk preserve layout.
 *
 * @param element  Target DOM element (text content akan di-overwrite)
 * @param unit     Split unit 'char' atau 'word'
 * @returns        NodeList of span elements (untuk GSAP stagger animation)
 */
function splitTextIntoSpans(
  element: HTMLElement,
  unit:    TextRevealUnit,
): NodeListOf<HTMLSpanElement> {
  const text = element.textContent || '';
  const escapedSafe = escapeHtml(text);

  let html: string;
  if (unit === 'word') {
    // Split per word, preserve spaces
    html = escapedSafe
      .split(/(\s+)/)
      .map((token) => {
        // Whitespace token — keep as-is
        if (/^\s+$/.test(token)) return token;
        return `<span class="tr-word" style="opacity:0;display:inline-block">${token}</span>`;
      })
      .join('');
  } else {
    // Split per char, &nbsp; untuk space agar inline-block render benar
    html = escapedSafe
      .split('')
      .map((c) => {
        const safe = c === ' ' ? '&nbsp;' : c;
        return `<span class="tr-char" style="opacity:0;display:inline-block">${safe}</span>`;
      })
      .join('');
  }

  element.innerHTML = html;

  const selector = unit === 'word' ? '.tr-word' : '.tr-char';
  return element.querySelectorAll<HTMLSpanElement>(selector);
}

/**
 * Apply text reveal animation ke target element via GSAP timeline.
 *
 * IMPORTANT: target HARUS HTMLElement (bukan selector string),
 * karena helper perlu split textContent jadi spans.
 *
 * @param tl       GSAP timeline instance
 * @param target   HTMLElement (text container)
 * @param config   Animation config
 *
 * Example:
 *   const headline = document.querySelector('.headline');
 *   const tl = gsap.timeline();
 *   applyTextReveal(tl, headline, { delay: 800, duration: 1000, unit: 'char' });
 *
 * Lifecycle note:
 *   - Re-call SAME element akan re-split innerHTML (idempotent OK)
 *   - Component unmount: cleanup oleh React/parent (innerHTML cleared)
 */
export function applyTextReveal(
  tl:     gsap.core.Timeline,
  target: HTMLElement,
  config: TextRevealConfig = {},
): void {
  const delay    = config.delay    ?? TEXT_REVEAL_DEFAULTS.delay;
  const duration = config.duration ?? TEXT_REVEAL_DEFAULTS.duration;
  const unit     = config.unit     ?? TEXT_REVEAL_DEFAULTS.unit;
  const ease     = config.ease     ?? TEXT_REVEAL_DEFAULTS.ease;

  // Split text jadi spans
  const items = splitTextIntoSpans(target, unit);
  if (items.length === 0) return;

  // Compute stagger:
  //   - Explicit config → pakai
  //   - Auto: bagi duration rata ke jumlah items (clamped 20-80ms per item)
  let stagger: number;
  if (typeof config.stagger === 'number' && config.stagger > 0) {
    stagger = config.stagger / 1000;
  } else {
    const autoStagger = (duration / items.length) / 1000;
    // Clamp range 0.02s - 0.08s (20-80ms per char/word)
    stagger = Math.max(0.02, Math.min(0.08, autoStagger));
  }

  // Per-char/word duration (short, biar overall feels typing-like)
  const itemDuration = unit === 'word' ? 0.15 : 0.05;

  tl.to(
    items,
    {
      opacity:  1,
      duration: itemDuration,
      stagger,
      ease,
    },
    delay / 1000,
  );
}

/**
 * Apply final static state untuk text reveal (untuk reduce-motion fallback).
 *
 * Bukan animasi — langsung tampil full text dengan all opacity 1.
 * Tidak split spans (lebih efisien, no DOM manipulation overhead).
 */
export function applyTextRevealStatic(target: HTMLElement): void {
  // Pastikan text tampil full (clear any leftover spans dari prev animation)
  const original = target.textContent || '';
  target.innerHTML = escapeHtml(original);
  target.style.opacity = '1';
}

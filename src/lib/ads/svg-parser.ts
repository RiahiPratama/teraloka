'use client';

// ════════════════════════════════════════════════════════════════
// TeraLoka Ads — SVG Parser & Sanitizer
// PATH: src/lib/ads/svg-parser.ts
// ────────────────────────────────────────────────────────────────
// SESI 6 Sub-Phase 6D Batch 6D.2 (22 Mei 2026) — TD-ANIM-102 NEW.
//
// WHAT:
//   Library helpers untuk SVG illustration layer:
//   1. sanitizeSvg(markup): DOMPurify-based XSS hardening (script/onclick/etc strip)
//   2. validateSvg(markup): structural check + size limits
//   3. extractDimensions(markup): pull width/height/viewBox dari raw SVG
//
// SECURITY MODEL (Defense in Depth Filosofi #2):
//   - Sanitize at SAVE time (admin builder paste handler)
//   - Sanitized markup stored di JSONB svg_layers[].svg_markup
//   - Public AdAnimatedBanner render TRUSTS stored markup (no runtime sanitize)
//   - Backend bisa re-sanitize sebagai second line (Phase 6E future)
//
// DEPENDENCY: dompurify (npm install dompurify @types/dompurify)
//   ⚠️ Client-side only — 'use client' enforce. Don't import dari server code.
//
// Patterns: AAS (lib/ads folder), Defense in Depth (Filosofi #2),
//           AAM (Reality-Verified — sanitize matches PRD §6.4 spec).
// ════════════════════════════════════════════════════════════════

import DOMPurify from 'dompurify';

// ─── Constants ──────────────────────────────────────────────────

/** Max sanitized SVG markup size in bytes (50 KB).
 *  Bigger than ini = bad UX (slow render + bloated JSONB). */
export const MAX_SVG_BYTES = 50 * 1024;

/** Min meaningful SVG markup length (basic sanity check). */
export const MIN_SVG_CHARS = 20;

/** Default dimensions kalau viewBox/width/height absent. */
export const DEFAULT_SVG_DIMENSIONS = { width: 100, height: 100 };

// ─── Types ──────────────────────────────────────────────────────

export interface SvgValidationResult {
  valid:    boolean;
  error?:   string;
  warning?: string;
}

export interface SvgDimensions {
  width:  number;
  height: number;
  source: 'viewBox' | 'attribute' | 'default';
}

// ─── DOMPurify config (mirror PRD §6.4) ─────────────────────────

/**
 * DOMPurify config untuk SVG sanitization.
 * Reference: PRD-ANIM-V6.md §6.4 Security Model.
 *
 * Strict rules:
 * - USE_PROFILES.svg = true → allow standard SVG elements (path/rect/g/circle/etc)
 * - USE_PROFILES.svgFilters = true → allow filter primitives (feGaussianBlur/feOffset/etc)
 * - FORBID_TAGS: script/foreignObject → XSS vector elimination
 * - FORBID_ATTR: event handlers (onclick/onload/onerror/onmouseover/etc) → no JS execution
 *
 * NOTE: `satisfies` operator (TS 4.9+) digunakan instead of `:` annotation
 * untuk avoid namespace conflict dompurify v3+ native types vs @types/dompurify.
 */
const SANITIZE_CONFIG = {
  USE_PROFILES: { svg: true, svgFilters: true },
  FORBID_TAGS:  ['script', 'foreignObject'],
  FORBID_ATTR:  [
    'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'onkeydown', 'onkeyup',
  ],
  // Strip non-SVG content yang accidentally pasted (html tags, etc)
  ALLOWED_NAMESPACES: ['http://www.w3.org/2000/svg', 'http://www.w3.org/1999/xlink'],
} satisfies Parameters<typeof DOMPurify.sanitize>[1];

// ─── Sanitize ───────────────────────────────────────────────────

/**
 * Sanitize SVG markup string via DOMPurify.
 * Returns clean SVG string aman untuk render via dangerouslySetInnerHTML.
 *
 * ⚠️ Client-side only (DOMPurify needs window/DOM).
 * ⚠️ Empty string returned kalau markup invalid / not SVG.
 *
 * @example
 *   const dirty = '<svg onload="alert(1)"><script>alert(2)</script><circle/></svg>'
 *   const clean = sanitizeSvg(dirty)
 *   // → '<svg><circle></circle></svg>'  (onload + script stripped)
 */
export function sanitizeSvg(markup: string): string {
  if (typeof window === 'undefined') {
    // SSR safety — return as-is (caller will re-sanitize on hydrate)
    return markup;
  }
  if (!markup || typeof markup !== 'string') return '';
  return DOMPurify.sanitize(markup, SANITIZE_CONFIG) as string;
}

// ─── Validate ───────────────────────────────────────────────────

/**
 * Structural + size validation untuk SVG markup.
 * Run AFTER sanitize.
 *
 * Returns { valid, error?, warning? }:
 * - valid=false + error: blocking issue (admin must fix)
 * - valid=true + warning: non-blocking advisory (e.g. large size)
 */
export function validateSvg(markup: string): SvgValidationResult {
  if (!markup || typeof markup !== 'string') {
    return { valid: false, error: 'Markup kosong atau tidak valid' };
  }
  if (markup.length < MIN_SVG_CHARS) {
    return { valid: false, error: `Markup terlalu pendek (min ${MIN_SVG_CHARS} karakter)` };
  }

  // Encode-aware size check (UTF-8 bytes, bukan JS string length)
  const byteSize = new Blob([markup]).size;
  if (byteSize > MAX_SVG_BYTES) {
    return {
      valid: false,
      error: `Markup terlalu besar (${(byteSize / 1024).toFixed(1)} KB). Max ${MAX_SVG_BYTES / 1024} KB. Coba optimize via SVGOMG (https://jakearchibald.github.io/svgomg/).`,
    };
  }

  // Must contain at least <svg ... > opening tag
  if (!/^[\s\S]*?<svg[\s>]/i.test(markup)) {
    return { valid: false, error: 'Markup harus mengandung tag <svg>. Paste full SVG dari editor (Inkscape/Figma/Illustrator).' };
  }

  // Warn jika markup nge-include <foreignObject> atau <script> (sanitize akan strip)
  if (/<(script|foreignObject)\b/i.test(markup)) {
    return {
      valid: true,
      warning: 'Tag <script> / <foreignObject> terdeteksi — akan otomatis dihapus saat sanitize.',
    };
  }

  // Warn kalau ada event handler (sanitize akan strip)
  if (/\son(click|load|error|mouseover|mouseout|focus|blur|change|submit|keydown|keyup)\s*=/i.test(markup)) {
    return {
      valid: true,
      warning: 'Event handler (onclick/onload/dll) terdeteksi — akan otomatis dihapus saat sanitize.',
    };
  }

  // Warn besar tapi belum block (30-50 KB range)
  if (byteSize > 30 * 1024) {
    return {
      valid: true,
      warning: `Markup besar (${(byteSize / 1024).toFixed(1)} KB). Pertimbangkan optimize via SVGOMG untuk render performance.`,
    };
  }

  return { valid: true };
}

// ─── Extract dimensions ─────────────────────────────────────────

/**
 * Extract intended width/height dari SVG markup.
 * Priority order:
 *   1. viewBox="0 0 W H"  → ambil W, H (most reliable, scalable)
 *   2. width="N" height="M" attributes (px/numeric)
 *   3. DEFAULT_SVG_DIMENSIONS fallback
 *
 * Returns { width, height, source } untuk transparency ke caller.
 */
export function extractDimensions(markup: string): SvgDimensions {
  if (!markup || typeof markup !== 'string') {
    return { ...DEFAULT_SVG_DIMENSIONS, source: 'default' };
  }

  // Try viewBox first
  const viewBoxMatch = markup.match(/viewBox\s*=\s*["']?\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*["']?/i);
  if (viewBoxMatch) {
    const w = parseFloat(viewBoxMatch[3]);
    const h = parseFloat(viewBoxMatch[4]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return {
        width:  Math.round(w),
        height: Math.round(h),
        source: 'viewBox',
      };
    }
  }

  // Fall back to width + height attributes (ignore percent units)
  const widthMatch  = markup.match(/<svg\b[^>]*\swidth\s*=\s*["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
  const heightMatch = markup.match(/<svg\b[^>]*\sheight\s*=\s*["']?(\d+(?:\.\d+)?)(?:px)?["']?/i);
  if (widthMatch && heightMatch) {
    const w = parseFloat(widthMatch[1]);
    const h = parseFloat(heightMatch[1]);
    if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
      return {
        width:  Math.round(w),
        height: Math.round(h),
        source: 'attribute',
      };
    }
  }

  return { ...DEFAULT_SVG_DIMENSIONS, source: 'default' };
}

// ─── All-in-one pipeline ────────────────────────────────────────

export interface SvgProcessResult {
  sanitized:   string;
  dimensions:  SvgDimensions;
  validation:  SvgValidationResult;
}

/**
 * Run sanitize → validate → extract sequentially.
 * Convenience untuk admin builder flow (1 call dapat semua).
 *
 * Flow:
 *   1. validateSvg(raw) check → kalau invalid, return early dengan error
 *   2. sanitizeSvg(raw) → clean
 *   3. extractDimensions(clean) → final dims
 *
 * Note: validation pakai RAW markup (cek tag yang AKAN distrip).
 *       Dimension extraction pakai SANITIZED (post-clean).
 */
export function processSvg(rawMarkup: string): SvgProcessResult {
  const validation = validateSvg(rawMarkup);
  if (!validation.valid) {
    return {
      sanitized:  '',
      dimensions: { ...DEFAULT_SVG_DIMENSIONS, source: 'default' },
      validation,
    };
  }
  const sanitized  = sanitizeSvg(rawMarkup);
  const dimensions = extractDimensions(sanitized);
  return { sanitized, dimensions, validation };
}

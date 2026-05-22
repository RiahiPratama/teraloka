/**
 * AdAnimatedBanner — Tier 2 Full Per-Element Override Engine
 * SESI 5H Phase 5B Path Y (21 Mei 2026) + SESI 6 Phase 6A TD-ANIM-104 (22 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/public/ads/AdAnimatedBanner.tsx
 *
 * Tier 2 capabilities:
 *   ✅ Variant carousel (1-5 variants, DCA-aligned)
 *   ✅ Transition antar variant (fade/slide_left/slide_up/none)
 *   ✅ Text reveal global (fade_in/slide_in/text_reveal)
 *   ✅ NEW: Per-element override (logo/headline/body/cta)
 *      - Visibility toggle
 *      - Animation pattern: fade_in/slide_in/scale_in/text_reveal/pulse/none
 *      - Position preset: 9 anchor (top-left/center/right × top/middle/bottom)
 *      - Style: text_color/text_size/text_align/background_tint
 *      - Delay + duration individual
 *   ✅ "Use Global Default" fallback per element
 *
 * SESI 6 Phase 6A — TD-ANIM-104 (Text Shadow / Stroke / Gradient):
 *   ✅ text_shadow:   none|soft|medium|strong (depth/cinematic glow)
 *   ✅ text_stroke:   none|thin|medium|thick  (outline kontras bg busy)
 *   ✅ text_gradient: from→to color via background-clip:text trick
 *   ⚠️ Trade-off: gradient mode pakai backgroundImage (bukan background shorthand)
 *      → backgroundColor (tint) SURVIVE, jadi tint+gradient bisa coexist.
 *      → color jadi transparent saat gradient enabled (text di-clip dari bg image)
 *   ⚠️ Logo (img element) no-op untuk text effects — safe, gak break apapun
 *   ⚠️ Backward compat: 3 field OPTIONAL, undefined = no effect (Phase 5B preserved)
 *
 * SESI 6 Phase 6A — TD-ANIM-105 (Hover-Triggered Animation):
 *   ✅ hover_behavior: none|pause|replay|speed_up (4 mode, TIMELINE-level)
 *   ⚠️ reveal_extra DROPPED dari Phase 6A — defer Phase 6B (butuh per-variant element key)
 *   ⚠️ Mobile-safe: matchMedia('(hover: hover) and (pointer: fine)') guard
 *      → touch device skip handler binding TOTAL, gak ada tap-pause kecelakaan
 *   ⚠️ Backward compat: hover_behavior optional, undefined = 'none' (no listener bound)
 *
 * SESI 6 Sub-Phase 6B — TD-ANIM-101 (Custom Font Upload):
 *   ✅ FontFamily extend: 'sans'|'serif'|'display'|'mono'|`custom:${slug}`
 *   ✅ CustomFontMap prop: { [slug]: { cssFamily, url } } untuk lookup
 *   ✅ Dynamic FontFace API loader (lazy + cached per session)
 *   ✅ Graceful fallback: custom font tidak ter-load → fall back ke 'sans'
 *   ⚠️ Backward compat: customFonts prop optional, font_family preset tetap jalan
 *   ⚠️ Server-side render safe: skip FontFace API kalau window undefined
 *
 * SESI 6 Sub-Phase 6C — TD-ANIM-103 (Drag-Drop Pixel Positioning):
 *   ✅ ElementPosition extend: union PresetPosition | AbsolutePosition
 *      - PresetPosition: 9 anchor preset (Phase 5B, backward compat)
 *      - AbsolutePosition: { x, y } integer px dari top-left banner
 *   ✅ Type guard isAbsolutePosition() untuk discriminate
 *   ✅ getPositionStyle() handle dual mode (preset switch / absolute coord)
 *   ⚠️ Backward compat 100%: Phase 5B data (string preset) render identik,
 *      type guard fallback ke switch lama
 *   ⚠️ Soft bounds: render apply clamp visual, store raw value (creative effect OK)
 *   ⚠️ Phase 6C.1 = engine + minimal X/Y number input UI (Batch 6C.2 = PositionCanvas)
 *
 * SESI 6 Sub-Phase 6D Batch 6D.2 — TD-ANIM-102 (SVG Illustration Layer):
 *   ✅ SVGLayer type: { id, name, svg_markup, position, width, height,
 *      animation, delay_ms, duration_ms, z_index, visible }
 *   ✅ AnimationVariant.svg_layers?: SVGLayer[] (optional, backward compat)
 *   ✅ Render: dangerouslySetInnerHTML SANITIZED markup di div absolute positioned
 *   ✅ GSAP integration: 3 animation mode (none/fade_in/scale_in)
 *   ⚠️ Sanitization done at SAVE time (admin builder), public render trusts stored
 *   ⚠️ Backward compat: svg_layers optional, variant tanpa SVG render normal
 *   ⚠️ Defer Phase 7: draw_on path animation, file upload (paste-only MVP)
 *
 * SESI 6 Sub-Phase 6F (22 Mei 2026) — Object Layer + Logo Cleanup:
 *   ✅ ObjectLayer type: { id, name, image_url, position, width, height,
 *      animation, delay_ms, duration_ms, z_index, visible }
 *   ✅ AnimationVariant.object_layers?: ObjectLayer[] (optional, backward compat)
 *   ✅ Render: <img> element di absolute position dengan GSAP entry animation
 *   ✅ Accept .gif (animated), .png, .webp (static transparent)
 *   ✅ 3 animation mode (none/fade_in/scale_in) — mirror SVGLayer
 *   ⚠️ Logo element deprecation: 'logo' kind tetap di ElementKey type (backward compat data lama).
 *      Engine render logo HANYA kalau ada explicit override + image source.
 *      Builder UI tidak expose logo tab lagi (Phase 6F.1 cleanup).
 *
 * Layout engine:
 *   - Absolute positioning per element (9 anchor preset)
 *   - Z-index: logo=20, headline=15, body=12, cta=18 (CTA top untuk clickability)
 *   - Element bisa overlap (klien bertanggung jawab via preview)
 *
 * Filosofi:
 *   - Editorial-ADS Firewall LAYER STRICT (Filosofi #9)
 *   - BAKABAR=JANTUNG: animation gak distract reading
 *
 * Patterns: PPP (lazy load), QQQ (reduce-motion respect),
 *           AAX (frontend-only config for shadow/stroke/gradient — no DB needed)
 * ────────────────────────────────────────────────────────────────
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import type { gsap } from 'gsap';

import {
  loadGsap,
  shouldUseStaticFallback,
  type StaticFallbackReason,
} from '@/lib/ads/gsap-loader';
import { applyFadeIn, applyFadeStatic } from '@/components/public/ads/animations/fade';
import { applySlideIn, applySlideStatic } from '@/components/public/ads/animations/slide';
import { applyTextReveal, applyTextRevealStatic } from '@/components/public/ads/animations/text-reveal';
import { applyScaleIn, applyScaleStatic } from '@/components/public/ads/animations/scale';
import { applyPulse, applyPulseStatic } from '@/components/public/ads/animations/pulse';

// ════════════════════════════════════════════════════════════════
// TIER 2 — TYPE DEFINITIONS
// ════════════════════════════════════════════════════════════════

/**
 * Element position dalam banner canvas.
 * Phase 5B: 9 anchor preset (top_left ... bottom_right).
 * Phase 6C (22 Mei 2026): + AbsolutePosition { x, y } untuk drag-drop pixel
 *                          positioning. Stored as object di JSONB element_overrides.
 *
 * Backward compat: existing data ('top_left' string) tetap valid, type guard
 * isAbsolutePosition() discriminate.
 */
export type PresetPosition =
  | 'top_left'    | 'top_center'    | 'top_right'
  | 'middle_left' | 'middle_center' | 'middle_right'
  | 'bottom_left' | 'bottom_center' | 'bottom_right';

/**
 * Absolute pixel position dari top-left edge banner.
 * x, y integer. Bisa negatif (off-canvas creative effect — admin power user).
 * Soft clamp di render (translate stays, gak hard clip jadi text bisa "peek"
 * out dari edge kalau klien sengaja).
 *
 * `unit` future-proof — Phase 6C lock 'px'. Phase 7 mungkin tambah '%' atau 'rem'.
 */
export interface AbsolutePosition {
  x:     number;
  y:     number;
  unit?: 'px';
}

export type ElementPosition = PresetPosition | AbsolutePosition;

/**
 * Type guard untuk discriminate union ElementPosition.
 * Returns true kalau AbsolutePosition object, false kalau string preset.
 *
 * Safe untuk Phase 5B JSONB data: string 'top_left' → typeof 'string' → return false
 * → fallback ke switch preset (existing path).
 */
export function isAbsolutePosition(pos: ElementPosition): pos is AbsolutePosition {
  return (
    typeof pos === 'object' &&
    pos !== null &&
    typeof (pos as AbsolutePosition).x === 'number' &&
    typeof (pos as AbsolutePosition).y === 'number'
  );
}

/** Default coord saat user toggle preset→absolute first time (center-ish). */
export const DEFAULT_ABSOLUTE_POSITION: AbsolutePosition = {
  x:    100,
  y:    50,
  unit: 'px',
};

/** Animation pattern palette per element. */
export type ElementAnimation =
  | 'fade_in'
  | 'slide_in'
  | 'scale_in'
  | 'text_reveal'
  | 'pulse'
  | 'none';

/** Slide direction (kalau animation = slide_in). */
export type SlideFromDirection = 'left' | 'right' | 'top' | 'bottom';

/** Text color palette (restricted untuk klarity). */
export type TextColorKey = 'white' | 'black' | 'amber' | 'red' | 'blue' | 'green' | 'purple' | 'gray';

export const TEXT_COLOR_MAP: Record<TextColorKey, string> = {
  white:  '#FFFFFF',
  black:  '#111827',
  amber:  '#F59E0B',
  red:    '#DC2626',
  blue:   '#2563EB',
  green:  '#059669',
  purple: '#7C3AED',
  gray:   '#6B7280',
};

/**
 * Text size scale.
 * Phase 5B (21 Mei 2026): expanded sampai 3xl untuk Kumparan-style hero headlines.
 */
export type TextSize = 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

const TEXT_SIZE_MAP: Record<TextSize, string> = {
  sm:    '0.875rem',  // 14px — body small / footnote
  md:    '1.125rem',  // 18px — body normal
  lg:    '1.5rem',    // 24px — sub-headline
  xl:    '2.25rem',   // 36px — headline
  '2xl': '3rem',      // 48px — big headline
  '3xl': '4rem',      // 64px — HERO headline (Kumparan-style)
};

/**
 * Font family.
 * Phase 5B (21 Mei 2026): admin power user dapat pilih typography mood per element.
 * Phase 6B (22 Mei 2026): + custom font upload via template literal
 *                          'custom:${slug}'. Resolved via CustomFontMap prop.
 *
 *   - sans:    Modern, friendly (default — Inter)
 *   - serif:   Elegant, premium (Georgia/Playfair)
 *   - display: Cinematic, bold (Bebas Neue/Impact) — Kumparan-style headline
 *   - mono:    Techy, code-feel (JetBrains Mono)
 *   - custom:${slug}: user-uploaded font, lookup di CustomFontMap
 */
export type PresetFontFamily = 'sans' | 'serif' | 'display' | 'mono';
export type CustomFontKey    = `custom:${string}`;
export type FontFamily       = PresetFontFamily | CustomFontKey;

const FONT_FAMILY_MAP: Record<PresetFontFamily, string> = {
  sans:    'Inter, system-ui, -apple-system, sans-serif',
  serif:   '"Playfair Display", Georgia, "Times New Roman", serif',
  display: '"Bebas Neue", Impact, "Arial Black", sans-serif',
  mono:    '"JetBrains Mono", "Courier New", monospace',
};

// ════════════════════════════════════════════════════════════════
// SESI 6 Sub-Phase 6B — TD-ANIM-101: CUSTOM FONT INFRA
// ════════════════════════════════════════════════════════════════

/**
 * Per-font runtime metadata.
 *   - cssFamily: namespaced CSS family value (e.g. 'tlk-font-brand-helvetica')
 *                pakai prefix `tlk-font-` cegah collision dengan font lain
 *                di page yang sama.
 *   - url:       public URL ke font binary di Supabase Storage bucket ad-fonts
 */
export interface CustomFontEntry {
  cssFamily: string;
  url:       string;
}

/**
 * Slug → entry map. Disuplai oleh AnimationBuilder dari hasil GET
 * /admin/ads/fonts?advertiser_id=. Lookup O(1).
 */
export type CustomFontMap = Record<string, CustomFontEntry>;

/**
 * Convention untuk cssFamily naming.
 * Public helper supaya UI builder bisa generate konsisten dengan engine.
 */
export function makeCustomFontCssFamily(slug: string): string {
  return `tlk-font-${slug}`;
}

/**
 * Module-level cache. FontFace yang udah ke-add ke document.fonts gak perlu
 * di-add lagi (idempotent guard, hindari double registration).
 */
const _loadedFontFaces = new Set<string>();

/**
 * Lazy-load custom font via FontFace API.
 * Idempotent: kalau cssFamily udah pernah load, langsung return true.
 * SSR-safe: skip kalau window/document.fonts undefined.
 *
 * @returns true kalau berhasil load atau udah cached, false kalau gagal/SSR
 */
export async function loadCustomFont(
  cssFamily: string,
  url:       string
): Promise<boolean> {
  if (typeof window === 'undefined' || !('FontFace' in window) || !document.fonts) {
    return false;
  }
  if (_loadedFontFaces.has(cssFamily)) return true;

  try {
    const face = new FontFace(cssFamily, `url(${url})`);
    await face.load();
    document.fonts.add(face);
    _loadedFontFaces.add(cssFamily);
    return true;
  } catch (err) {
    console.warn('[AdAnimatedBanner] Failed to load custom font:', cssFamily, err);
    return false;
  }
}

/**
 * Resolve font_family key → actual CSS font-family value.
 * - Preset: lookup di FONT_FAMILY_MAP
 * - Custom: lookup di customFonts map, fallback ke 'sans' kalau gak ketemu
 *   (font belum upload, atau klien delete tapi banner masih reference)
 */
function buildFontFamilyValue(
  key:         FontFamily,
  customFonts: CustomFontMap | undefined,
): string {
  if (typeof key === 'string' && key.startsWith('custom:')) {
    const slug  = key.slice(7);
    const entry = customFonts?.[slug];
    if (entry) {
      // Wrap dengan sans fallback supaya kalau FontFace belum loaded,
      // text rendered pakai system font sambil tunggu (graceful).
      return `'${entry.cssFamily}', ${FONT_FAMILY_MAP.sans}`;
    }
    return FONT_FAMILY_MAP.sans;
  }
  return FONT_FAMILY_MAP[key as PresetFontFamily] ?? FONT_FAMILY_MAP.sans;
}

/**
 * Font weight.
 * Phase 5B (21 Mei 2026): weight selector untuk hierarchy emphasis.
 */
export type FontWeight = 'normal' | 'semibold' | 'bold' | 'black';

const FONT_WEIGHT_MAP: Record<FontWeight, number> = {
  normal:    400,
  semibold:  600,
  bold:      700,
  black:     900,
};

/** Text alignment. */
export type TextAlign = 'left' | 'center' | 'right';

/**
 * Background tint pada element container.
 * Phase 5B (21 Mei 2026): expanded dari fixed preset ke full color palette.
 * 'none' = transparent (no backdrop)
 * Lain-nya = rgba dengan opacity 0.7 (semi-transparent untuk readability)
 */
export type BackgroundTint = 'none' | TextColorKey;

const TINT_MAP: Record<BackgroundTint, string> = {
  none:   'transparent',
  white:  'rgba(255, 255, 255, 0.80)',
  black:  'rgba(17, 24, 39, 0.70)',
  amber:  'rgba(245, 158, 11, 0.80)',
  red:    'rgba(220, 38, 38, 0.75)',
  blue:   'rgba(37, 99, 235, 0.75)',
  green:  'rgba(5, 150, 105, 0.75)',
  purple: 'rgba(124, 58, 237, 0.75)',
  gray:   'rgba(107, 114, 128, 0.75)',
};

// ════════════════════════════════════════════════════════════════
// SESI 6 Phase 6A — TD-ANIM-104: TEXT EFFECTS (shadow / stroke / gradient)
// ════════════════════════════════════════════════════════════════

/**
 * Text shadow level — depth & cinematic glow.
 * 'soft':   subtle separation di bg gelap
 * 'medium': clear separation, default cinematic
 * 'strong': dramatic glow, bg sangat busy
 */
export type TextShadow = 'none' | 'soft' | 'medium' | 'strong';

const TEXT_SHADOW_MAP: Record<TextShadow, string | undefined> = {
  none:   undefined,
  soft:   '0 1px 2px rgba(0, 0, 0, 0.35)',
  medium: '0 2px 4px rgba(0, 0, 0, 0.55)',
  strong: '0 4px 12px rgba(0, 0, 0, 0.7), 0 0 2px rgba(0, 0, 0, 0.5)',
};

/**
 * Text stroke (outline) — kontras kuat di bg busy / photo.
 * Stroke color fixed BLACK untuk Phase 6A (simplicity).
 * Future: user-configurable stroke color (Phase 7).
 */
export type TextStroke = 'none' | 'thin' | 'medium' | 'thick';

const TEXT_STROKE_MAP: Record<TextStroke, { width: string; color: string } | undefined> = {
  none:   undefined,
  thin:   { width: '1px', color: '#000000' },
  medium: { width: '2px', color: '#000000' },
  thick:  { width: '3px', color: '#000000' },
};

/**
 * Gradient direction — CSS linear-gradient angle.
 */
export type GradientDirection =
  | 'to_right'
  | 'to_bottom'
  | 'to_bottom_right'
  | 'to_top_right'
  | 'diagonal';

const GRADIENT_DIRECTION_MAP: Record<GradientDirection, string> = {
  to_right:        'to right',
  to_bottom:       'to bottom',
  to_bottom_right: 'to bottom right',
  to_top_right:    'to top right',
  diagonal:        '135deg',
};

/**
 * Text gradient config (background-clip:text trick).
 * Saat enabled:
 *   - backgroundImage = linear-gradient(dir, from, to)
 *   - backgroundClip = 'text'
 *   - color = 'transparent'  (text di-clip dari bg image)
 *   - backgroundColor (tint) SURVIVE (kalau tint != 'none' tetap render behind)
 */
export interface TextGradientConfig {
  enabled:    boolean;
  from_color: TextColorKey;
  to_color:   TextColorKey;
  direction:  GradientDirection;
}

/** Default gradient — disabled, white→amber to_right (soft sunset feel). */
export const DEFAULT_TEXT_GRADIENT: TextGradientConfig = {
  enabled:    false,
  from_color: 'white',
  to_color:   'amber',
  direction:  'to_right',
};

/** Per-element override config. */
export interface ElementOverride {
  visible:         boolean;
  animation:       ElementAnimation;
  slide_from?:     SlideFromDirection;
  delay_ms:        number;
  duration_ms:     number;
  position:        ElementPosition;
  text_color:      TextColorKey;
  text_size:       TextSize;
  text_align:      TextAlign;
  background_tint: BackgroundTint;

  /**
   * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026):
   * Typography customization untuk Kumparan-like hierarchy.
   * Optional dengan fallback default (sans + bold).
   */
  font_family?:    FontFamily;
  font_weight?:    FontWeight;

  /**
   * SESI 6 Phase 6A — TD-ANIM-104 (22 Mei 2026):
   * Text effects untuk depth + kontras + premium feel.
   * Semua OPTIONAL — undefined = no effect (backward compat Phase 5B).
   */
  text_shadow?:    TextShadow;
  text_stroke?:    TextStroke;
  text_gradient?:  TextGradientConfig;
}

/** Element key types. */
export type ElementKey = 'logo' | 'headline' | 'body' | 'cta';

/** Default override per element. */
export const DEFAULT_ELEMENT_OVERRIDES: Record<ElementKey, ElementOverride> = {
  logo: {
    visible:         true,
    animation:       'fade_in',
    delay_ms:        0,
    duration_ms:     500,
    position:        'top_left',
    text_color:      'white',
    text_size:       'md',
    text_align:      'left',
    background_tint: 'none',
  },
  headline: {
    visible:         true,
    animation:       'fade_in',
    delay_ms:        300,
    duration_ms:     600,
    position:        'middle_left',
    text_color:      'white',
    text_size:       'lg',
    text_align:      'left',
    background_tint: 'none',
  },
  body: {
    visible:         true,
    animation:       'fade_in',
    delay_ms:        600,
    duration_ms:     500,
    position:        'middle_left',
    text_color:      'white',
    text_size:       'sm',
    text_align:      'left',
    background_tint: 'none',
  },
  cta: {
    visible:         true,
    animation:       'fade_in',
    delay_ms:        900,
    duration_ms:     500,
    position:        'bottom_left',
    text_color:      'white',
    text_size:       'sm',
    text_align:      'center',
    background_tint: 'amber',
  },
};

// ════════════════════════════════════════════════════════════════
// DATA SHAPE — Phase 5B DCA-Aligned + Tier 2 element_overrides
// ════════════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════════════
// SESI 6 Sub-Phase 6D Batch 6D.2 — TD-ANIM-102: SVG ILLUSTRATION LAYER
// ════════════════════════════════════════════════════════════════

/**
 * Animation mode untuk SVG layer.
 * Phase 6D.2 MVP: 3 mode only.
 * Phase 7+: `draw_on` (path stroke-dasharray reveal), `slide_in`, etc.
 */
export type SVGLayerAnimation = 'none' | 'fade_in' | 'scale_in';

/**
 * Per-layer SVG illustration data.
 * Stored di variant.svg_layers JSONB array. Markup SANITIZED at SAVE time
 * (admin builder via svg-parser.ts), public render trusts stored markup.
 *
 *   - id:          stable unique key untuk React + GSAP selector
 *   - name:        admin-set label (e.g. "Burst icon", "Logo accent")
 *   - svg_markup:  full <svg>...</svg> markup string (sanitized)
 *   - position:    AbsolutePosition (px, top-left of layer container)
 *   - width/height: numeric px (admin set, defaults from SVG viewBox)
 *   - animation:   entry animation mode
 *   - delay_ms:    delay before animation starts
 *   - duration_ms: animation duration
 *   - z_index:     stacking order (1-30 typical, default 5)
 *   - visible:     toggle render (default true)
 */
export interface SVGLayer {
  id:          string;
  name:        string;
  svg_markup:  string;
  position:    AbsolutePosition;
  width:       number;
  height:      number;
  animation:   SVGLayerAnimation;
  delay_ms:    number;
  duration_ms: number;
  z_index?:    number;
  visible?:    boolean;
}

// ════════════════════════════════════════════════════════════════
// SESI 6 Sub-Phase 6F (22 Mei 2026) — OBJECT LAYER (.gif/.png/.webp)
// ════════════════════════════════════════════════════════════════

/**
 * Animation mode untuk Object layer.
 * Mirror SVGLayerAnimation (consistency cross-layer).
 */
export type ObjectLayerAnimation = 'none' | 'fade_in' | 'scale_in';

/**
 * Object illustration layer (raster image — .gif animated, .png/.webp static).
 * Distinct from SVGLayer (vector) — punya image_url instead of svg_markup.
 *
 *   - id:          stable unique key untuk React + GSAP selector
 *   - name:        admin-set label (e.g. "Mascot", "Badge promo", "Logo accent")
 *   - image_url:   public URL ke file di Storage bucket ad-objects
 *   - position:    AbsolutePosition (px, top-left of layer container)
 *   - width/height: numeric px (admin set)
 *   - animation:   entry animation mode (none/fade_in/scale_in)
 *   - delay_ms:    delay before animation starts
 *   - duration_ms: animation duration
 *   - z_index:     stacking order (1-30 typical, default 5)
 *   - visible:     toggle render (default true)
 */
export interface ObjectLayer {
  id:          string;
  name:        string;
  image_url:   string;
  position:    AbsolutePosition;
  width:       number;
  height:      number;
  animation:   ObjectLayerAnimation;
  delay_ms:    number;
  duration_ms: number;
  z_index?:    number;
  visible?:    boolean;
}

export interface AnimationVariant {
  order:       number;
  image_url:   string;
  headline:    string;
  body?:       string | null;
  cta_text?:   string | null;
  duration_ms: number;
  /** Tier 2: per-element override (null/undefined = use defaults). */
  element_overrides?: Partial<Record<ElementKey, ElementOverride>>;
  /** SESI 6 Sub-Phase 6D Batch 6D.2 — TD-ANIM-102: SVG illustration layers (optional). */
  svg_layers?: SVGLayer[];
  /** SESI 6 Sub-Phase 6F — Object (raster) illustration layers (optional). */
  object_layers?: ObjectLayer[];
}

export type TransitionPattern = 'fade' | 'slide_left' | 'slide_up' | 'none';
export type TextRevealPattern = 'fade_in' | 'slide_in' | 'text_reveal' | 'none';

/**
 * SESI 6 Phase 6A — TD-ANIM-105 (22 Mei 2026):
 * Hover-triggered animation behavior (TIMELINE-level, bukan element-level).
 *
 *   - 'none':     no hover effect (default, backward compat Phase 5B)
 *   - 'pause':    pause GSAP timeline on mouseenter, resume on mouseleave
 *                 → use case: user hover untuk baca teks, carousel berhenti
 *   - 'replay':   restart timeline on mouseenter (no leave action)
 *                 → use case: re-engage saat user hover ulang
 *   - 'speed_up': timeScale(2) on mouseenter, timeScale(1) on mouseleave
 *                 → use case: cinematic preview cepat
 *
 * 'reveal_extra' DROPPED dari Phase 6A — defer Phase 6B (butuh per-variant
 * hover_reveal_element_key + visibility orchestration, scope 4-6 jam).
 *
 * Mobile guard: matchMedia('(hover: hover) and (pointer: fine)').
 *   - touch device: handler binding SKIPPED total, mode jadi no-op
 *   - desktop/laptop: handler aktif sesuai mode
 */
export type HoverBehavior = 'none' | 'pause' | 'replay' | 'speed_up';

export interface AnimationTimelineConfig {
  variants:                AnimationVariant[];
  transition_pattern:      TransitionPattern;
  transition_ms:           number;
  text_reveal_enabled:     boolean;
  text_reveal_pattern:     TextRevealPattern;
  text_reveal_stagger_ms:  number;
  loop:                    boolean;

  /**
   * SESI 5H Phase 5B Banner Studio V1 (21 Mei 2026):
   * Shared background URL untuk pattern Kumparan-style (1 image + multi text).
   * Fallback chain di variant level:
   *   variant.image_url || timeline.shared_background_url || ad.image_url || ''
   *
   * Use case:
   *   - Tech event banner: same venue/logo bg, text rotation per scene
   *   - Brand campaign: consistent visual identity across variants
   *   - Multi-text storytelling: hook → value → CTA dengan bg sama
   *
   * Null/undefined = no shared bg, klien upload per variant.
   */
  shared_background_url?:  string | null;

  /**
   * SESI 6 Phase 6A — TD-ANIM-105 (22 Mei 2026):
   * Hover-triggered animation behavior.
   * Optional — undefined ≡ 'none' (Phase 5B backward compat).
   */
  hover_behavior?:         HoverBehavior;
}

// ════════════════════════════════════════════════════════════════
// AD DATA SHAPE
// ════════════════════════════════════════════════════════════════

export interface AnimatedBannerAd {
  id: string;
  slug?: string | null;
  title: string;
  body?: string | null;
  image_url?: string | null;
  link_url: string;
  advertiser_name: string;
  advertiser_logo_url?: string | null;
  disclaimer_text?: string | null;
  animation_timeline: AnimationTimelineConfig;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ════════════════════════════════════════════════════════════════

export interface AdAnimatedBannerProps {
  ad: AnimatedBannerAd;
  className?: string;
  onClick?: (adId: string) => void;
  width?: number;
  height?: number;

  /**
   * SESI 6 Sub-Phase 6B — TD-ANIM-101 (22 Mei 2026):
   * Optional custom fonts lookup map (slug → CustomFontEntry).
   * Disuplai dari Banner Studio admin builder pakai data hasil GET
   * /admin/ads/fonts. Public-facing render TIDAK perlu kasih prop ini —
   * banner yang reference custom font tapi map kosong akan gracefully
   * fallback ke 'sans'.
   */
  customFonts?: CustomFontMap;
}

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const DEFAULT_WIDTH      = 300;
const DEFAULT_HEIGHT     = 250;
const REPLAY_THRESHOLD   = 0.5;
const REPLAY_ROOT_MARGIN = '0px 0px -50px 0px';
const DEFAULT_CTA_TEXT   = 'Pelajari Lebih Lanjut';

// Z-index per element (CTA topmost untuk click priority)
const Z_INDEX_MAP: Record<ElementKey, number> = {
  logo:     16,
  headline: 13,
  body:     11,
  cta:      18,
};

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

interface ResolvedVariantContent {
  image_url: string;
  headline:  string;
  body:      string | null;
  cta_text:  string;
}

function resolveVariantContent(variant: AnimationVariant, ad: AnimatedBannerAd): ResolvedVariantContent {
  // SESI 5H Phase 5B Banner Studio V1: Fallback chain dengan shared_background_url
  const sharedBg = ad.animation_timeline?.shared_background_url ?? null;
  return {
    image_url: variant.image_url || sharedBg || ad.image_url || '',
    headline:  variant.headline  || ad.title     || '',
    body:      variant.body      ?? ad.body      ?? null,
    cta_text:  variant.cta_text  || DEFAULT_CTA_TEXT,
  };
}

/**
 * Resolve element override: merge default dengan variant override.
 */
function resolveElementOverride(
  key:     ElementKey,
  variant: AnimationVariant,
): ElementOverride {
  const customOverride = variant.element_overrides?.[key];
  const defaultOverride = DEFAULT_ELEMENT_OVERRIDES[key];
  if (!customOverride) return defaultOverride;
  return { ...defaultOverride, ...customOverride };
}

/**
 * Compute position style berdasarkan ElementPosition.
 * Phase 6C (TD-103): handle dual mode — preset (string) OR absolute ({x,y}).
 * Type guard isAbsolutePosition() discriminate.
 *
 * Absolute mode:
 *   - Pakai inline left/top px, no transform (translate)
 *   - Soft bounds: render apply value as-is, bisa negatif (off-canvas creative)
 *
 * Preset mode (Phase 5B path, unchanged):
 *   - 9 anchor preset dengan padding 12px dari edge
 *   - Center anchors pakai transform translate untuk center alignment
 */
function getPositionStyle(position: ElementPosition): React.CSSProperties {
  // ─── Phase 6C TD-103: absolute mode ───
  if (isAbsolutePosition(position)) {
    return {
      left: `${position.x}px`,
      top:  `${position.y}px`,
      // No transform — koordinat udah final, gak perlu center adjust
    };
  }

  // ─── Phase 5B path: preset 9-anchor (unchanged) ───
  const PADDING = 12; // px dari edge

  switch (position) {
    case 'top_left':
      return { top: PADDING, left: PADDING };
    case 'top_center':
      return { top: PADDING, left: '50%', transform: 'translateX(-50%)' };
    case 'top_right':
      return { top: PADDING, right: PADDING };
    case 'middle_left':
      return { top: '50%', left: PADDING, transform: 'translateY(-50%)' };
    case 'middle_center':
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' };
    case 'middle_right':
      return { top: '50%', right: PADDING, transform: 'translateY(-50%)' };
    case 'bottom_left':
      return { bottom: PADDING, left: PADDING };
    case 'bottom_center':
      return { bottom: PADDING, left: '50%', transform: 'translateX(-50%)' };
    case 'bottom_right':
      return { bottom: PADDING, right: PADDING };
    default:
      return { top: PADDING, left: PADDING };
  }
}

/**
 * SESI 6 Phase 6A — TD-ANIM-104:
 * Build text effect CSS partial (shadow + stroke + gradient).
 *
 * Trade-off rules (LOCKED 22 Mei 2026):
 *   - gradient.enabled = true:
 *     → backgroundImage = linear-gradient (di-clip ke text shape)
 *     → color = 'transparent' (text bleed through gradient)
 *     → backgroundColor (tint) SURVIVE — bisa coexist sebagai backdrop
 *     → text_stroke STILL APPLIES (outline tetap visible meski text transparent)
 *   - stroke + gradient: visual interesting (stroke garis + gradient fill)
 *   - shadow di gradient text: shadow rendered di outer text shape, still works
 *
 * Returns partial CSSProperties — caller merge into buildElementStyle output.
 */
function buildTextEffectStyle(override: ElementOverride): React.CSSProperties {
  const effects: React.CSSProperties = {};

  // ─── Text Shadow ───
  if (override.text_shadow && override.text_shadow !== 'none') {
    const shadowCss = TEXT_SHADOW_MAP[override.text_shadow];
    if (shadowCss) effects.textShadow = shadowCss;
  }

  // ─── Text Stroke (via -webkit-text-stroke) ───
  if (override.text_stroke && override.text_stroke !== 'none') {
    const stroke = TEXT_STROKE_MAP[override.text_stroke];
    if (stroke) {
      effects.WebkitTextStroke = `${stroke.width} ${stroke.color}`;
      // paint-order: ensure stroke di luar fill (Safari quirk)
      effects.paintOrder = 'stroke fill';
    }
  }

  // ─── Text Gradient (via background-clip:text trick) ───
  const gradient = override.text_gradient;
  if (gradient && gradient.enabled) {
    const dirCss   = GRADIENT_DIRECTION_MAP[gradient.direction];
    const fromHex  = TEXT_COLOR_MAP[gradient.from_color];
    const toHex    = TEXT_COLOR_MAP[gradient.to_color];

    // backgroundImage (bukan background shorthand) → backgroundColor tint survive
    effects.backgroundImage     = `linear-gradient(${dirCss}, ${fromHex}, ${toHex})`;
    effects.backgroundClip      = 'text';
    effects.WebkitBackgroundClip = 'text';
    effects.color               = 'transparent';
    effects.WebkitTextFillColor = 'transparent';
  }

  return effects;
}

/**
 * Build CSS style untuk element berdasarkan override.
 * Phase 5B (21 Mei 2026): font_family + font_weight + improved line-height
 * untuk Kumparan-style hierarchy.
 * Phase 6A (22 Mei 2026): TD-ANIM-104 — merge text effects (shadow/stroke/gradient).
 * Phase 6B (22 Mei 2026): TD-ANIM-101 — customFonts param untuk custom:${slug} resolve.
 */
function buildElementStyle(
  override:     ElementOverride,
  customFonts?: CustomFontMap,
): React.CSSProperties {
  const fontKey    = override.font_family ?? 'sans';
  const fontFamily = buildFontFamilyValue(fontKey, customFonts);
  const fontWeight = override.font_weight
    ? FONT_WEIGHT_MAP[override.font_weight]
    : FONT_WEIGHT_MAP.bold;

  // Phase 6A: text effects partial (shadow + stroke + gradient)
  const effects = buildTextEffectStyle(override);

  return {
    position:         'absolute',
    ...getPositionStyle(override.position),
    color:            TEXT_COLOR_MAP[override.text_color],
    fontSize:         TEXT_SIZE_MAP[override.text_size],
    fontFamily,
    fontWeight,
    textAlign:        override.text_align,
    lineHeight:       1.15,
    // letterSpacing tetap based on preset 'display'. Custom font dianggap
    // generic, pakai default letter-spacing (klien adjust kalau perlu).
    letterSpacing:    fontKey === 'display' ? '0.02em' : '-0.01em',
    backgroundColor:  TINT_MAP[override.background_tint],
    padding:          override.background_tint !== 'none' ? '6px 12px' : undefined,
    borderRadius:     override.background_tint !== 'none' ? '6px' : undefined,
    maxWidth:         '80%',
    wordBreak:        'break-word',
    // Phase 6A: text effects MERGE LAST → bisa override color (gradient mode)
    ...effects,
  };
}

// ════════════════════════════════════════════════════════════════
// ANIMATION ENGINE — Per-element dispatcher
// ════════════════════════════════════════════════════════════════

interface ApplyElementAnimParams {
  tl:           gsap.core.Timeline;
  containerEl:  HTMLElement;
  elementKey:   ElementKey;
  override:     ElementOverride;
  globalStagger?: number; // From timeline.text_reveal_stagger_ms (kalau apply global)
}

/**
 * Apply per-element animation berdasarkan override.
 */
function applyElementAnimation({
  tl,
  containerEl,
  elementKey,
  override,
}: ApplyElementAnimParams): void {
  if (!override.visible || override.animation === 'none') return;

  const selector = `.${elementKey}`;
  const targetEl = containerEl.querySelector<HTMLElement>(selector);
  if (!targetEl) return;

  const baseConfig = {
    delay:    override.delay_ms,
    duration: override.duration_ms,
  };

  switch (override.animation) {
    case 'fade_in':
      applyFadeIn(tl, targetEl, baseConfig);
      break;
    case 'slide_in':
      applySlideIn(tl, targetEl, {
        ...baseConfig,
        from:     override.slide_from ?? 'left',
        distance: 30,
      });
      break;
    case 'scale_in':
      applyScaleIn(tl, targetEl, baseConfig);
      break;
    case 'text_reveal':
      applyTextReveal(tl, targetEl, {
        ...baseConfig,
        unit:    'char',
        stagger: 20,
      });
      break;
    case 'pulse':
      // First fade in, then pulse loop after entrance
      applyFadeIn(tl, targetEl, baseConfig);
      applyPulse(tl, targetEl, {
        delay:    override.delay_ms + override.duration_ms,
        duration: 1000,
        max_scale: 1.05,
      });
      break;
  }
}

/**
 * Pre-set initial state untuk all elements yang akan animate (opacity 0).
 */
function preSetElementsInitial(
  gsapInstance: typeof import('gsap'),
  containerEl:  HTMLElement,
  variant:      AnimationVariant,
): void {
  const elementKeys: ElementKey[] = ['logo', 'headline', 'body', 'cta'];
  for (const key of elementKeys) {
    const override = resolveElementOverride(key, variant);
    if (!override.visible || override.animation === 'none') continue;

    const el = containerEl.querySelector<HTMLElement>(`.${key}`);
    if (!el) continue;

    switch (override.animation) {
      case 'fade_in':
      case 'slide_in':
      case 'text_reveal':
      case 'pulse':
        gsapInstance.gsap.set(el, { opacity: 0 });
        break;
      case 'scale_in':
        gsapInstance.gsap.set(el, { opacity: 0, scale: 0.8 });
        break;
    }
  }
}

/**
 * Apply static fallback (reduce-motion) untuk all elements.
 */
function applyStaticFallback(containerEl: HTMLElement, variant: AnimationVariant): void {
  const elementKeys: ElementKey[] = ['logo', 'headline', 'body', 'cta'];
  for (const key of elementKeys) {
    const override = resolveElementOverride(key, variant);
    if (!override.visible) {
      const el = containerEl.querySelector<HTMLElement>(`.${key}`);
      if (el) el.style.display = 'none';
      continue;
    }
    if (override.animation === 'none') continue;

    const el = containerEl.querySelector<HTMLElement>(`.${key}`);
    if (!el) continue;

    switch (override.animation) {
      case 'fade_in':
      case 'pulse':
        applyFadeStatic(el);
        break;
      case 'slide_in':
        applySlideStatic(el);
        break;
      case 'scale_in':
        applyScaleStatic(el);
        break;
      case 'text_reveal':
        applyTextRevealStatic(el);
        break;
    }
  }
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

type Phase = 'idle' | 'loading' | 'ready' | 'playing' | 'paused' | 'static' | 'error';

export default function AdAnimatedBanner({
  ad,
  className,
  onClick,
  width  = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
  customFonts,
}: AdAnimatedBannerProps) {
  const containerRef     = useRef<HTMLDivElement | null>(null);
  const timelineRef      = useRef<gsap.core.Timeline | null>(null);
  const contextRef       = useRef<gsap.Context | null>(null);
  const hasPlayedOnceRef = useRef(false);

  const [phase, setPhase]                       = useState<Phase>('idle');
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);
  const [staticReason, setStaticReason]         = useState<StaticFallbackReason>(null);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

  // SESI 6 Phase 6A — TD-ANIM-105: hover capability detection
  // Touch devices: matchMedia returns false → handler binding SKIPPED total
  const [hoverCapable, setHoverCapable] = useState(false);

  // SESI 6 Sub-Phase 6B — TD-ANIM-101: lazy-load custom fonts.
  // Trigger setiap customFonts berubah. loadCustomFont() idempotent.
  useEffect(() => {
    if (!customFonts) return;
    const entries = Object.values(customFonts);
    if (entries.length === 0) return;
    // Fire-and-forget per entry. _loadedFontFaces Set cegah duplicate.
    entries.forEach((entry) => {
      void loadCustomFont(entry.cssFamily, entry.url);
    });
  }, [customFonts]);

  const variants = ad.animation_timeline.variants;
  const safeIdx  = Math.min(activeVariantIdx, variants.length - 1);
  const activeVariant = variants[safeIdx] ?? null;
  const resolved = activeVariant ? resolveVariantContent(activeVariant, ad) : null;

  // Resolve element overrides untuk variant aktif
  const elementOverrides: Record<ElementKey, ElementOverride> | null = activeVariant
    ? {
        logo:     resolveElementOverride('logo',     activeVariant),
        headline: resolveElementOverride('headline', activeVariant),
        body:     resolveElementOverride('body',     activeVariant),
        cta:      resolveElementOverride('cta',      activeVariant),
      }
    : null;

  const handleClick = useCallback(() => {
    if (onClick) onClick(ad.id);
  }, [onClick, ad.id]);

  // ════════════════════════════════════════════════════════════════
  // SESI 6 Phase 6A — TD-ANIM-105: Hover capability detection
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)');
    setHoverCapable(mq.matches);
    const listener = (e: MediaQueryListEvent) => setHoverCapable(e.matches);
    mq.addEventListener('change', listener);
    return () => mq.removeEventListener('change', listener);
  }, []);

  // ════════════════════════════════════════════════════════════════
  // SESI 6 Phase 6A — TD-ANIM-105: Hover behavior handlers
  // Guarded oleh hoverCapable + hover_behavior !== 'none'
  // ════════════════════════════════════════════════════════════════
  const hoverBehavior: HoverBehavior = ad.animation_timeline.hover_behavior ?? 'none';
  const hoverActive = hoverCapable && hoverBehavior !== 'none' && phase === 'playing';

  const handleMouseEnter = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl || !hoverActive) return;
    switch (hoverBehavior) {
      case 'pause':
        tl.pause();
        break;
      case 'replay':
        tl.restart();
        break;
      case 'speed_up':
        tl.timeScale(2);
        break;
    }
  }, [hoverBehavior, hoverActive]);

  const handleMouseLeave = useCallback(() => {
    const tl = timelineRef.current;
    if (!tl || !hoverActive) return;
    switch (hoverBehavior) {
      case 'pause':
        tl.play();
        break;
      case 'speed_up':
        tl.timeScale(1);
        break;
      // 'replay' no leave action — biarkan timeline play normal
    }
  }, [hoverBehavior, hoverActive]);

  // ════════════════════════════════════════════════════════════════
  // EFFECT 1 — Build animation untuk variant aktif
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    let cancelled = false;
    setPhase('loading');
    setErrorMsg(null);
    setStaticReason(null);
    hasPlayedOnceRef.current = false;

    async function initAnimation() {
      try {
        const config = ad.animation_timeline;
        if (!config || !Array.isArray(config.variants) || config.variants.length === 0) {
          throw new Error('animation_timeline.variants empty or invalid');
        }

        const fallbackCheck = shouldUseStaticFallback();
        if (fallbackCheck.useStatic) {
          const containerEl = containerRef.current;
          if (!containerEl || !activeVariant) {
            throw new Error('Container ref not attached');
          }
          applyStaticFallback(containerEl, activeVariant);
          if (!cancelled) {
            setStaticReason(fallbackCheck.reason);
            setPhase('static');
          }
          return;
        }

        const gsapMod = await loadGsap();
        if (cancelled) return;

        const containerEl = containerRef.current;
        if (!containerEl || !activeVariant) {
          throw new Error('Container ref not attached');
        }

        const ctx = gsapMod.gsap.context(() => {
          preSetElementsInitial(gsapMod, containerEl, activeVariant);

          const tl = gsapMod.gsap.timeline({ paused: true, repeat: 0 });

          // Apply animation per element berdasarkan override
          const elementKeys: ElementKey[] = ['logo', 'headline', 'body', 'cta'];
          for (const key of elementKeys) {
            const override = resolveElementOverride(key, activeVariant);
            applyElementAnimation({
              tl,
              containerEl,
              elementKey: key,
              override,
            });
          }

          // ════════════════════════════════════════════════════════
          // SESI 6 Sub-Phase 6D Batch 6D.2 — TD-ANIM-102:
          // SVG layer entry animations (variant-level)
          // ════════════════════════════════════════════════════════
          const svgLayers = activeVariant.svg_layers ?? [];
          for (const layer of svgLayers) {
            if (layer.visible === false || layer.animation === 'none') continue;
            const selector    = `.tlk-svg-layer-${layer.id}`;
            const delaySec    = (layer.delay_ms ?? 0)    / 1000;
            const durationSec = (layer.duration_ms ?? 800) / 1000;

            if (layer.animation === 'fade_in') {
              tl.fromTo(
                selector,
                { opacity: 0 },
                { opacity: 1, duration: durationSec, ease: 'power2.out' },
                delaySec
              );
            } else if (layer.animation === 'scale_in') {
              tl.fromTo(
                selector,
                { opacity: 0, scale: 0.4, transformOrigin: 'center center' },
                { opacity: 1, scale: 1, duration: durationSec, ease: 'back.out(1.4)' },
                delaySec
              );
            }
          }

          // ════════════════════════════════════════════════════════
          // SESI 6 Sub-Phase 6F:
          // Object layer entry animations (raster .gif/.png/.webp)
          // Mirror SVG layer pattern. Selector .tlk-object-layer-{id}.
          // ════════════════════════════════════════════════════════
          const objectLayers = activeVariant.object_layers ?? [];
          for (const layer of objectLayers) {
            if (layer.visible === false || layer.animation === 'none') continue;
            const selector    = `.tlk-object-layer-${layer.id}`;
            const delaySec    = (layer.delay_ms ?? 0)    / 1000;
            const durationSec = (layer.duration_ms ?? 800) / 1000;

            if (layer.animation === 'fade_in') {
              tl.fromTo(
                selector,
                { opacity: 0 },
                { opacity: 1, duration: durationSec, ease: 'power2.out' },
                delaySec
              );
            } else if (layer.animation === 'scale_in') {
              tl.fromTo(
                selector,
                { opacity: 0, scale: 0.4, transformOrigin: 'center center' },
                { opacity: 1, scale: 1, duration: durationSec, ease: 'back.out(1.4)' },
                delaySec
              );
            }
          }

          timelineRef.current = tl;
        }, containerEl);

        if (cancelled) {
          ctx.revert();
          return;
        }

        contextRef.current = ctx;
        setPhase('ready');

      } catch (err: any) {
        if (cancelled) return;
        console.error('[AdAnimatedBanner] initAnimation failed:', err);
        setErrorMsg(err?.message ?? 'Animation init failed');

        const containerEl = containerRef.current;
        if (containerEl && activeVariant) {
          try {
            applyStaticFallback(containerEl, activeVariant);
          } catch (fbErr) {
            console.warn('[AdAnimatedBanner] static fallback failed:', fbErr);
          }
        }
        setPhase('error');
      }
    }

    initAnimation();

    return () => {
      cancelled = true;
      if (timelineRef.current) {
        try { timelineRef.current.kill(); } catch {}
        timelineRef.current = null;
      }
      if (contextRef.current) {
        try { contextRef.current.revert(); } catch {}
        contextRef.current = null;
      }
    };
  }, [ad.id, activeVariantIdx, ad.animation_timeline, activeVariant]);

  // ════════════════════════════════════════════════════════════════
  // EFFECT 2 — IntersectionObserver play/restart
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (phase !== 'ready' && phase !== 'playing' && phase !== 'paused') return;

    const containerEl = containerRef.current;
    const tl          = timelineRef.current;
    if (!containerEl || !tl) return;

    if (typeof IntersectionObserver === 'undefined') {
      if (!hasPlayedOnceRef.current) {
        tl.play(0);
        hasPlayedOnceRef.current = true;
        setPhase('playing');
      }
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (!hasPlayedOnceRef.current) {
              tl.play(0);
              hasPlayedOnceRef.current = true;
              setPhase('playing');
            } else {
              tl.restart();
              setPhase('playing');
            }
          } else {
            if (hasPlayedOnceRef.current) {
              tl.pause();
              setPhase('paused');
            }
          }
        }
      },
      { threshold: REPLAY_THRESHOLD, rootMargin: REPLAY_ROOT_MARGIN },
    );

    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [phase]);

  // ════════════════════════════════════════════════════════════════
  // EFFECT 3 — Variant auto-cycle
  // ════════════════════════════════════════════════════════════════
  useEffect(() => {
    if (phase !== 'playing' && phase !== 'static') return;
    if (variants.length < 2) return;
    if (!activeVariant) return;

    const duration = activeVariant.duration_ms || 4000;
    const timer = setTimeout(() => {
      const nextIdx = (safeIdx + 1) % variants.length;
      const config  = ad.animation_timeline;
      if (!config.loop && nextIdx === 0) return;
      setActiveVariantIdx(nextIdx);
    }, duration);

    return () => clearTimeout(timer);
  }, [phase, safeIdx, activeVariant, variants.length, ad.animation_timeline]);

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  const isLoading      = phase === 'idle' || phase === 'loading';
  const hasError       = phase === 'error';
  const isStaticActive = phase === 'static';

  if (!resolved || !elementOverrides) {
    return (
      <div className={`teraloka-animated-banner ${className ?? ''}`} style={{ width, height }}>
        <div className="flex h-full items-center justify-center bg-amber-50 text-[10px] text-amber-700">
          Animation config invalid
        </div>
      </div>
    );
  }

  return (
    <div className={`teraloka-animated-banner ${className ?? ''}`}>
      <div
        ref={containerRef}
        onClick={handleClick}
        onMouseEnter={hoverActive ? handleMouseEnter : undefined}
        onMouseLeave={hoverActive ? handleMouseLeave : undefined}
        className="
          relative cursor-pointer overflow-hidden
          rounded-lg border-2 border-amber-200
          bg-amber-50/30
          transition-all duration-200
          hover:border-amber-300 hover:shadow-md
        "
        style={{ width, height }}
        data-ad-id={ad.id}
        data-ad-format="animated"
        data-phase={phase}
        data-variant-idx={safeIdx}
        data-static-reason={staticReason ?? undefined}
        data-hover-behavior={hoverActive ? hoverBehavior : undefined}
        role="link"
        aria-label={`Iklan: ${resolved.headline} oleh ${ad.advertiser_name}`}
      >
        {/* IKLAN Badge (Firewall Layer 1) */}
        <div
          className="
            absolute top-2 left-2 z-30
            rounded-md bg-amber-500 px-2 py-0.5
            text-[10px] font-bold uppercase tracking-wider text-white
            shadow-sm
          "
          style={{ pointerEvents: 'none' }}
        >
          IKLAN
        </div>

        {/* Variant indicator dots */}
        {variants.length > 1 && (
          <div className="absolute top-2 right-2 z-30 flex gap-1" style={{ pointerEvents: 'none' }}>
            {variants.map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 w-1.5 rounded-full transition-all ${
                  idx === safeIdx ? 'bg-white scale-125' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-amber-50/80">
            <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
          </div>
        )}

        {hasError && (
          <div
            className="absolute top-2 right-2 z-25 rounded-sm bg-red-100 px-1.5 py-0.5 text-[9px] text-red-700"
            title={errorMsg ?? undefined}
          >
            ⚠️ static
          </div>
        )}

        {/* Background image */}
        {resolved.image_url && (
          <img
            key={`bg-${safeIdx}`}
            src={resolved.image_url}
            alt=""
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-500"
            aria-hidden="true"
          />
        )}

        {/* Click overlay full-area Link */}
        <Link
          href={ad.link_url}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="absolute inset-0 z-10"
          aria-label="Klik iklan"
          onClick={(e) => e.stopPropagation()}
        />

        {/* ═══ ELEMENTS (positioned absolute per override) ═══ */}

        {/* Logo */}
        {elementOverrides.logo.visible && ad.advertiser_logo_url && (
          <div
            className="logo"
            style={{
              ...buildElementStyle(elementOverrides.logo, customFonts),
              zIndex: Z_INDEX_MAP.logo,
              pointerEvents: 'none',
            }}
          >
            <img
              src={ad.advertiser_logo_url}
              alt={ad.advertiser_name}
              className="h-8 w-auto"
            />
          </div>
        )}

        {/* Headline */}
        {elementOverrides.headline.visible && (
          <h3
            className="headline font-bold leading-tight"
            style={{
              ...buildElementStyle(elementOverrides.headline, customFonts),
              zIndex: Z_INDEX_MAP.headline,
              pointerEvents: 'none',
            }}
          >
            {resolved.headline}
          </h3>
        )}

        {/* Body */}
        {elementOverrides.body.visible && resolved.body && (
          <p
            className="body leading-snug"
            style={{
              ...buildElementStyle(elementOverrides.body, customFonts),
              zIndex: Z_INDEX_MAP.body,
              pointerEvents: 'none',
            }}
          >
            {resolved.body}
          </p>
        )}

        {/* CTA Button */}
        {elementOverrides.cta.visible && (
          <div
            className="cta font-semibold shadow-sm"
            style={{
              ...buildElementStyle(elementOverrides.cta, customFonts),
              zIndex: Z_INDEX_MAP.cta,
              padding: '6px 12px',
              borderRadius: '6px',
              pointerEvents: 'none',
            }}
          >
            {resolved.cta_text}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════
            SESI 6 Sub-Phase 6D Batch 6D.2 — TD-ANIM-102:
            SVG Illustration Layers (variant-level)
            Render BEFORE disclaimer supaya disclaimer overlay layer.
            ════════════════════════════════════════════════════════ */}
        {(activeVariant.svg_layers ?? []).map((layer) => {
          if (layer.visible === false) return null;
          return (
            <div
              key={layer.id}
              className={`tlk-svg-layer tlk-svg-layer-${layer.id}`}
              style={{
                position: 'absolute',
                ...getPositionStyle(layer.position),
                width:    `${layer.width}px`,
                height:   `${layer.height}px`,
                zIndex:   layer.z_index ?? 5,
                pointerEvents: 'none',
                // Start hidden if has animation, else fully visible
                opacity:  layer.animation !== 'none' ? 0 : 1,
              }}
              dangerouslySetInnerHTML={{ __html: layer.svg_markup }}
            />
          );
        })}

        {/* ════════════════════════════════════════════════════════
            SESI 6 Sub-Phase 6F — Object Layers (raster .gif/.png/.webp)
            Same z-order tier sebagai SVG layers (admin atur z_index per layer).
            ════════════════════════════════════════════════════════ */}
        {(activeVariant.object_layers ?? []).map((layer) => {
          if (layer.visible === false) return null;
          return (
            <img
              key={layer.id}
              className={`tlk-object-layer tlk-object-layer-${layer.id}`}
              src={layer.image_url}
              alt={layer.name}
              draggable={false}
              style={{
                position: 'absolute',
                ...getPositionStyle(layer.position),
                width:    `${layer.width}px`,
                height:   `${layer.height}px`,
                zIndex:   layer.z_index ?? 5,
                pointerEvents: 'none',
                userSelect:    'none',
                opacity:  layer.animation !== 'none' ? 0 : 1,
                objectFit: 'contain',
              }}
            />
          );
        })}

        {/* Disclaimer at bottom (always visible) */}
        {ad.disclaimer_text && (
          <div
            className="
              absolute bottom-0 left-0 right-0 z-20
              bg-amber-100/95 px-2 py-1
              text-[9px] leading-tight text-amber-900
            "
            style={{ pointerEvents: 'none' }}
          >
            {ad.disclaimer_text}
          </div>
        )}
      </div>

      <p className="mt-1 text-center text-[9px] text-gray-500">
        oleh <span className="font-medium">{ad.advertiser_name}</span>
        {variants.length > 1 && (
          <span className="ml-1 text-amber-600">
            · {safeIdx + 1}/{variants.length}
          </span>
        )}
        {isStaticActive && staticReason && (
          <span className="ml-1 text-amber-600" title={`Static: ${staticReason}`}>
            · static
          </span>
        )}
      </p>
    </div>
  );
}

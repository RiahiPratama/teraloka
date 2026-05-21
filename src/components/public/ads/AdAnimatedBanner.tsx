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

/** 9 anchor positions di banner container. */
export type ElementPosition =
  | 'top_left'    | 'top_center'    | 'top_right'
  | 'middle_left' | 'middle_center' | 'middle_right'
  | 'bottom_left' | 'bottom_center' | 'bottom_right';

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
 *   - sans:    Modern, friendly (default — Inter)
 *   - serif:   Elegant, premium (Georgia/Playfair)
 *   - display: Cinematic, bold (Bebas Neue/Impact) — Kumparan-style headline
 *   - mono:    Techy, code-feel (JetBrains Mono)
 */
export type FontFamily = 'sans' | 'serif' | 'display' | 'mono';

const FONT_FAMILY_MAP: Record<FontFamily, string> = {
  sans:    'Inter, system-ui, -apple-system, sans-serif',
  serif:   '"Playfair Display", Georgia, "Times New Roman", serif',
  display: '"Bebas Neue", Impact, "Arial Black", sans-serif',
  mono:    '"JetBrains Mono", "Courier New", monospace',
};

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

export interface AnimationVariant {
  order:       number;
  image_url:   string;
  headline:    string;
  body?:       string | null;
  cta_text?:   string | null;
  duration_ms: number;
  /** Tier 2: per-element override (null/undefined = use defaults). */
  element_overrides?: Partial<Record<ElementKey, ElementOverride>>;
}

export type TransitionPattern = 'fade' | 'slide_left' | 'slide_up' | 'none';
export type TextRevealPattern = 'fade_in' | 'slide_in' | 'text_reveal' | 'none';

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
 * Compute position style berdasarkan ElementPosition preset.
 * Return CSS positioning + transform untuk anchor.
 */
function getPositionStyle(position: ElementPosition): React.CSSProperties {
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
 */
function buildElementStyle(override: ElementOverride): React.CSSProperties {
  const fontFamily = override.font_family
    ? FONT_FAMILY_MAP[override.font_family]
    : FONT_FAMILY_MAP.sans;
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
    letterSpacing:    override.font_family === 'display' ? '0.02em' : '-0.01em',
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
}: AdAnimatedBannerProps) {
  const containerRef     = useRef<HTMLDivElement | null>(null);
  const timelineRef      = useRef<gsap.core.Timeline | null>(null);
  const contextRef       = useRef<gsap.Context | null>(null);
  const hasPlayedOnceRef = useRef(false);

  const [phase, setPhase]                       = useState<Phase>('idle');
  const [errorMsg, setErrorMsg]                 = useState<string | null>(null);
  const [staticReason, setStaticReason]         = useState<StaticFallbackReason>(null);
  const [activeVariantIdx, setActiveVariantIdx] = useState(0);

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
              ...buildElementStyle(elementOverrides.logo),
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
              ...buildElementStyle(elementOverrides.headline),
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
              ...buildElementStyle(elementOverrides.body),
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
              ...buildElementStyle(elementOverrides.cta),
              zIndex: Z_INDEX_MAP.cta,
              padding: '6px 12px',
              borderRadius: '6px',
              pointerEvents: 'none',
            }}
          >
            {resolved.cta_text}
          </div>
        )}

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

'use client';

/**
 * TeraLoka — AnimationBuilder (Inline Controls Per Field)
 * SESI 5H Phase 5B (21 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/admin/ads/AnimationBuilder.tsx
 *
 * Design philosophy:
 *   Setiap text field (Headline/Body/CTA) punya MINI-CONTROLS inline:
 *     - 📍 Position: Left | Center | Right
 *     - 📐 Size:     S | M | L (+ XL untuk Headline)
 *     - ✨ Animation: Fade In | Slide In | Scale In | Text Reveal (+ Pulse untuk CTA)
 *     - 🎨 Warna:    8 color palette untuk text color
 *     - 🎨 Backdrop: None + 8 color palette untuk tint di belakang text
 *
 * Klien isi text → langsung sebelahnya atur kontrol. Linear flow, low cognitive load.
 *
 * UI STRUCTURE:
 *   1. Preset Picker (5 template cepat)
 *   2. Variants CRUD (per variant inline controls)
 *   3. Transition antar variant (kalau 2+)
 *   4. Text Reveal Animation GLOBAL (fallback default)
 *   5. Loop Toggle
 *   6. Live Preview (auto-scale)
 *
 * Engine support: AdAnimatedBanner Tier 2 (per-element override engine).
 * UI sends `element_overrides` dengan auto-calculated delay_ms + duration_ms.
 * ────────────────────────────────────────────────────────────────
 */

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Wand2,
  Image as ImageIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ANIMATION_PRESETS,
  getPresetById,
  clonePresetTimeline,
  buildEmptyTimeline,
} from '@/lib/ads/animation-presets';
import AdAnimatedBanner, {
  type AnimationTimelineConfig,
  type AnimationVariant,
  type AnimatedBannerAd,
  type TransitionPattern,
  type TextRevealPattern,
  type ElementOverride,
  type ElementKey,
  type ElementAnimation,
  type ElementPosition,
  type TextSize,
  type TextColorKey,
  DEFAULT_ELEMENT_OVERRIDES,
  TEXT_COLOR_MAP,
} from '@/components/public/ads/AdAnimatedBanner';

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const MIN_VARIANTS = 1;
const MAX_VARIANTS = 5;
const MIN_DURATION_MS = 2000;
const MAX_DURATION_MS = 15000;
const DEFAULT_DURATION_MS = 4000;

const TRANSITION_OPTIONS: { value: TransitionPattern; label: string; description: string }[] = [
  { value: 'fade',       label: 'Fade',       description: 'Crossfade halus antar variant' },
  { value: 'slide_left', label: 'Slide Left', description: 'Geser ke kiri (carousel feel)' },
  { value: 'slide_up',   label: 'Slide Up',   description: 'Geser ke atas (story feel)' },
  { value: 'none',       label: 'None',       description: 'Cut langsung, tanpa transisi' },
];

const TEXT_REVEAL_OPTIONS: { value: TextRevealPattern; label: string; description: string }[] = [
  { value: 'fade_in',     label: 'Fade In',     description: 'Element muncul transparan → jelas' },
  { value: 'slide_in',    label: 'Slide In',    description: 'Element geser masuk dari kiri' },
  { value: 'text_reveal', label: 'Text Reveal', description: 'Tulisan muncul karakter-per-karakter' },
  { value: 'none',        label: 'None',        description: 'Tidak ada animasi text' },
];

// ─── Inline Controls Constants ────────────────────────────────────

// 3-way horizontal position
type HorizontalPosition = 'left' | 'center' | 'right';

const POSITION_OPTIONS: { value: HorizontalPosition; label: string; emoji: string }[] = [
  { value: 'left',   label: 'Left',   emoji: '⬅' },
  { value: 'center', label: 'Center', emoji: '⬌' },
  { value: 'right',  label: 'Right',  emoji: '➡' },
];

// Map HorizontalPosition + element type ke ElementPosition (9-anchor) di engine
function toEnginePosition(field: 'headline' | 'body' | 'cta', horizontal: HorizontalPosition): ElementPosition {
  // Headline & Body di middle row
  // CTA di bottom row
  if (field === 'cta') {
    if (horizontal === 'left')   return 'bottom_left';
    if (horizontal === 'center') return 'bottom_center';
    return 'bottom_right';
  }
  // Headline & Body middle row
  if (horizontal === 'left')   return 'middle_left';
  if (horizontal === 'center') return 'middle_center';
  return 'middle_right';
}

// Reverse: ElementPosition → HorizontalPosition (untuk read state existing)
function fromEnginePosition(position: ElementPosition): HorizontalPosition {
  if (position.includes('center')) return 'center';
  if (position.includes('right'))  return 'right';
  return 'left';
}

// Size options per field
const HEADLINE_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];

const BODY_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
];

const CTA_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
];

// Animation per field (Headline/Body sama, CTA exclusive Pulse)
const TEXT_ANIM_OPTIONS: { value: ElementAnimation; label: string; emoji: string }[] = [
  { value: 'fade_in',     label: 'Fade In',     emoji: '🌫️' },
  { value: 'slide_in',    label: 'Slide In',    emoji: '➡️' },
  { value: 'scale_in',    label: 'Scale In',    emoji: '🔍' },
  { value: 'text_reveal', label: 'Reveal',      emoji: '⌨️' },
];

const CTA_ANIM_OPTIONS: { value: ElementAnimation; label: string; emoji: string }[] = [
  { value: 'fade_in',  label: 'Fade In',  emoji: '🌫️' },
  { value: 'slide_in', label: 'Slide In', emoji: '➡️' },
  { value: 'scale_in', label: 'Scale In', emoji: '🔍' },
  { value: 'pulse',    label: 'Pulse',    emoji: '💗' },
];

// Color palette — 8 swatches restricted untuk klarity
const COLOR_PALETTE: { value: TextColorKey; label: string; swatch: string }[] = [
  { value: 'white',  label: 'White',  swatch: TEXT_COLOR_MAP.white  },
  { value: 'black',  label: 'Black',  swatch: TEXT_COLOR_MAP.black  },
  { value: 'amber',  label: 'Amber',  swatch: TEXT_COLOR_MAP.amber  },
  { value: 'red',    label: 'Red',    swatch: TEXT_COLOR_MAP.red    },
  { value: 'blue',   label: 'Blue',   swatch: TEXT_COLOR_MAP.blue   },
  { value: 'green',  label: 'Green',  swatch: TEXT_COLOR_MAP.green  },
  { value: 'purple', label: 'Purple', swatch: TEXT_COLOR_MAP.purple },
  { value: 'gray',   label: 'Gray',   swatch: TEXT_COLOR_MAP.gray   },
];

// Auto-calculated delay per field (klien gak perlu lihat angka)
const AUTO_DELAY_MS: Record<'headline' | 'body' | 'cta', number> = {
  headline: 0,
  body:     300,
  cta:      600,
};

const AUTO_DURATION_MS = 500;

// ════════════════════════════════════════════════════════════════
// PREVIEW CONTEXT
// ════════════════════════════════════════════════════════════════

export interface PreviewContext {
  title?:               string;
  body?:                string;
  image_url?:           string;
  link_url?:            string;
  advertiser_name?:     string;
  advertiser_logo_url?: string;
  disclaimer_text?:     string;
}

// ════════════════════════════════════════════════════════════════
// COMPONENT PROPS
// ════════════════════════════════════════════════════════════════

export interface AnimationBuilderProps {
  timeline:        AnimationTimelineConfig | null;
  onChange:        (timeline: AnimationTimelineConfig) => void;
  previewContext:  PreviewContext;
  previewWidth?:   number;
  previewHeight?:  number;
  errorMessage?:   string;
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function createEmptyVariant(order: number): AnimationVariant {
  return {
    order,
    image_url:   '',
    headline:    '',
    body:        null,
    cta_text:    null,
    duration_ms: DEFAULT_DURATION_MS,
  };
}

function renumberVariants(variants: AnimationVariant[]): AnimationVariant[] {
  return variants.map((v, idx) => ({ ...v, order: idx }));
}

/**
 * Get effective ElementOverride for variant + field (merge default + override).
 */
function getElementOverride(
  variant: AnimationVariant,
  field:   ElementKey,
): ElementOverride {
  const custom = variant.element_overrides?.[field];
  const defaults = DEFAULT_ELEMENT_OVERRIDES[field];
  return { ...defaults, ...(custom ?? {}) };
}

/**
 * Build mutation: update element override for specific field di variant.
 */
function patchElementOverride(
  variant: AnimationVariant,
  field:   ElementKey,
  patch:   Partial<ElementOverride>,
): AnimationVariant {
  const current = getElementOverride(variant, field);
  const next: ElementOverride = { ...current, ...patch };
  return {
    ...variant,
    element_overrides: {
      ...(variant.element_overrides ?? {}),
      [field]: next,
    },
  };
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

export default function AnimationBuilder({
  timeline:       timelineProp,
  onChange,
  previewContext,
  previewWidth  = 300,
  previewHeight = 250,
  errorMessage,
}: AnimationBuilderProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');

  const timeline = timelineProp ?? buildEmptyTimeline();
  const variants = timeline.variants;

  // ─── Mutate helpers ────────────────────────────────────────────

  const updateTimeline = (patch: Partial<AnimationTimelineConfig>) => {
    onChange({ ...timeline, ...patch });
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') return;
    const preset = getPresetById(presetId);
    if (!preset) return;
    onChange(clonePresetTimeline(preset));
  };

  const replaceVariant = (idx: number, nextVariant: AnimationVariant) => {
    const next = variants.map((v, i) => (i === idx ? nextVariant : v));
    updateTimeline({ variants: next });
    setSelectedPresetId('custom');
  };

  const updateVariant = (idx: number, patch: Partial<AnimationVariant>) => {
    const current = variants[idx];
    if (!current) return;
    replaceVariant(idx, { ...current, ...patch });
  };

  const updateVariantElement = (
    idx:   number,
    field: ElementKey,
    patch: Partial<ElementOverride>,
  ) => {
    const current = variants[idx];
    if (!current) return;
    replaceVariant(idx, patchElementOverride(current, field, patch));
  };

  const addVariant = () => {
    if (variants.length >= MAX_VARIANTS) return;
    const next = [...variants, createEmptyVariant(variants.length)];
    updateTimeline({ variants: renumberVariants(next) });
    setSelectedPresetId('custom');
  };

  const removeVariant = (idx: number) => {
    if (variants.length <= MIN_VARIANTS) return;
    const next = renumberVariants(variants.filter((_, i) => i !== idx));
    updateTimeline({ variants: next });
    setSelectedPresetId('custom');
  };

  const moveVariant = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= variants.length) return;
    const next = [...variants];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    updateTimeline({ variants: renumberVariants(next) });
    setSelectedPresetId('custom');
  };

  // ─── Preview Ad ────────────────────────────────────────────────

  const previewAd: AnimatedBannerAd | null = useMemo(() => {
    if (variants.length === 0) return null;
    return {
      id:                  'preview-ad',
      slug:                null,
      title:               previewContext.title || 'Judul Iklan Anda',
      body:                previewContext.body || null,
      image_url:           previewContext.image_url || null,
      link_url:            previewContext.link_url || '#',
      advertiser_name:     previewContext.advertiser_name || 'Sponsor',
      advertiser_logo_url: previewContext.advertiser_logo_url || null,
      disclaimer_text:     previewContext.disclaimer_text || null,
      animation_timeline:  timeline,
    };
  }, [timeline, previewContext, variants.length]);

  const previewKey = useMemo(() => JSON.stringify(timeline), [timeline]);

  const totalDurationSec = useMemo(() => {
    const sum = variants.reduce((acc, v) => acc + v.duration_ms, 0);
    return (sum / 1000).toFixed(1);
  }, [variants]);

  // ─── Smart Preview Auto-Scale ──────────────────────────────────

  const previewContainerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const el = previewContainerRef.current;
    if (!el) return;

    const updateWidth = () => setContainerWidth(el.clientWidth);
    updateWidth();

    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }

    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const availableWidth = Math.max(containerWidth - 32, 0);
  const scaleFactor    = availableWidth > 0 && previewWidth > availableWidth
    ? availableWidth / previewWidth
    : 1;
  const scaledHeight   = previewHeight * scaleFactor;
  const isScaled       = scaleFactor < 1;

  // ════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* ─── Status Summary Bar ─── */}
      <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <p className="text-xs text-purple-900 dark:text-purple-200">
            <span className="font-semibold">{variants.length} variant</span>
            <span className="text-purple-600 dark:text-purple-400"> · </span>
            <span>Total {totalDurationSec}s</span>
            {timeline.loop && (
              <>
                <span className="text-purple-600 dark:text-purple-400"> · </span>
                <span className="font-semibold">Loop forever</span>
              </>
            )}
          </p>
        </div>
        <p className="text-[10px] text-purple-700 dark:text-purple-300">
          Preview: {previewWidth}×{previewHeight}px
        </p>
      </div>

      {/* ─── Error Message ─── */}
      {errorMessage && (
        <div className="flex items-start gap-2 p-3 rounded-md bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900">
          <Sparkles className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      )}

      {/* ─── PRESET PICKER ─── */}
      <div>
        <label className="block text-xs font-semibold text-purple-900 dark:text-purple-200 mb-2">
          <Wand2 className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Pilih Template Cepat
        </label>
        <select
          value={selectedPresetId}
          onChange={(e) => handlePresetSelect(e.target.value)}
          className="w-full px-3 py-2 rounded-md border border-purple-300 dark:border-purple-800 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
        >
          <option value="custom">— Custom (craft manual) —</option>
          {ANIMATION_PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.icon} {preset.label}
            </option>
          ))}
        </select>
        {selectedPresetId !== 'custom' && (
          <p className="mt-2 text-[11px] text-purple-700/80 dark:text-purple-300/80">
            {getPresetById(selectedPresetId)?.description}
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION: VARIANTS                                            */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-purple-900 dark:text-purple-200">
            Variants Animasi ({variants.length}/{MAX_VARIANTS})
          </label>
          {variants.length < MAX_VARIANTS && (
            <button
              type="button"
              onClick={addVariant}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition"
            >
              <Plus className="w-3.5 h-3.5" />
              Tambah Variant
            </button>
          )}
        </div>

        <div className="space-y-3">
          {variants.map((variant, idx) => (
            <VariantEditor
              key={idx}
              variant={variant}
              index={idx}
              totalVariants={variants.length}
              onChange={(patch) => updateVariant(idx, patch)}
              onChangeElement={(field, patch) => updateVariantElement(idx, field, patch)}
              onRemove={() => removeVariant(idx)}
              onMove={(dir) => moveVariant(idx, dir)}
            />
          ))}
        </div>

        <p className="text-[10px] text-text-subtle mt-2">
          Min {MIN_VARIANTS} · Max {MAX_VARIANTS} variant · Durasi {MIN_DURATION_MS/1000}-{MAX_DURATION_MS/1000}s per variant
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION: TRANSITION (visible kalau 2+ variants)               */}
      {/* ════════════════════════════════════════════════════════════ */}
      {variants.length >= 2 && (
        <div className="rounded-lg border border-purple-200 dark:border-purple-800 p-3 bg-purple-50/30 dark:bg-purple-950/10">
          <label className="text-xs font-semibold text-purple-900 dark:text-purple-200 mb-2 block">
            🎞️ Transisi antar Variant
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {TRANSITION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={cn(
                  'flex items-start gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition',
                  timeline.transition_pattern === opt.value
                    ? 'bg-purple-100 border-purple-400 dark:bg-purple-900/40 dark:border-purple-600'
                    : 'bg-white border-gray-200 hover:bg-purple-50 dark:bg-gray-900 dark:border-gray-700'
                )}
              >
                <input
                  type="radio"
                  name="transition_pattern"
                  checked={timeline.transition_pattern === opt.value}
                  onChange={() => updateTimeline({ transition_pattern: opt.value })}
                  className="accent-purple-600 mt-0.5 shrink-0"
                />
                <div className="min-w-0">
                  <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100">{opt.label}</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">{opt.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Durasi transisi (ms, 200-1000)
            </label>
            <input
              type="number"
              value={timeline.transition_ms}
              min={200}
              max={1000}
              step={100}
              onChange={(e) =>
                updateTimeline({
                  transition_ms: Math.max(200, Math.min(1000, parseInt(e.target.value, 10) || 500)),
                })
              }
              className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION: TEXT REVEAL ANIMATION (Global Fallback)              */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="rounded-lg border border-purple-200 dark:border-purple-800 p-3 bg-purple-50/30 dark:bg-purple-950/10">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-purple-900 dark:text-purple-200">
            🎭 Text Reveal Animation (Default)
          </label>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={timeline.text_reveal_enabled}
              onChange={(e) => updateTimeline({ text_reveal_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-checked:bg-purple-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all" />
          </label>
        </div>

        <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mb-3">
          Default animasi semua element. Bisa di-override per field di variant (animation picker di bawah field).
        </p>

        {timeline.text_reveal_enabled && (
          <>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {TEXT_REVEAL_OPTIONS.filter((o) => o.value !== 'none').map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-start gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition',
                    timeline.text_reveal_pattern === opt.value
                      ? 'bg-purple-100 border-purple-400 dark:bg-purple-900/40 dark:border-purple-600'
                      : 'bg-white border-gray-200 hover:bg-purple-50 dark:bg-gray-900 dark:border-gray-700'
                  )}
                >
                  <input
                    type="radio"
                    name="text_reveal_pattern"
                    checked={timeline.text_reveal_pattern === opt.value}
                    onChange={() => updateTimeline({ text_reveal_pattern: opt.value })}
                    className="accent-purple-600 mt-0.5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-gray-900 dark:text-gray-100">{opt.label}</p>
                    <p className="text-[9px] text-gray-500 dark:text-gray-400 leading-tight">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Stagger antar element (ms, 50-500)
              </label>
              <input
                type="number"
                value={timeline.text_reveal_stagger_ms}
                min={50}
                max={500}
                step={50}
                onChange={(e) =>
                  updateTimeline({
                    text_reveal_stagger_ms: Math.max(50, Math.min(500, parseInt(e.target.value, 10) || 150)),
                  })
                }
                className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* LOOP TOGGLE                                                    */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between p-3 rounded-md bg-purple-100/40 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
        <div>
          <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">🔁 Loop Carousel</p>
          <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">
            Phase 1 LOCKED: matikan (play-once + replay-on-scroll). Loop hanya untuk carousel rotasi terus.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={timeline.loop}
            onChange={(e) => updateTimeline({ loop: e.target.checked })}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-checked:bg-purple-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all" />
        </label>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* LIVE PREVIEW                                                   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div>
        <label className="block text-xs font-semibold text-purple-900 dark:text-purple-200 mb-2">
          <Eye className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Live Preview ({previewWidth}×{previewHeight})
          {isScaled && (
            <span className="ml-2 text-[10px] font-normal text-purple-600 dark:text-purple-400">
              · scaled {(scaleFactor * 100).toFixed(0)}%
            </span>
          )}
        </label>
        <div
          ref={previewContainerRef}
          className="p-4 rounded-md border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 flex items-center justify-center overflow-hidden"
          style={{
            minHeight: isScaled ? `${Math.max(scaledHeight + 32, 200)}px` : '200px',
          }}
        >
          {previewAd ? (
            isScaled ? (
              <div
                style={{
                  width:  `${previewWidth * scaleFactor}px`,
                  height: `${previewHeight * scaleFactor}px`,
                }}
                className="relative"
              >
                <div
                  style={{
                    width:           `${previewWidth}px`,
                    height:          `${previewHeight}px`,
                    transform:       `scale(${scaleFactor})`,
                    transformOrigin: 'top left',
                  }}
                  className="absolute top-0 left-0"
                >
                  <AdAnimatedBanner
                    key={previewKey}
                    ad={previewAd}
                    width={previewWidth}
                    height={previewHeight}
                  />
                </div>
              </div>
            ) : (
              <AdAnimatedBanner
                key={previewKey}
                ad={previewAd}
                width={previewWidth}
                height={previewHeight}
              />
            )
          ) : (
            <div className="text-center">
              <Eye className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">Preview muncul setelah ada minimal 1 variant</p>
            </div>
          )}
        </div>
        <p className="mt-2 text-[10px] text-purple-700/60 dark:text-purple-300/60 italic">
          Preview pakai data dari section Kreatif (kalau variant field kosong).
          {isScaled && (
            <span className="block mt-0.5">
              ℹ️ Banner di-scale-down agar fit modal. Render sebenarnya {previewWidth}×{previewHeight}px di production.
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: VariantEditor (DCA + inline controls per field)
// ════════════════════════════════════════════════════════════════

interface VariantEditorProps {
  variant:         AnimationVariant;
  index:           number;
  totalVariants:   number;
  onChange:        (patch: Partial<AnimationVariant>) => void;
  onChangeElement: (field: ElementKey, patch: Partial<ElementOverride>) => void;
  onRemove:        () => void;
  onMove:          (direction: 'up' | 'down') => void;
}

function VariantEditor({
  variant,
  index,
  totalVariants,
  onChange,
  onChangeElement,
  onRemove,
  onMove,
}: VariantEditorProps) {
  // Compute resolved overrides for inline display
  const headlineOverride = getElementOverride(variant, 'headline');
  const bodyOverride     = getElementOverride(variant, 'body');
  const ctaOverride      = getElementOverride(variant, 'cta');

  return (
    <div className="p-3 rounded-md border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
          🎞️ Variant #{index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove('up')}
            disabled={index === 0}
            className={cn(
              'p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition',
              index === 0 && 'opacity-30 cursor-not-allowed',
            )}
            title="Pindah ke atas"
          >
            <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
          </button>
          <button
            type="button"
            onClick={() => onMove('down')}
            disabled={index === totalVariants - 1}
            className={cn(
              'p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition',
              index === totalVariants - 1 && 'opacity-30 cursor-not-allowed',
            )}
            title="Pindah ke bawah"
          >
            <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            disabled={totalVariants <= MIN_VARIANTS}
            className={cn(
              'p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition',
              totalVariants <= MIN_VARIANTS && 'opacity-30 cursor-not-allowed',
            )}
            title={totalVariants <= MIN_VARIANTS ? `Min ${MIN_VARIANTS} variant` : 'Hapus variant'}
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* ─── Image upload ─── */}
      <div className="mb-3">
        <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
          <ImageIcon className="w-3 h-3 inline mr-1" />
          Background Image *
        </label>
        <ImageUpload
          bucket="ads"
          maxFiles={1}
          maxSizeMB={0.5}
          existingUrls={variant.image_url ? [variant.image_url] : []}
          onUpload={(urls: string[]) => onChange({ image_url: urls[0] ?? '' })}
          label={`Variant #${index + 1} background`}
        />
      </div>

      {/* ─── Text fields dengan INLINE controls ─── */}
      <div className="space-y-4">

        {/* HEADLINE */}
        <FieldWithInlineControls
          fieldType="headline"
          label="Headline *"
          required
          minLength={5}
          maxLength={80}
          placeholder="e.g., Diskon 50% Lebaran"
          value={variant.headline}
          override={headlineOverride}
          sizeOptions={HEADLINE_SIZE_OPTIONS}
          animOptions={TEXT_ANIM_OPTIONS}
          onChangeText={(text) => onChange({ headline: text })}
          onChangeElement={(patch) => onChangeElement('headline', patch)}
        />

        {/* BODY */}
        <FieldWithInlineControls
          fieldType="body"
          label="Body override"
          optional
          maxLength={120}
          placeholder="Kosong = pakai Body dari section Kreatif"
          value={variant.body ?? ''}
          override={bodyOverride}
          sizeOptions={BODY_SIZE_OPTIONS}
          animOptions={TEXT_ANIM_OPTIONS}
          onChangeText={(text) => onChange({ body: text || null })}
          onChangeElement={(patch) => onChangeElement('body', patch)}
        />

        {/* CTA */}
        <FieldWithInlineControls
          fieldType="cta"
          label="CTA Text override"
          optional
          maxLength={30}
          placeholder='Default: "Pelajari Lebih Lanjut"'
          value={variant.cta_text ?? ''}
          override={ctaOverride}
          sizeOptions={CTA_SIZE_OPTIONS}
          animOptions={CTA_ANIM_OPTIONS}
          onChangeText={(text) => onChange({ cta_text: text || null })}
          onChangeElement={(patch) => onChangeElement('cta', patch)}
        />

        {/* DURASI */}
        <div>
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Durasi tampil
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={variant.duration_ms / 1000}
              onChange={(e) => {
                const sec = Number(e.target.value);
                if (isNaN(sec)) return;
                onChange({ duration_ms: Math.max(MIN_DURATION_MS, Math.min(MAX_DURATION_MS, Math.round(sec * 1000))) });
              }}
              min={MIN_DURATION_MS / 1000}
              max={MAX_DURATION_MS / 1000}
              step={1}
              className="w-20 px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none text-center"
            />
            <span className="text-[11px] text-gray-500 dark:text-gray-400">
              detik ({MIN_DURATION_MS / 1000}-{MAX_DURATION_MS / 1000}s)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: FieldWithInlineControls
// ════════════════════════════════════════════════════════════════

interface FieldWithInlineControlsProps {
  fieldType:    'headline' | 'body' | 'cta';
  label:        string;
  required?:    boolean;
  optional?:    boolean;
  minLength?:   number;
  maxLength:    number;
  placeholder:  string;
  value:        string;
  override:     ElementOverride;
  sizeOptions:  { value: TextSize; label: string }[];
  animOptions:  { value: ElementAnimation; label: string; emoji: string }[];
  onChangeText:    (text: string) => void;
  onChangeElement: (patch: Partial<ElementOverride>) => void;
}

function FieldWithInlineControls({
  fieldType,
  label,
  required,
  optional,
  minLength,
  maxLength,
  placeholder,
  value,
  override,
  sizeOptions,
  animOptions,
  onChangeText,
  onChangeElement,
}: FieldWithInlineControlsProps) {
  const currentHorizontal: HorizontalPosition = fromEnginePosition(override.position);

  return (
    <div className="rounded-md border border-purple-200/60 dark:border-purple-800/60 p-2.5 bg-purple-50/20 dark:bg-purple-950/10">
      {/* Text input */}
      <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {required && minLength && (
          <span className="text-gray-400 ml-1">(min {minLength} char)</span>
        )}
        {optional && <span className="text-gray-400 ml-1">(opsional)</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
      />
      {required && (
        <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
          {value.length}/{maxLength} karakter
        </p>
      )}

      {/* Inline mini-controls */}
      <div className="mt-2 space-y-1.5 pl-2 border-l-2 border-purple-300/40 dark:border-purple-700/40">

        {/* POSITION */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-purple-700 dark:text-purple-300 w-14 shrink-0">
            📍 Posisi
          </span>
          <div className="flex gap-1">
            {POSITION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChangeElement({ position: toEnginePosition(fieldType, opt.value) })
                }
                className={cn(
                  'px-2 py-0.5 text-[10px] rounded border transition',
                  currentHorizontal === opt.value
                    ? 'bg-purple-600 text-white border-purple-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-purple-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
                )}
                title={opt.label}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* SIZE */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-purple-700 dark:text-purple-300 w-14 shrink-0">
            📐 Size
          </span>
          <div className="flex gap-1">
            {sizeOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onChangeElement({ text_size: opt.value })}
                className={cn(
                  'px-2 py-0.5 text-[10px] rounded border transition font-bold min-w-[26px]',
                  override.text_size === opt.value
                    ? 'bg-purple-600 text-white border-purple-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-purple-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ANIMATION */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-purple-700 dark:text-purple-300 w-14 shrink-0">
            ✨ Animasi
          </span>
          <div className="flex gap-1 flex-wrap">
            {animOptions.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  onChangeElement({
                    animation: opt.value,
                    delay_ms:    AUTO_DELAY_MS[fieldType],
                    duration_ms: AUTO_DURATION_MS,
                  })
                }
                className={cn(
                  'px-2 py-0.5 text-[10px] rounded border transition',
                  override.animation === opt.value
                    ? 'bg-purple-600 text-white border-purple-700'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-purple-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
                )}
                title={opt.label}
              >
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* COLOR */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-purple-700 dark:text-purple-300 w-14 shrink-0">
            🎨 Warna
          </span>
          <div className="flex gap-1 flex-wrap items-center">
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onChangeElement({ text_color: c.value })}
                className={cn(
                  'w-6 h-6 rounded border-2 transition relative',
                  override.text_color === c.value
                    ? 'border-purple-600 ring-2 ring-purple-300 dark:ring-purple-700 scale-110'
                    : 'border-gray-300 dark:border-gray-700 hover:border-purple-400',
                )}
                style={{ backgroundColor: c.swatch }}
                title={c.label}
                aria-label={`Warna ${c.label}`}
              />
            ))}
            <span className="text-[9px] text-gray-500 dark:text-gray-400 ml-1 italic capitalize">
              {override.text_color}
            </span>
          </div>
        </div>

        {/* TINT PALETTE — Backdrop di belakang text */}
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-semibold text-purple-700 dark:text-purple-300 w-14 shrink-0">
            🎨 Backdrop
          </span>
          <div className="flex gap-1 flex-wrap items-center">
            {/* None option (transparent) */}
            <button
              type="button"
              onClick={() => onChangeElement({ background_tint: 'none' })}
              className={cn(
                'w-6 h-6 rounded border-2 transition relative overflow-hidden',
                override.background_tint === 'none'
                  ? 'border-purple-600 ring-2 ring-purple-300 dark:ring-purple-700 scale-110'
                  : 'border-gray-300 dark:border-gray-700 hover:border-purple-400',
              )}
              title="None — Transparent (tidak ada backdrop)"
              aria-label="Backdrop None"
              style={{
                background:
                  'repeating-linear-gradient(45deg, #fff 0 4px, #ddd 4px 8px)',
              }}
            >
              <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-gray-700">
                ⊘
              </span>
            </button>
            {/* 8 color swatches mirror text color */}
            {COLOR_PALETTE.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => onChangeElement({ background_tint: c.value })}
                className={cn(
                  'w-6 h-6 rounded border-2 transition relative',
                  override.background_tint === c.value
                    ? 'border-purple-600 ring-2 ring-purple-300 dark:ring-purple-700 scale-110'
                    : 'border-gray-300 dark:border-gray-700 hover:border-purple-400',
                )}
                style={{ backgroundColor: c.swatch, opacity: 0.85 }}
                title={`Backdrop ${c.label}`}
                aria-label={`Backdrop ${c.label}`}
              />
            ))}
            <span className="text-[9px] text-gray-500 dark:text-gray-400 ml-1 italic capitalize">
              {override.background_tint === 'none' ? 'transparent' : override.background_tint}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

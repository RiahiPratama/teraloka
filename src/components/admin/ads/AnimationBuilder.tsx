'use client';

/**
 * TeraLoka — AnimationBuilder (Banner Studio V1 + V2 Phase 6A)
 * SESI 5H Phase 5B (21 Mei 2026) — Banner Studio V1
 * SESI 6  Phase 6A (22 Mei 2026) — TD-ANIM-104 Text Effects (Shadow/Stroke/Gradient)
 *                                 + TD-ANIM-105 Hover Behavior (pause/replay/speed_up)
 * SESI 6  Sub-Phase 6B (22 Mei 2026) — TD-ANIM-101 Custom Font Upload
 *                                      + advertiserId prop threading
 *                                      + Row 2 "Custom" pill + popover (select+delete)
 *                                      + CustomFontUploadModal integration
 *                                      + customFonts threading ke Live Preview
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/admin/ads/AnimationBuilder.tsx
 *
 * Admin solo founder tool untuk craft banner cinematic.
 *
 * UI STRUCTURE:
 *   A. TEMPLATE PICKER       — 5 cinematic templates + Custom Scratch
 *   B. VARIANTS CRUD         — Per variant: bg + text fields + inline controls
 *      └─ INLINE CONTROLS    — Per field 4 rows:
 *         Row 1: Position + Size + Animation
 *         Row 2: Font Family + Weight + Aa preview
 *         Row 3: Text Color + Backdrop
 *         Row 4 (SESI 6 NEW): Shadow + Stroke + Gradient (text effects)
 *      └─ ELEMENT EDITOR     — Collapsible per-element fine-tune (Tier 2 Full)
 *   C. TRANSITION antar variant (kalau 2+)
 *   D. TEXT REVEAL GLOBAL    — Fallback default kalau element override gak set
 *   E. LOOP toggle
 *   E.5 HOVER BEHAVIOR (SESI 6 NEW) — none/pause/replay/speed_up timeline-level
 *   F. LIVE PREVIEW auto-scale
 *
 * Persona: Admin POWER USER (founder solo).
 * Workflow: Pilih template → isi text + upload bg → fine-tune → save.
 * Output: 1 banner cinematic dalam 15-30 menit (bukan 8 jam designer work).
 *
 * Patterns: KEKE-2 (persona admin power user), AAX (frontend-only config),
 *           AAS (folder profile explicit src/components/admin/ads/)
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
  ChevronDown,
  ChevronUp,
  Settings2,
  RotateCcw,
  Film,
  Layers,
  Plane,
  Building2,
  ShoppingBag,
  PartyPopper,
  Megaphone,
  Car,
  Type,
  Bold,
  Sun,
  Square,
  Palette,
  MousePointer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/ImageUpload';
import {
  ANIMATION_PRESETS,
  getPresetById,
  clonePresetTimeline,
  buildEmptyTimeline,
} from '@/lib/ads/animation-presets';
import {
  BANNER_TEMPLATES,
  getBannerTemplate,
  cloneBannerTemplateTimeline,
  type BannerTemplate,
} from '@/lib/ads/banner-templates';
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
  type SlideFromDirection,
  type TextSize,
  type TextColorKey,
  type BackgroundTint,
  type FontFamily,
  type FontWeight,
  // SESI 6 Phase 6A — TD-ANIM-104 text effects
  type TextShadow,
  type TextStroke,
  type GradientDirection,
  type TextGradientConfig,
  // SESI 6 Phase 6A — TD-ANIM-105 hover behavior
  type HoverBehavior,
  // SESI 6 Sub-Phase 6B — TD-ANIM-101 custom fonts
  type CustomFontMap,
  type CustomFontEntry,
  makeCustomFontCssFamily,
  DEFAULT_ELEMENT_OVERRIDES,
  DEFAULT_TEXT_GRADIENT,
  TEXT_COLOR_MAP,
} from '@/components/public/ads/AdAnimatedBanner';

// SESI 6 Sub-Phase 6B — TD-ANIM-101: Custom Font Upload Modal + API client
import CustomFontUploadModal, {
  type CustomFontRecord,
} from './CustomFontUploadModal';
import { useApi, ApiError } from '@/lib/api/client';

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

type HorizontalPosition = 'left' | 'center' | 'right';

const POSITION_OPTIONS: { value: HorizontalPosition; label: string; emoji: string }[] = [
  { value: 'left',   label: 'Left',   emoji: '⬅' },
  { value: 'center', label: 'Center', emoji: '⬌' },
  { value: 'right',  label: 'Right',  emoji: '➡' },
];

function toEnginePosition(field: 'headline' | 'body' | 'cta', horizontal: HorizontalPosition): ElementPosition {
  if (field === 'cta') {
    if (horizontal === 'left')   return 'bottom_left';
    if (horizontal === 'center') return 'bottom_center';
    return 'bottom_right';
  }
  if (horizontal === 'left')   return 'middle_left';
  if (horizontal === 'center') return 'middle_center';
  return 'middle_right';
}

function fromEnginePosition(position: ElementPosition): HorizontalPosition {
  if (position.includes('center')) return 'center';
  if (position.includes('right'))  return 'right';
  return 'left';
}

const HEADLINE_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm',  label: 'S' },
  { value: 'md',  label: 'M' },
  { value: 'lg',  label: 'L' },
  { value: 'xl',  label: 'XL' },
  { value: '2xl', label: '2XL' },
  { value: '3xl', label: '3XL' },
];

const BODY_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
  { value: 'xl', label: 'XL' },
];

const CTA_SIZE_OPTIONS: { value: TextSize; label: string }[] = [
  { value: 'sm', label: 'S' },
  { value: 'md', label: 'M' },
  { value: 'lg', label: 'L' },
];

// ─── Font Family Options ──────────────────────────────────────────

const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string; sample: string; fontFamily: string }[] = [
  { value: 'sans',    label: 'Sans',    sample: 'Aa',  fontFamily: 'Inter, system-ui, sans-serif' },
  { value: 'serif',   label: 'Serif',   sample: 'Aa',  fontFamily: '"Playfair Display", Georgia, serif' },
  { value: 'display', label: 'Display', sample: 'Aa',  fontFamily: '"Bebas Neue", Impact, sans-serif' },
  { value: 'mono',    label: 'Mono',    sample: 'Aa',  fontFamily: '"JetBrains Mono", monospace' },
];

const FONT_WEIGHT_OPTIONS: { value: FontWeight; label: string; weight: number }[] = [
  { value: 'normal',   label: 'Reg',     weight: 400 },
  { value: 'semibold', label: 'Semi',    weight: 600 },
  { value: 'bold',     label: 'Bold',    weight: 700 },
  { value: 'black',    label: 'Black',   weight: 900 },
];

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

// ═══════════════════════════════════════════════════════════════
// SESI 6 Phase 6A — TD-ANIM-104: Text Effects UI Constants
// ═══════════════════════════════════════════════════════════════

const TEXT_SHADOW_OPTIONS: { value: TextShadow; label: string; preview: string }[] = [
  { value: 'none',   label: 'Off',  preview: '∅'   },
  { value: 'soft',   label: 'Soft', preview: 'Aa·' },
  { value: 'medium', label: 'Med',  preview: 'Aa‥' },
  { value: 'strong', label: 'Strong', preview: 'Aa⁂' },
];

const TEXT_STROKE_OPTIONS: { value: TextStroke; label: string; thickness: string }[] = [
  { value: 'none',   label: 'Off',  thickness: '0'   },
  { value: 'thin',   label: 'Thin', thickness: '1px' },
  { value: 'medium', label: 'Med',  thickness: '2px' },
  { value: 'thick',  label: 'Thick', thickness: '3px' },
];

const GRADIENT_DIRECTION_OPTIONS: { value: GradientDirection; label: string; arrow: string }[] = [
  { value: 'to_right',        label: 'Right',     arrow: '→' },
  { value: 'to_bottom',       label: 'Down',      arrow: '↓' },
  { value: 'to_bottom_right', label: 'Diag-DR',   arrow: '↘' },
  { value: 'to_top_right',    label: 'Diag-UR',   arrow: '↗' },
  { value: 'diagonal',        label: '135°',      arrow: '⤧' },
];

// ─── TD-ANIM-105 Hover Behavior Options ───────────────────────────

const HOVER_BEHAVIOR_OPTIONS: {
  value: HoverBehavior;
  label: string;
  emoji: string;
  description: string;
}[] = [
  { value: 'none',     label: 'Off',      emoji: '⊘',  description: 'Tidak ada reaksi saat di-hover (default)' },
  { value: 'pause',    label: 'Pause',    emoji: '⏸',  description: 'Carousel berhenti saat hover, lanjut saat lepas (user baca teks)' },
  { value: 'replay',   label: 'Replay',   emoji: '↻',  description: 'Restart timeline saat hover (re-engage user)' },
  { value: 'speed_up', label: 'Speed 2×', emoji: '⏩', description: 'Animasi 2× lebih cepat saat hover (preview cepat)' },
];

const AUTO_DELAY_MS: Record<'headline' | 'body' | 'cta', number> = {
  headline: 0,
  body:     300,
  cta:      600,
};

const AUTO_DURATION_MS = 500;

// ─── Element editor (Tier 2 Full) Constants ───────────────────────

const SLIDE_DIRECTION_OPTIONS: { value: SlideFromDirection; label: string }[] = [
  { value: 'left',   label: '⬅ Left' },
  { value: 'right',  label: '➡ Right' },
  { value: 'top',    label: '⬆ Top' },
  { value: 'bottom', label: '⬇ Bottom' },
];

const POSITION_LABELS: Record<ElementPosition, string> = {
  top_left:        'Top Left',
  top_center:      'Top Center',
  top_right:       'Top Right',
  middle_left:     'Mid Left',
  middle_center:   'Mid Center',
  middle_right:    'Mid Right',
  bottom_left:     'Bot Left',
  bottom_center:   'Bot Center',
  bottom_right:    'Bot Right',
};

const POSITION_GRID: ElementPosition[][] = [
  ['top_left',    'top_center',    'top_right'],
  ['middle_left', 'middle_center', 'middle_right'],
  ['bottom_left', 'bottom_center', 'bottom_right'],
];

const ALL_ANIM_OPTIONS: { value: ElementAnimation; label: string; emoji: string }[] = [
  { value: 'fade_in',     label: 'Fade In',     emoji: '🌫️' },
  { value: 'slide_in',    label: 'Slide In',    emoji: '➡️' },
  { value: 'scale_in',    label: 'Scale In',    emoji: '🔍' },
  { value: 'text_reveal', label: 'Reveal',      emoji: '⌨️' },
  { value: 'pulse',       label: 'Pulse',       emoji: '💗' },
  { value: 'none',        label: 'None',        emoji: '⊘' },
];

const ELEMENT_META: Record<ElementKey, { label: string; emoji: string }> = {
  logo:     { label: 'Logo',     emoji: '🏷️' },
  headline: { label: 'Headline', emoji: '📰' },
  body:     { label: 'Body',     emoji: '📝' },
  cta:      { label: 'CTA',      emoji: '🎯' },
};

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
  /**
   * SESI 6 Sub-Phase 6B — TD-ANIM-101 (22 Mei 2026):
   * Advertiser ID untuk fetch custom fonts. Optional — kalau undefined,
   * Custom font feature di-disable secara graceful (pill Custom hidden,
   * upload modal gak bisa open).
   */
  advertiserId?:   string | null;
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

function getElementOverride(variant: AnimationVariant, field: ElementKey): ElementOverride {
  const custom = variant.element_overrides?.[field];
  const defaults = DEFAULT_ELEMENT_OVERRIDES[field];
  return { ...defaults, ...(custom ?? {}) };
}

/**
 * Template ID → Lucide icon component mapping.
 * Phase 5B Banner Studio V1: Lucide premium icons replacing emoji.
 */
function getTemplateIcon(templateId: string): React.ComponentType<{ className?: string }> {
  switch (templateId) {
    case 'travel-cinematic':   return Plane;
    case 'hotel-premium':      return Building2;
    case 'umkm-energetic':     return ShoppingBag;
    case 'event-festival':     return PartyPopper;
    case 'event-multi-text':   return Megaphone;
    case 'auto-showroom':      return Car;
    default:                   return Sparkles;
  }
}

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
  advertiserId,
}: AnimationBuilderProps) {
  const [activeTemplateId, setActiveTemplateId] = useState<string>('custom');
  const [activeLegacyPresetId, setActiveLegacyPresetId] = useState<string>('custom');

  // SESI 6 Sub-Phase 6B — TD-ANIM-101: Custom font state
  const api = useApi();
  const [customFontsList, setCustomFontsList] = useState<CustomFontRecord[]>([]);
  const [customFontsLoading, setCustomFontsLoading] = useState(false);
  const [customFontsError, setCustomFontsError] = useState<string | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Fetch custom fonts setiap advertiserId berubah
  useEffect(() => {
    if (!advertiserId) {
      setCustomFontsList([]);
      return;
    }
    let cancelled = false;
    setCustomFontsLoading(true);
    setCustomFontsError(null);

    (async () => {
      try {
        const res = await api.get<{ items: CustomFontRecord[]; total: number }>(
          `/admin/ads/fonts?advertiser_id=${encodeURIComponent(advertiserId)}`
        );
        if (cancelled) return;
        setCustomFontsList(res?.items ?? []);
      } catch (err: unknown) {
        if (cancelled) return;
        const msg = err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Gagal load custom fonts';
        setCustomFontsError(msg);
        setCustomFontsList([]);
      } finally {
        if (!cancelled) setCustomFontsLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [advertiserId, api]);

  // Build CustomFontMap untuk pass ke AdAnimatedBanner Live Preview
  const customFontMap: CustomFontMap = useMemo(() => {
    const map: CustomFontMap = {};
    for (const font of customFontsList) {
      map[font.slug] = {
        cssFamily: makeCustomFontCssFamily(font.slug),
        url:       font.public_url,
      };
    }
    return map;
  }, [customFontsList]);

  // Handler upload sukses: prepend ke list (sort by uploaded_at DESC pattern)
  const handleFontUploaded = (font: CustomFontRecord) => {
    setCustomFontsList((prev) => [font, ...prev]);
  };

  // Handler delete font (called from picker popover)
  const handleFontDelete = async (font: CustomFontRecord) => {
    const confirmed = window.confirm(
      `Hapus font "${font.display_name}"?\n\nBanner yang masih reference font ini akan fallback ke 'sans'.`
    );
    if (!confirmed) return;
    try {
      await api.delete(`/admin/ads/fonts/${font.id}`);
      setCustomFontsList((prev) => prev.filter((f) => f.id !== font.id));
    } catch (err: unknown) {
      const msg = err instanceof ApiError
        ? err.message
        : err instanceof Error
          ? err.message
          : 'unknown';
      alert(`Gagal hapus: ${msg}`);
    }
  };

  const timeline = timelineProp ?? buildEmptyTimeline();
  const variants = timeline.variants;

  // ─── Mutate helpers ────────────────────────────────────────────

  const updateTimeline = (patch: Partial<AnimationTimelineConfig>) => {
    onChange({ ...timeline, ...patch });
  };

  const handleTemplateSelect = (templateId: string) => {
    setActiveTemplateId(templateId);
    setActiveLegacyPresetId('custom');
    if (templateId === 'custom') {
      onChange(buildEmptyTimeline());
      return;
    }
    const template = getBannerTemplate(templateId);
    if (!template) return;
    onChange(cloneBannerTemplateTimeline(template));
  };

  const handleLegacyPresetSelect = (presetId: string) => {
    setActiveLegacyPresetId(presetId);
    setActiveTemplateId('custom');
    if (presetId === 'custom') return;
    const preset = getPresetById(presetId);
    if (!preset) return;
    onChange(clonePresetTimeline(preset));
  };

  const replaceVariant = (idx: number, nextVariant: AnimationVariant) => {
    const next = variants.map((v, i) => (i === idx ? nextVariant : v));
    updateTimeline({ variants: next });
    setActiveTemplateId('custom');
    setActiveLegacyPresetId('custom');
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

  const resetVariantElement = (idx: number, field: ElementKey) => {
    const current = variants[idx];
    if (!current || !current.element_overrides) return;
    const nextOverrides = { ...current.element_overrides };
    delete nextOverrides[field];
    replaceVariant(idx, {
      ...current,
      element_overrides: Object.keys(nextOverrides).length > 0 ? nextOverrides : undefined,
    });
  };

  const addVariant = () => {
    if (variants.length >= MAX_VARIANTS) return;
    const next = [...variants, createEmptyVariant(variants.length)];
    updateTimeline({ variants: renumberVariants(next) });
    setActiveTemplateId('custom');
    setActiveLegacyPresetId('custom');
  };

  const removeVariant = (idx: number) => {
    if (variants.length <= MIN_VARIANTS) return;
    const next = renumberVariants(variants.filter((_, i) => i !== idx));
    updateTimeline({ variants: next });
    setActiveTemplateId('custom');
    setActiveLegacyPresetId('custom');
  };

  const moveVariant = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= variants.length) return;
    const next = [...variants];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    updateTimeline({ variants: renumberVariants(next) });
    setActiveTemplateId('custom');
    setActiveLegacyPresetId('custom');
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

  // ─── Active template metadata ──────────────────────────────────

  const activeTemplate = useMemo(
    () => getBannerTemplate(activeTemplateId),
    [activeTemplateId],
  );

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
            {activeTemplate && (
              <>
                <span className="text-purple-600 dark:text-purple-400"> · </span>
                <span className="font-semibold">{activeTemplate.label}</span>
              </>
            )}
            {timeline.loop && (
              <>
                <span className="text-purple-600 dark:text-purple-400"> · </span>
                <span className="font-semibold">Loop</span>
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION A: BANNER TEMPLATE PICKER (cinematic templates)       */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="rounded-lg border-2 border-purple-300 dark:border-purple-700 p-4 bg-gradient-to-br from-purple-50/50 to-amber-50/30 dark:from-purple-950/30 dark:to-amber-950/20">
        <label className="flex items-center gap-2 text-xs font-bold text-purple-900 dark:text-purple-100 mb-3">
          <Film className="w-4 h-4" />
          Banner Template Cinematic (Pilih Cepat)
        </label>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
          {/* Custom Scratch */}
          <button
            type="button"
            onClick={() => handleTemplateSelect('custom')}
            className={cn(
              'p-3 rounded-lg border-2 text-left transition shadow-sm',
              activeTemplateId === 'custom'
                ? 'bg-purple-600 text-white border-purple-700 shadow-md'
                : 'bg-white text-gray-900 border-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700',
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <Wand2 className={cn(
                'w-4 h-4 shrink-0',
                activeTemplateId === 'custom'
                  ? 'text-white'
                  : 'text-purple-600 dark:text-purple-400',
              )} />
              <p className="text-[12px] font-bold">Custom Scratch</p>
            </div>
            <p className={cn(
              'text-[10px] leading-tight',
              activeTemplateId === 'custom'
                ? 'text-purple-100'
                : 'text-gray-600 dark:text-gray-300',
            )}>Bangun dari kosong</p>
          </button>

          {/* Cinematic Templates */}
          {BANNER_TEMPLATES.map((tpl) => {
            const IconComp = getTemplateIcon(tpl.id);
            const isActive = activeTemplateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => handleTemplateSelect(tpl.id)}
                className={cn(
                  'p-3 rounded-lg border-2 text-left transition shadow-sm',
                  isActive
                    ? 'bg-purple-600 text-white border-purple-700 shadow-md ring-2 ring-purple-300 dark:ring-purple-800'
                    : 'bg-white text-gray-900 border-gray-300 hover:border-purple-400 hover:bg-purple-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-600 dark:hover:bg-gray-700',
                )}
                title={tpl.description_id}
              >
                <div className="flex items-center gap-2 mb-1">
                  <IconComp className={cn(
                    'w-4 h-4 shrink-0',
                    isActive
                      ? 'text-white'
                      : 'text-purple-600 dark:text-purple-400',
                  )} />
                  <p className="text-[12px] font-bold leading-tight">
                    {tpl.label}
                  </p>
                </div>
                <p className={cn(
                  'text-[10px] leading-tight line-clamp-2',
                  isActive
                    ? 'text-purple-100'
                    : 'text-gray-600 dark:text-gray-300',
                )}>
                  {tpl.tagline}
                </p>
              </button>
            );
          })}
        </div>

        {activeTemplate && (
          <div className="mt-3 p-3 rounded-md bg-white dark:bg-gray-800 border border-purple-200 dark:border-purple-700 shadow-sm">
            <p className="text-[12px] text-gray-900 dark:text-gray-100">
              <span className="font-bold">{activeTemplate.label}</span>
              <span className="text-purple-600 dark:text-purple-400 mx-1.5">·</span>
              <span className="italic text-gray-700 dark:text-gray-300">{activeTemplate.target_use_case}</span>
            </p>
            <p className="text-[11px] text-gray-600 dark:text-gray-300 mt-1.5 leading-relaxed">
              {activeTemplate.description_id}
            </p>
            {activeTemplate.variant_hints.length > 0 && (
              <details className="mt-2">
                <summary className="text-[11px] font-semibold text-purple-700 dark:text-purple-300 cursor-pointer hover:underline">
                  💡 Hint isi per variant ({activeTemplate.variant_hints.length} scene)
                </summary>
                <ul className="mt-1.5 space-y-1">
                  {activeTemplate.variant_hints.map((hint, i) => (
                    <li key={i} className="text-[11px] text-gray-700 dark:text-gray-300 pl-2 leading-relaxed">
                      <span className="font-bold text-purple-700 dark:text-purple-400">#{i + 1}:</span> {hint}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        {/* Legacy preset picker (kalau admin masih mau pakai preset DCA lama) */}
        <details className="mt-3">
          <summary className="text-[10px] text-purple-700 dark:text-purple-300 cursor-pointer hover:underline">
            Atau pilih preset DCA simpel (legacy)
          </summary>
          <div className="mt-2">
            <select
              value={activeLegacyPresetId}
              onChange={(e) => handleLegacyPresetSelect(e.target.value)}
              className="w-full px-2 py-1.5 rounded-md border border-purple-300 dark:border-purple-800 bg-white dark:bg-gray-900 text-xs text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
            >
              <option value="custom">— Custom —</option>
              {ANIMATION_PRESETS.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.icon} {preset.label}
                </option>
              ))}
            </select>
          </div>
        </details>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION B0: SHARED BACKGROUND (Kumparan-style 1 bg + multi text)*/}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 p-3 bg-amber-50/40 dark:bg-amber-950/20">
        <div className="flex items-start gap-2 mb-2">
          <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <label className="text-[12px] font-bold text-amber-900 dark:text-amber-200">
              📚 Shared Background (Kumparan-style 1 image + multi text)
            </label>
            <p className="text-[10px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
              Upload 1 image → semua variant pakai background ini.
              Bisa di-override per variant (kalau variant.image_url diisi, fallback skip shared).
              <span className="font-semibold"> Cocok untuk event multi-kota, brand consistency.</span>
            </p>
          </div>
        </div>

        <ImageUpload
          bucket="ads"
          maxFiles={1}
          maxSizeMB={0.5}
          existingUrls={timeline.shared_background_url ? [timeline.shared_background_url] : []}
          onUpload={(urls: string[]) => updateTimeline({ shared_background_url: urls[0] ?? null })}
          label="Shared background untuk semua variant"
        />

        {timeline.shared_background_url && (
          <div className="mt-2 flex items-center justify-between p-2 rounded-md bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800">
            <span className="text-[10px] text-amber-900 dark:text-amber-200">
              ✅ Shared background aktif. Variant tanpa image akan pakai ini.
            </span>
            <button
              type="button"
              onClick={() => updateTimeline({ shared_background_url: null })}
              className="text-[10px] font-semibold text-red-600 hover:text-red-700 dark:text-red-400 underline"
            >
              Hapus
            </button>
          </div>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION B: VARIANTS CRUD                                      */}
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
              variantHint={activeTemplate?.variant_hints?.[idx]}
              sharedBackground={timeline.shared_background_url ?? null}
              onChange={(patch) => updateVariant(idx, patch)}
              onChangeElement={(field, patch) => updateVariantElement(idx, field, patch)}
              onResetElement={(field) => resetVariantElement(idx, field)}
              onRemove={() => removeVariant(idx)}
              onMove={(dir) => moveVariant(idx, dir)}
              advertiserId={advertiserId}
              customFontsList={customFontsList}
              customFontMap={customFontMap}
              customFontsLoading={customFontsLoading}
              onOpenUploadModal={() => setUploadModalOpen(true)}
              onDeleteFont={handleFontDelete}
            />
          ))}
        </div>

        <p className="text-[10px] text-text-subtle mt-2">
          Min {MIN_VARIANTS} · Max {MAX_VARIANTS} variant · Durasi {MIN_DURATION_MS/1000}-{MAX_DURATION_MS/1000}s per variant
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION C: TRANSITION                                          */}
      {/* ════════════════════════════════════════════════════════════ */}
      {variants.length >= 2 && (
        <div className="rounded-lg border border-purple-200 dark:border-purple-800 p-3 bg-purple-50/30 dark:bg-purple-950/10">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-purple-900 dark:text-purple-100 mb-2">
            <Film className="w-3.5 h-3.5" />
            Transisi antar Variant
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
      {/* SECTION D: TEXT REVEAL ANIMATION (Global Fallback)            */}
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
          Default animasi semua element. Bisa di-override per field di variant (di inline controls + element editor).
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
      {/* SECTION E: LOOP TOGGLE                                         */}
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
      {/* SECTION E.5: HOVER BEHAVIOR (SESI 6 Phase 6A — TD-ANIM-105)   */}
      {/* ════════════════════════════════════════════════════════════ */}
      <div className="p-3 rounded-md bg-purple-100/40 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
        <div className="flex items-center gap-2 mb-2">
          <MousePointer className="w-3.5 h-3.5 text-purple-700 dark:text-purple-300" />
          <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">
            Hover Behavior
          </p>
          <span className="ml-auto text-[10px] text-purple-600 dark:text-purple-400 italic">
            (desktop only — touch device skip otomatis)
          </span>
        </div>

        {/* Radio pills */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
          {HOVER_BEHAVIOR_OPTIONS.map((opt) => {
            const current = timeline.hover_behavior ?? 'none';
            const isActive = current === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateTimeline({ hover_behavior: opt.value })}
                className={cn(
                  'flex flex-col items-start px-2.5 py-1.5 rounded border-2 transition text-left',
                  isActive
                    ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:border-purple-400'
                )}
                title={opt.description}
              >
                <span className="text-[11px] font-bold flex items-center gap-1">
                  <span className="text-[14px]">{opt.emoji}</span>
                  {opt.label}
                </span>
                <span className={cn(
                  'text-[9px] mt-0.5 leading-tight',
                  isActive ? 'text-purple-100' : 'text-gray-500 dark:text-gray-400'
                )}>
                  {opt.description}
                </span>
              </button>
            );
          })}
        </div>

        {/* Hint kalau aktif */}
        {(timeline.hover_behavior ?? 'none') !== 'none' && (
          <p className="text-[10px] text-amber-700 dark:text-amber-400 mt-2 italic">
            💡 Tip: hover di Live Preview di bawah untuk test (animation harus playing dulu).
          </p>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SECTION F: LIVE PREVIEW                                        */}
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
                    customFonts={customFontMap}
                  />
                </div>
              </div>
            ) : (
              <AdAnimatedBanner
                key={previewKey}
                ad={previewAd}
                width={previewWidth}
                height={previewHeight}
                customFonts={customFontMap}
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

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SESI 6 Sub-Phase 6B — TD-ANIM-101: Custom Font Upload Modal  */}
      {/* ════════════════════════════════════════════════════════════ */}
      {advertiserId && (
        <CustomFontUploadModal
          open={uploadModalOpen}
          advertiserId={advertiserId}
          onClose={() => setUploadModalOpen(false)}
          onUploaded={handleFontUploaded}
        />
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: VariantEditor
// ════════════════════════════════════════════════════════════════

interface VariantEditorProps {
  variant:           AnimationVariant;
  index:             number;
  totalVariants:     number;
  variantHint?:      string;
  sharedBackground?: string | null;
  onChange:          (patch: Partial<AnimationVariant>) => void;
  onChangeElement:   (field: ElementKey, patch: Partial<ElementOverride>) => void;
  onResetElement:    (field: ElementKey) => void;
  onRemove:          () => void;
  onMove:            (direction: 'up' | 'down') => void;
  // SESI 6 Sub-Phase 6B — TD-ANIM-101: custom font infra (passthrough ke FieldWithInlineControls)
  advertiserId?:        string | null;
  customFontsList:      CustomFontRecord[];
  customFontMap:        CustomFontMap;
  customFontsLoading:   boolean;
  onOpenUploadModal:    () => void;
  onDeleteFont:         (font: CustomFontRecord) => Promise<void>;
}

function VariantEditor({
  variant,
  index,
  totalVariants,
  variantHint,
  sharedBackground,
  onChange,
  onChangeElement,
  onResetElement,
  onRemove,
  onMove,
  advertiserId,
  customFontsList,
  customFontMap,
  customFontsLoading,
  onOpenUploadModal,
  onDeleteFont,
}: VariantEditorProps) {
  const [showAdvanced, setShowAdvanced]   = useState(false);
  const [showOverrideBg, setShowOverrideBg] = useState(false);
  const [activeFieldTab, setActiveFieldTab] = useState<'headline' | 'body' | 'cta'>('headline');

  const headlineOverride = getElementOverride(variant, 'headline');
  const bodyOverride     = getElementOverride(variant, 'body');
  const ctaOverride      = getElementOverride(variant, 'cta');

  const overriddenCount = variant.element_overrides
    ? Object.keys(variant.element_overrides).length
    : 0;

  // Auto-show override bg kalau variant.image_url udah ada (admin sudah upload sebelumnya)
  const shouldShowOverrideBg = showOverrideBg || !!variant.image_url;
  const hasSharedBg          = !!sharedBackground;

  // Field tab indicators
  const fieldHasValue: Record<'headline' | 'body' | 'cta', boolean> = {
    headline: !!variant.headline,
    body:     !!variant.body,
    cta:      !!variant.cta_text,
  };

  return (
    <div className="p-3 rounded-md border border-purple-200 dark:border-purple-700 bg-white dark:bg-gray-800 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <span className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-100">
          <Film className="w-3.5 h-3.5" />
          Variant #{index + 1}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => onMove('up')} disabled={index === 0}
            className={cn('p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition',
              index === 0 && 'opacity-30 cursor-not-allowed')} title="Pindah ke atas">
            <ArrowUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
          </button>
          <button type="button" onClick={() => onMove('down')} disabled={index === totalVariants - 1}
            className={cn('p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition',
              index === totalVariants - 1 && 'opacity-30 cursor-not-allowed')} title="Pindah ke bawah">
            <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
          </button>
          <button type="button" onClick={onRemove} disabled={totalVariants <= MIN_VARIANTS}
            className={cn('p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition',
              totalVariants <= MIN_VARIANTS && 'opacity-30 cursor-not-allowed')}
            title={totalVariants <= MIN_VARIANTS ? `Min ${MIN_VARIANTS} variant` : 'Hapus variant'}>
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      {/* Template hint */}
      {variantHint && (
        <div className="mb-3 p-2 rounded bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <p className="text-[11px] text-amber-900 dark:text-amber-200">
            <span className="font-bold">💡 Hint Template:</span> {variantHint}
          </p>
        </div>
      )}

      {/* Background image — Conditional logic based on shared bg presence */}
      <div className="mb-3">
        {hasSharedBg ? (
          // Shared bg ACTIVE — hide upload by default, allow override expansion
          <div className="rounded-md border border-amber-200 dark:border-amber-700 bg-amber-50/40 dark:bg-amber-950/20 p-2.5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[11px] text-amber-900 dark:text-amber-200">
                <Layers className="w-3.5 h-3.5" />
                <span className="font-semibold">Pakai Shared Background</span>
                {variant.image_url && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold">
                    Override aktif
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowOverrideBg(!shouldShowOverrideBg)}
                className="flex items-center gap-1 text-[10px] font-semibold text-purple-700 dark:text-purple-300 hover:underline"
              >
                {shouldShowOverrideBg ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Tutup override
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Override bg variant ini
                  </>
                )}
              </button>
            </div>

            {shouldShowOverrideBg && (
              <div className="mt-2.5 pt-2.5 border-t border-amber-200 dark:border-amber-800">
                <p className="text-[10px] text-amber-800 dark:text-amber-300 mb-1.5 italic">
                  Upload image khusus variant ini (akan override Shared Background).
                </p>
                <ImageUpload
                  bucket="ads"
                  maxFiles={1}
                  maxSizeMB={0.5}
                  existingUrls={variant.image_url ? [variant.image_url] : []}
                  onUpload={(urls: string[]) => onChange({ image_url: urls[0] ?? '' })}
                  label={`Variant #${index + 1} background override`}
                />
                {variant.image_url && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({ image_url: '' });
                      setShowOverrideBg(false);
                    }}
                    className="mt-1.5 text-[10px] text-red-600 dark:text-red-400 hover:underline font-semibold"
                  >
                    Hapus override (kembali ke Shared)
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          // No shared bg — show standard upload
          <>
            <label className="block text-[11px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
              <ImageIcon className="w-3 h-3 inline mr-1" />
              Background Image <span className="text-red-500">*</span>
            </label>
            <ImageUpload
              bucket="ads"
              maxFiles={1}
              maxSizeMB={0.5}
              existingUrls={variant.image_url ? [variant.image_url] : []}
              onUpload={(urls: string[]) => onChange({ image_url: urls[0] ?? '' })}
              label={`Variant #${index + 1} background`}
            />
          </>
        )}
      </div>

      {/* ──────────────────────────────────────────────────────────── */}
      {/* TAB-STYLE FIELD SELECTOR (Headline / Body / CTA)            */}
      {/* ──────────────────────────────────────────────────────────── */}
      <div className="mb-3">
        <div className="flex items-center gap-0 border-b-2 border-purple-200 dark:border-purple-700">
          {(['headline', 'body', 'cta'] as const).map((tab) => {
            const isActive   = activeFieldTab === tab;
            const hasValue   = fieldHasValue[tab];
            const labelMap   = { headline: 'Headline', body: 'Body', cta: 'CTA Text' };
            const requiredMap = { headline: true, body: false, cta: false };
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFieldTab(tab)}
                className={cn(
                  'flex-1 px-3 py-2 text-[11px] font-bold transition border-b-2 -mb-[2px] flex items-center justify-center gap-1.5',
                  isActive
                    ? 'border-purple-600 text-purple-700 dark:text-purple-300 bg-purple-50/50 dark:bg-purple-900/20'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50/30 dark:hover:bg-purple-900/10',
                )}
              >
                <span>{labelMap[tab]}</span>
                {requiredMap[tab] && (
                  <span className="text-red-500 text-[10px]">*</span>
                )}
                {hasValue && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" title="Sudah diisi" />
                )}
              </button>
            );
          })}
        </div>

        {/* Tab content — render only active field */}
        <div className="mt-3">
          {activeFieldTab === 'headline' && (
            <FieldWithInlineControls
              fieldType="headline"
              label="Headline"
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
              advertiserId={advertiserId}
              customFontsList={customFontsList}
              customFontMap={customFontMap}
              customFontsLoading={customFontsLoading}
              onOpenUploadModal={onOpenUploadModal}
              onDeleteFont={onDeleteFont}
            />
          )}
          {activeFieldTab === 'body' && (
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
              advertiserId={advertiserId}
              customFontsList={customFontsList}
              customFontMap={customFontMap}
              customFontsLoading={customFontsLoading}
              onOpenUploadModal={onOpenUploadModal}
              onDeleteFont={onDeleteFont}
            />
          )}
          {activeFieldTab === 'cta' && (
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
              advertiserId={advertiserId}
              customFontsList={customFontsList}
              customFontMap={customFontMap}
              customFontsLoading={customFontsLoading}
              onOpenUploadModal={onOpenUploadModal}
              onDeleteFont={onDeleteFont}
            />
          )}
        </div>
      </div>

      {/* Durasi */}
      <div className="mb-3">
        <label className="block text-[11px] font-semibold text-gray-900 dark:text-gray-100 mb-1">
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
            className="w-20 px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none text-center"
          />
          <span className="text-[11px] text-gray-600 dark:text-gray-300">
            detik ({MIN_DURATION_MS / 1000}-{MAX_DURATION_MS / 1000}s)
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* ADVANCED ELEMENT EDITOR (Tier 2 Full collapsible)          */}
      {/* ────────────────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-purple-200 dark:border-purple-800 pt-3">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center justify-between w-full px-2 py-1.5 rounded-md bg-purple-50 dark:bg-purple-950/30 hover:bg-purple-100 dark:hover:bg-purple-900/40 transition"
        >
          <span className="flex items-center gap-2 text-[11px] font-bold text-purple-900 dark:text-purple-200">
            <Settings2 className="w-3.5 h-3.5" />
            Element Editor — Logo + advanced fine-tune
            {overriddenCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-purple-600 text-white text-[9px] font-bold">
                {overriddenCount} override
              </span>
            )}
          </span>
          {showAdvanced ? (
            <ChevronUp className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
          )}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-3">
            <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 italic">
              💎 Editor element granular: 9-anchor position, slide direction, fine-tune delay/duration.
              Logo dikontrol di sini (gak ada inline section di atas).
            </p>
            {(['logo', 'headline', 'body', 'cta'] as ElementKey[]).map((key) => (
              <ElementAdvancedEditor
                key={key}
                elementKey={key}
                override={getElementOverride(variant, key)}
                isOverridden={!!variant.element_overrides?.[key]}
                onChange={(patch) => onChangeElement(key, patch)}
                onReset={() => onResetElement(key)}
              />
            ))}
          </div>
        )}
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
  // SESI 6 Sub-Phase 6B — TD-ANIM-101: custom font infra
  advertiserId?:        string | null;
  customFontsList:      CustomFontRecord[];
  customFontMap:        CustomFontMap;
  customFontsLoading:   boolean;
  onOpenUploadModal:    () => void;
  onDeleteFont:         (font: CustomFontRecord) => Promise<void>;
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
  advertiserId,
  customFontsList,
  customFontMap,
  customFontsLoading,
  onOpenUploadModal,
  onDeleteFont,
}: FieldWithInlineControlsProps) {
  const currentHorizontal: HorizontalPosition = fromEnginePosition(override.position);
  const currentFont   = override.font_family ?? 'sans';
  const currentWeight = override.font_weight ?? 'bold';

  // SESI 6 Phase 6A — TD-ANIM-104: text effects computed state
  const currentShadow:   TextShadow         = override.text_shadow   ?? 'none';
  const currentStroke:   TextStroke         = override.text_stroke   ?? 'none';
  const currentGradient: TextGradientConfig = override.text_gradient ?? DEFAULT_TEXT_GRADIENT;
  const gradientOn = currentGradient.enabled;

  // Helper untuk update gradient sub-fields tanpa break shape
  const updateGradient = (patch: Partial<TextGradientConfig>) =>
    onChangeElement({ text_gradient: { ...currentGradient, ...patch } });

  return (
    <div className="rounded-md border border-purple-300 dark:border-purple-700 p-3 bg-white dark:bg-gray-800 shadow-sm">
      <label className="block text-[11px] font-bold text-gray-900 dark:text-gray-100 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
        {required && minLength && <span className="text-gray-500 dark:text-gray-400 ml-1 font-normal">(min {minLength} char)</span>}
        {optional && <span className="text-gray-500 dark:text-gray-400 ml-1 font-normal">(opsional)</span>}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChangeText(e.target.value)}
        maxLength={maxLength}
        placeholder={placeholder}
        className="w-full px-2.5 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
      />
      {required && (
        <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">{value.length}/{maxLength} karakter</p>
      )}

      {/* COMPACT CONTROLS — 2 rows max */}
      <div className="mt-2.5 space-y-2 pl-2 border-l-2 border-purple-300 dark:border-purple-700">

        {/* ROW 1: Position + Size + Animation (dropdown) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Position pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Pos</span>
            <div className="flex">
              {POSITION_OPTIONS.map((opt, i) => (
                <button key={opt.value} type="button"
                  onClick={() => onChangeElement({ position: toEnginePosition(fieldType, opt.value) })}
                  className={cn('px-2 py-1 text-[10px] border-y border-r transition',
                    i === 0 && 'border-l rounded-l',
                    i === POSITION_OPTIONS.length - 1 && 'rounded-r',
                    currentHorizontal === opt.value
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Size pills */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Size</span>
            <div className="flex">
              {sizeOptions.map((opt, i) => (
                <button key={opt.value} type="button"
                  onClick={() => onChangeElement({ text_size: opt.value })}
                  className={cn('px-1.5 py-1 text-[10px] border-y border-r transition font-bold min-w-[28px]',
                    i === 0 && 'border-l rounded-l',
                    i === sizeOptions.length - 1 && 'rounded-r',
                    override.text_size === opt.value
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600')}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Animation dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Anim</span>
            <select
              value={override.animation}
              onChange={(e) => onChangeElement({
                animation:   e.target.value as ElementAnimation,
                delay_ms:    AUTO_DELAY_MS[fieldType],
                duration_ms: AUTO_DURATION_MS,
              })}
              className="px-2 py-1 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-purple-500 focus:outline-none font-medium"
            >
              {animOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ROW 2: Font Family + Weight (compact) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Font Family — extended w/ custom fonts (SESI 6 TD-101) */}
          <div className="flex items-center gap-1.5">
            <Type className="w-3 h-3 text-purple-700 dark:text-purple-300" />
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Font</span>
            <select
              value={currentFont}
              onChange={(e) => {
                const val = e.target.value;
                if (val === '__upload__') {
                  // Sentinel: open upload modal, don't change actual font
                  if (advertiserId) onOpenUploadModal();
                  return;
                }
                onChangeElement({ font_family: val as FontFamily });
              }}
              className="px-2 py-1 text-[10px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-purple-500 focus:outline-none font-medium max-w-[180px]"
            >
              <optgroup label="Built-in">
                {FONT_FAMILY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} style={{ fontFamily: opt.fontFamily }}>
                    {opt.label}
                  </option>
                ))}
              </optgroup>
              {advertiserId && customFontsList.length > 0 && (
                <optgroup label={`Custom (${customFontsList.length})`}>
                  {customFontsList.map((font) => (
                    <option
                      key={font.id}
                      value={`custom:${font.slug}`}
                      style={{ fontFamily: `'${makeCustomFontCssFamily(font.slug)}', sans-serif` }}
                    >
                      📁 {font.display_name}
                    </option>
                  ))}
                </optgroup>
              )}
              {advertiserId && (
                <optgroup label="Actions">
                  <option value="__upload__">
                    {customFontsLoading ? '⏳ Loading fonts…' : '➕ Upload custom font…'}
                  </option>
                </optgroup>
              )}
            </select>
            {/* Live font preview Aa */}
            <span
              className="px-2 py-0.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 min-w-[28px] text-center"
              style={(() => {
                // Custom font: build inline style from map
                if (typeof currentFont === 'string' && currentFont.startsWith('custom:')) {
                  const slug = currentFont.slice(7);
                  const entry = customFontMap[slug];
                  return {
                    fontFamily: entry ? `'${entry.cssFamily}', sans-serif` : 'sans-serif',
                    fontWeight: FONT_WEIGHT_OPTIONS.find((o) => o.value === currentWeight)?.weight,
                  };
                }
                // Preset: lookup FONT_FAMILY_OPTIONS
                return {
                  fontFamily: FONT_FAMILY_OPTIONS.find((o) => o.value === currentFont)?.fontFamily,
                  fontWeight: FONT_WEIGHT_OPTIONS.find((o) => o.value === currentWeight)?.weight,
                };
              })()}
              title="Live font preview"
            >
              Aa
            </span>
            {/* Delete button — only when current is custom font (SESI 6 TD-101) */}
            {typeof currentFont === 'string' && currentFont.startsWith('custom:') && (() => {
              const slug = currentFont.slice(7);
              const target = customFontsList.find((f) => f.slug === slug);
              if (!target) return null;
              return (
                <button
                  type="button"
                  onClick={async () => {
                    await onDeleteFont(target);
                    // After delete, reset element font to 'sans' to avoid stale custom: ref
                    onChangeElement({ font_family: 'sans' });
                  }}
                  className="p-1 rounded text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30"
                  title={`Hapus font "${target.display_name}"`}
                  aria-label={`Hapus font ${target.display_name}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              );
            })()}
          </div>

          {/* Font Weight */}
          <div className="flex items-center gap-1.5">
            <Bold className="w-3 h-3 text-purple-700 dark:text-purple-300" />
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Wt</span>
            <div className="flex">
              {FONT_WEIGHT_OPTIONS.map((opt, i) => (
                <button key={opt.value} type="button"
                  onClick={() => onChangeElement({ font_weight: opt.value })}
                  className={cn('px-1.5 py-1 text-[10px] border-y border-r transition min-w-[34px]',
                    i === 0 && 'border-l rounded-l',
                    i === FONT_WEIGHT_OPTIONS.length - 1 && 'rounded-r',
                    currentWeight === opt.value
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600')}
                  style={{ fontWeight: opt.weight }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ROW 3: Color + Backdrop (kompak swatch row) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {/* Text Color */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Color</span>
            <div className="flex gap-0.5">
              {COLOR_PALETTE.map((c) => (
                <button key={c.value} type="button"
                  onClick={() => onChangeElement({ text_color: c.value })}
                  className={cn('w-5 h-5 rounded border-2 transition',
                    override.text_color === c.value
                      ? 'border-purple-600 ring-1 ring-purple-300 dark:ring-purple-700 scale-110 shadow-sm'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400')}
                  style={{ backgroundColor: c.swatch }}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {/* Backdrop */}
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">BG</span>
            <div className="flex gap-0.5">
              <button type="button"
                onClick={() => onChangeElement({ background_tint: 'none' })}
                className={cn('w-5 h-5 rounded border-2 transition relative overflow-hidden',
                  override.background_tint === 'none'
                    ? 'border-purple-600 ring-1 ring-purple-300 dark:ring-purple-700 scale-110 shadow-sm'
                    : 'border-gray-300 dark:border-gray-600 hover:border-purple-400')}
                title="None — Transparent"
                style={{ background: 'repeating-linear-gradient(45deg, #fff 0 3px, #ccc 3px 6px)' }}>
                <span className="absolute inset-0 flex items-center justify-center text-[7px] font-bold text-gray-800">⊘</span>
              </button>
              {COLOR_PALETTE.map((c) => (
                <button key={c.value} type="button"
                  onClick={() => onChangeElement({ background_tint: c.value })}
                  className={cn('w-5 h-5 rounded border-2 transition',
                    override.background_tint === c.value
                      ? 'border-purple-600 ring-1 ring-purple-300 dark:ring-purple-700 scale-110 shadow-sm'
                      : 'border-gray-300 dark:border-gray-600 hover:border-purple-400')}
                  style={{ backgroundColor: c.swatch, opacity: 0.85 }}
                  title={`Backdrop ${c.label}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════
            ROW 4 (SESI 6 Phase 6A — TD-ANIM-104):
            Text Effects — Shadow + Stroke + Gradient toggle
            ═══════════════════════════════════════════════════════════ */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1.5 border-t border-purple-100 dark:border-purple-800">

          {/* Shadow pills */}
          <div className="flex items-center gap-1.5">
            <Sun className="w-3 h-3 text-purple-700 dark:text-purple-300" />
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Shadow</span>
            <div className="flex">
              {TEXT_SHADOW_OPTIONS.map((opt, i) => (
                <button key={opt.value} type="button"
                  onClick={() => onChangeElement({ text_shadow: opt.value })}
                  className={cn('px-1.5 py-1 text-[10px] border-y border-r transition min-w-[34px] font-bold',
                    i === 0 && 'border-l rounded-l',
                    i === TEXT_SHADOW_OPTIONS.length - 1 && 'rounded-r',
                    currentShadow === opt.value
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600')}
                  title={`Shadow ${opt.label}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stroke pills */}
          <div className="flex items-center gap-1.5">
            <Square className="w-3 h-3 text-purple-700 dark:text-purple-300" />
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Stroke</span>
            <div className="flex">
              {TEXT_STROKE_OPTIONS.map((opt, i) => (
                <button key={opt.value} type="button"
                  onClick={() => onChangeElement({ text_stroke: opt.value })}
                  className={cn('px-1.5 py-1 text-[10px] border-y border-r transition min-w-[34px] font-bold',
                    i === 0 && 'border-l rounded-l',
                    i === TEXT_STROKE_OPTIONS.length - 1 && 'rounded-r',
                    currentStroke === opt.value
                      ? 'bg-purple-600 text-white border-purple-700'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-purple-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600')}
                  title={`Stroke ${opt.thickness}`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gradient toggle */}
          <div className="flex items-center gap-1.5">
            <Palette className="w-3 h-3 text-purple-700 dark:text-purple-300" />
            <span className="text-[10px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wide">Gradient</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={gradientOn}
                onChange={(e) => updateGradient({ enabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-7 h-4 bg-gray-300 dark:bg-gray-600 peer-checked:bg-purple-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all" />
            </label>
          </div>
        </div>

        {/* Gradient sub-controls — hanya muncul saat enabled (conditional power) */}
        {gradientOn && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pl-3 ml-1 border-l-2 border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-900/20 py-1.5 rounded-r">
            {/* From color swatch */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">From</span>
              <div className="flex gap-0.5">
                {COLOR_PALETTE.map((c) => (
                  <button key={`from-${c.value}`} type="button"
                    onClick={() => updateGradient({ from_color: c.value })}
                    className={cn('w-4 h-4 rounded border-2 transition',
                      currentGradient.from_color === c.value
                        ? 'border-amber-600 ring-1 ring-amber-300 dark:ring-amber-700 scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:border-amber-400')}
                    style={{ backgroundColor: c.swatch }}
                    title={`From ${c.label}`}
                  />
                ))}
              </div>
            </div>

            {/* Arrow indicator */}
            <span className="text-amber-600 dark:text-amber-400 font-bold text-[12px]">→</span>

            {/* To color swatch */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">To</span>
              <div className="flex gap-0.5">
                {COLOR_PALETTE.map((c) => (
                  <button key={`to-${c.value}`} type="button"
                    onClick={() => updateGradient({ to_color: c.value })}
                    className={cn('w-4 h-4 rounded border-2 transition',
                      currentGradient.to_color === c.value
                        ? 'border-amber-600 ring-1 ring-amber-300 dark:ring-amber-700 scale-110'
                        : 'border-gray-300 dark:border-gray-600 hover:border-amber-400')}
                    style={{ backgroundColor: c.swatch }}
                    title={`To ${c.label}`}
                  />
                ))}
              </div>
            </div>

            {/* Direction pills */}
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase">Dir</span>
              <div className="flex">
                {GRADIENT_DIRECTION_OPTIONS.map((opt, i) => (
                  <button key={opt.value} type="button"
                    onClick={() => updateGradient({ direction: opt.value })}
                    className={cn('px-1.5 py-0.5 text-[11px] border-y border-r transition font-bold',
                      i === 0 && 'border-l rounded-l',
                      i === GRADIENT_DIRECTION_OPTIONS.length - 1 && 'rounded-r',
                      currentGradient.direction === opt.value
                        ? 'bg-amber-600 text-white border-amber-700'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-amber-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600')}
                    title={`Direction ${opt.label}`}>
                    {opt.arrow}
                  </button>
                ))}
              </div>
            </div>

            {/* Live gradient preview swatch */}
            <div
              className="px-2 py-0.5 rounded text-[11px] font-black border border-amber-300 dark:border-amber-700"
              style={{
                backgroundImage: `linear-gradient(${
                  currentGradient.direction === 'to_right'        ? 'to right' :
                  currentGradient.direction === 'to_bottom'       ? 'to bottom' :
                  currentGradient.direction === 'to_bottom_right' ? 'to bottom right' :
                  currentGradient.direction === 'to_top_right'    ? 'to top right' :
                  '135deg'
                }, ${TEXT_COLOR_MAP[currentGradient.from_color]}, ${TEXT_COLOR_MAP[currentGradient.to_color]})`,
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                WebkitTextFillColor: 'transparent',
                minWidth: '36px',
                textAlign: 'center',
              } as React.CSSProperties}
              title="Live gradient preview"
            >
              Aa
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: ElementAdvancedEditor (Tier 2 Full advanced)
// ════════════════════════════════════════════════════════════════

interface ElementAdvancedEditorProps {
  elementKey:   ElementKey;
  override:     ElementOverride;
  isOverridden: boolean;
  onChange:     (patch: Partial<ElementOverride>) => void;
  onReset:      () => void;
}

function ElementAdvancedEditor({
  elementKey,
  override,
  isOverridden,
  onChange,
  onReset,
}: ElementAdvancedEditorProps) {
  const meta = ELEMENT_META[elementKey];

  return (
    <div className={cn(
      'rounded-md border p-2.5 transition',
      isOverridden
        ? 'border-purple-400 bg-purple-50/50 dark:bg-purple-900/20'
        : 'border-gray-200 bg-gray-50/50 dark:border-gray-700 dark:bg-gray-800/30',
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] font-bold text-gray-900 dark:text-gray-100">
          {meta.emoji} {meta.label}
          {isOverridden && (
            <span className="ml-1.5 text-[9px] font-medium text-purple-600 dark:text-purple-400">· customized</span>
          )}
        </span>
        <div className="flex items-center gap-2">
          {isOverridden && (
            <button type="button" onClick={onReset}
              className="flex items-center gap-0.5 text-[9px] font-medium text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400">
              <RotateCcw className="w-2.5 h-2.5" />
              Reset
            </button>
          )}
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={override.visible}
              onChange={(e) => onChange({ visible: e.target.checked })}
              className="sr-only peer" />
            <div className="w-7 h-4 bg-gray-300 dark:bg-gray-600 peer-checked:bg-purple-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all" />
          </label>
        </div>
      </div>

      {!override.visible ? (
        <p className="text-[10px] italic text-gray-500 dark:text-gray-400">
          Element disembunyikan di variant ini.
        </p>
      ) : (
        <div className="space-y-2">
          {/* Animation full palette */}
          <div>
            <label className="block text-[9px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Animation</label>
            <select value={override.animation}
              onChange={(e) => onChange({ animation: e.target.value as ElementAnimation })}
              className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-purple-500 focus:outline-none">
              {ALL_ANIM_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.emoji} {opt.label}</option>
              ))}
            </select>
          </div>

          {/* Slide direction (kalau slide_in) */}
          {override.animation === 'slide_in' && (
            <div>
              <label className="block text-[9px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Slide Direction</label>
              <div className="grid grid-cols-4 gap-1">
                {SLIDE_DIRECTION_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button"
                    onClick={() => onChange({ slide_from: opt.value })}
                    className={cn('px-1.5 py-1 text-[10px] rounded border transition',
                      (override.slide_from ?? 'left') === opt.value
                        ? 'bg-purple-600 text-white border-purple-700'
                        : 'bg-white text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700')}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delay + Duration */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Delay (ms)</label>
              <input type="number" value={override.delay_ms} min={0} max={5000} step={100}
                onChange={(e) => onChange({ delay_ms: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-purple-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Duration (ms)</label>
              <input type="number" value={override.duration_ms} min={100} max={3000} step={100}
                onChange={(e) => onChange({ duration_ms: Math.max(100, parseInt(e.target.value, 10) || 500) })}
                className="w-full px-2 py-1 text-[11px] rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-purple-500 focus:outline-none" />
            </div>
          </div>

          {/* Position 9-grid picker */}
          <div>
            <label className="block text-[9px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">
              Position ({POSITION_LABELS[override.position]})
            </label>
            <div className="inline-grid grid-cols-3 gap-1 p-2 rounded-md bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              {POSITION_GRID.map((row) => row.map((pos) => (
                <button key={pos} type="button"
                  onClick={() => onChange({ position: pos })}
                  className={cn('w-7 h-7 rounded border-2 transition flex items-center justify-center',
                    override.position === pos
                      ? 'bg-purple-600 border-purple-700 text-white'
                      : 'bg-white border-gray-300 hover:border-purple-400 dark:bg-gray-800 dark:border-gray-600')}
                  title={POSITION_LABELS[pos]}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                </button>
              )))}
            </div>
          </div>

          {/* Color + Backdrop (kompak) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Color</label>
              <div className="flex gap-1 flex-wrap">
                {COLOR_PALETTE.map((c) => (
                  <button key={c.value} type="button"
                    onClick={() => onChange({ text_color: c.value })}
                    className={cn('w-5 h-5 rounded border-2 transition',
                      override.text_color === c.value
                        ? 'border-purple-600 ring-1 ring-purple-300 scale-110'
                        : 'border-gray-300 dark:border-gray-700 hover:border-purple-400')}
                    style={{ backgroundColor: c.swatch }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[9px] font-semibold text-gray-700 dark:text-gray-300 mb-0.5">Backdrop</label>
              <div className="flex gap-1 flex-wrap">
                <button type="button"
                  onClick={() => onChange({ background_tint: 'none' })}
                  className={cn('w-5 h-5 rounded border-2 transition relative overflow-hidden',
                    override.background_tint === 'none'
                      ? 'border-purple-600 ring-1 ring-purple-300 scale-110'
                      : 'border-gray-300 dark:border-gray-700')}
                  style={{ background: 'repeating-linear-gradient(45deg, #fff 0 3px, #ddd 3px 6px)' }}
                  title="None" />
                {COLOR_PALETTE.map((c) => (
                  <button key={c.value} type="button"
                    onClick={() => onChange({ background_tint: c.value })}
                    className={cn('w-5 h-5 rounded border-2 transition',
                      override.background_tint === c.value
                        ? 'border-purple-600 ring-1 ring-purple-300 scale-110'
                        : 'border-gray-300 dark:border-gray-700')}
                    style={{ backgroundColor: c.swatch, opacity: 0.85 }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

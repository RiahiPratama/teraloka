'use client';

/**
 * TeraLoka — AnimationBuilder (Generic Controlled Component)
 * SESI 5H Phase 5A.7 (21 Mei 2026) — Per-Position Animation Refactor
 * ────────────────────────────────────────────────────────────────
 * PATH: src/components/admin/ads/AnimationBuilder.tsx
 *
 * Generic reusable builder untuk GSAP animation timeline.
 * Controlled component (state lifted ke parent via props).
 *
 * Use cases:
 *   - PositionCreativeModal tab 3 "Animated" (per-position config)
 *   - Future standalone preview pages
 *
 * Refactor source: AdFormSectionAnimation.tsx (Phase 5A.4) — diextract
 * jadi generic biar reusable per-position. Logic builder 80% same.
 *
 * Props design:
 *   - timeline: current timeline (atau null untuk init empty)
 *   - onChange: callback (newTimeline) => void
 *   - previewContext: data dari form lain untuk live preview (title, body, etc)
 *   - previewWidth/Height: dimensi preview banner sesuai position
 *
 * Pattern: Fully controlled — gak pakai useAdForm langsung.
 *          Parent yang sync ke AdFormProvider state.
 * ────────────────────────────────────────────────────────────────
 */

import { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Eye,
  Wand2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  ANIMATION_PRESETS,
  getPresetById,
  clonePresetTimeline,
} from '@/lib/ads/animation-presets';
import AdAnimatedBanner, {
  type AnimationTimelineConfig,
  type AnimationStep,
  type AnimationPattern,
  type AnimatedBannerAd,
} from '@/components/public/ads/AdAnimatedBanner';

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const TARGET_OPTIONS = [
  { value: '.logo',     label: 'Logo Advertiser'    },
  { value: '.headline', label: 'Headline (Judul)'   },
  { value: '.body',     label: 'Body (Deskripsi)'   },
  { value: '.cta',      label: 'CTA Button'         },
] as const;

const PATTERN_OPTIONS: { value: AnimationPattern; label: string; description: string }[] = [
  { value: 'fade_in',       label: 'Fade In',         description: 'Muncul perlahan transparan → jelas'    },
  { value: 'fade_out',      label: 'Fade Out',        description: 'Hilang perlahan jelas → transparan'    },
  { value: 'slide_in',      label: 'Slide In',        description: 'Geser masuk dari arah tertentu'        },
  { value: 'text_reveal',   label: 'Text Reveal',     description: 'Tulisan muncul huruf-per-huruf'        },
  { value: 'scale',         label: 'Scale (Zoom In)', description: 'Membesar subtle 0.8 → 1.0'             },
  { value: 'stagger_group', label: 'Stagger Group',   description: 'Multi-elemen muncul berurutan (children)' },
];

const SLIDE_FROM_OPTIONS = [
  { value: 'left',   label: 'Dari Kiri'    },
  { value: 'right',  label: 'Dari Kanan'   },
  { value: 'top',    label: 'Dari Atas'    },
  { value: 'bottom', label: 'Dari Bawah'   },
] as const;

const TEXT_REVEAL_UNIT_OPTIONS = [
  { value: 'char', label: 'Per Karakter (smooth)' },
  { value: 'word', label: 'Per Kata (cepat)'      },
] as const;

const EMPTY_TIMELINE: AnimationTimelineConfig = {
  duration_ms: 2000,
  loop:        false,
  steps:       [],
};

const NEW_STEP_DEFAULT: AnimationStep = {
  target_selector: '.headline',
  pattern:         'fade_in',
  delay:           0,
  duration:        500,
};

// ════════════════════════════════════════════════════════════════
// PREVIEW CONTEXT — Data from outer form untuk live preview
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
  /** Current timeline (null = empty initial state) */
  timeline: AnimationTimelineConfig | null;
  /** Callback saat timeline berubah */
  onChange: (timeline: AnimationTimelineConfig) => void;
  /** Data dari outer form untuk preview render */
  previewContext: PreviewContext;
  /** Preview dimensions (default MPU 300×250) */
  previewWidth?:  number;
  previewHeight?: number;
  /** Optional error message untuk display di top */
  errorMessage?: string;
}

// ════════════════════════════════════════════════════════════════
// HELPERS
// ════════════════════════════════════════════════════════════════

function computeTotalDuration(steps: AnimationStep[]): number {
  if (steps.length === 0) return 0;
  return Math.max(...steps.map((s) => s.delay + s.duration));
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function AnimationBuilder({
  timeline: timelineProp,
  onChange,
  previewContext,
  previewWidth  = 300,
  previewHeight = 250,
  errorMessage,
}: AnimationBuilderProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('custom');

  // Derived: current timeline (atau EMPTY kalau null)
  const timeline = timelineProp ?? EMPTY_TIMELINE;

  // ─── Helpers untuk mutate timeline ─────────────────────────────

  const updateTimeline = (next: AnimationTimelineConfig) => {
    onChange(next);
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    if (presetId === 'custom') return;
    const preset = getPresetById(presetId);
    if (!preset) return;
    updateTimeline(clonePresetTimeline(preset));
  };

  const handleAddStep = () => {
    const nextSteps = [...timeline.steps, { ...NEW_STEP_DEFAULT }];
    updateTimeline({
      ...timeline,
      steps:       nextSteps,
      duration_ms: computeTotalDuration(nextSteps),
    });
    setSelectedPresetId('custom');
  };

  const handleRemoveStep = (index: number) => {
    const nextSteps = timeline.steps.filter((_, i) => i !== index);
    updateTimeline({
      ...timeline,
      steps:       nextSteps,
      duration_ms: computeTotalDuration(nextSteps),
    });
    setSelectedPresetId('custom');
  };

  const handleUpdateStep = (index: number, field: keyof AnimationStep, value: any) => {
    const nextSteps = timeline.steps.map((step, i) =>
      i === index ? { ...step, [field]: value } : step,
    );
    updateTimeline({
      ...timeline,
      steps:       nextSteps,
      duration_ms: computeTotalDuration(nextSteps),
    });
    setSelectedPresetId('custom');
  };

  const handleMoveStep = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= timeline.steps.length) return;

    const nextSteps = [...timeline.steps];
    [nextSteps[index], nextSteps[newIndex]] = [nextSteps[newIndex], nextSteps[index]];

    updateTimeline({
      ...timeline,
      steps: nextSteps,
    });
    setSelectedPresetId('custom');
  };

  const handleLoopToggle = (loop: boolean) => {
    updateTimeline({ ...timeline, loop });
    setSelectedPresetId('custom');
  };

  // ─── Build preview Ad data dari previewContext ─────────────────
  const previewAd: AnimatedBannerAd | null = useMemo(() => {
    if (timeline.steps.length === 0) return null;

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
  }, [timeline, previewContext]);

  // Preview key — force re-mount AdAnimatedBanner saat timeline change
  const previewKey = useMemo(() => JSON.stringify(timeline), [timeline]);

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
            <span className="font-semibold">{timeline.steps.length} step</span>
            <span className="text-purple-600 dark:text-purple-400"> · </span>
            <span>Total {timeline.duration_ms}ms</span>
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

      {/* ─── STEP BUILDER ─── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs font-semibold text-purple-900 dark:text-purple-200">
            Steps Animasi ({timeline.steps.length})
          </label>
          <button
            type="button"
            onClick={handleAddStep}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Tambah Step
          </button>
        </div>

        {timeline.steps.length === 0 ? (
          <div className="p-6 rounded-md border-2 border-dashed border-purple-300 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/10 text-center">
            <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2 opacity-50" />
            <p className="text-xs text-purple-700 dark:text-purple-300">
              Belum ada step animasi. Pilih template di atas, atau klik "Tambah Step".
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {timeline.steps.map((step, index) => (
              <StepEditor
                key={index}
                step={step}
                index={index}
                totalSteps={timeline.steps.length}
                onChange={(field, value) => handleUpdateStep(index, field, value)}
                onRemove={() => handleRemoveStep(index)}
                onMove={(direction) => handleMoveStep(index, direction)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ─── LOOP TOGGLE ─── */}
      <div className="flex items-center justify-between p-3 rounded-md bg-purple-100/40 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
        <div>
          <p className="text-xs font-semibold text-purple-900 dark:text-purple-200">
            Loop Animasi
          </p>
          <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80 mt-0.5">
            Phase 1 LOCKED: matikan (play-once + replay-on-scroll)
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={timeline.loop}
            onChange={(e) => handleLoopToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-gray-300 dark:bg-gray-700 peer-checked:bg-purple-600 rounded-full peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all" />
        </label>
      </div>

      {/* ─── LIVE PREVIEW ─── */}
      <div>
        <label className="block text-xs font-semibold text-purple-900 dark:text-purple-200 mb-2">
          <Eye className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
          Live Preview ({previewWidth}×{previewHeight})
        </label>
        <div className="p-4 rounded-md border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900 flex items-center justify-center min-h-[200px] overflow-auto">
          {previewAd ? (
            <AdAnimatedBanner
              key={previewKey}
              ad={previewAd}
              width={previewWidth}
              height={previewHeight}
            />
          ) : (
            <div className="text-center">
              <Eye className="w-8 h-8 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Preview muncul setelah ada minimal 1 step
              </p>
            </div>
          )}
        </div>
        <p className="mt-2 text-[10px] text-purple-700/60 dark:text-purple-300/60 italic">
          Animasi pakai data dari section Kreatif (title, body, image, dll).
          Dimensi sesuai posisi yang sedang di-edit.
        </p>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENT: StepEditor
// ════════════════════════════════════════════════════════════════

interface StepEditorProps {
  step:       AnimationStep;
  index:      number;
  totalSteps: number;
  onChange:   (field: keyof AnimationStep, value: any) => void;
  onRemove:   () => void;
  onMove:     (direction: 'up' | 'down') => void;
}

function StepEditor({
  step,
  index,
  totalSteps,
  onChange,
  onRemove,
  onMove,
}: StepEditorProps) {
  const patternMeta = PATTERN_OPTIONS.find((p) => p.value === step.pattern);

  return (
    <div className="p-3 rounded-md border border-purple-200 dark:border-purple-800 bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-bold text-purple-900 dark:text-purple-200">
          Step {index + 1}
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
            disabled={index === totalSteps - 1}
            className={cn(
              'p-1 rounded hover:bg-purple-100 dark:hover:bg-purple-900/40 transition',
              index === totalSteps - 1 && 'opacity-30 cursor-not-allowed',
            )}
            title="Pindah ke bawah"
          >
            <ArrowDown className="w-3.5 h-3.5 text-purple-600 dark:text-purple-300" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/40 transition"
            title="Hapus step"
          >
            <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Target
          </label>
          <select
            value={step.target_selector}
            onChange={(e) => onChange('target_selector', e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            {TARGET_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Efek
          </label>
          <select
            value={step.pattern}
            onChange={(e) => onChange('pattern', e.target.value as AnimationPattern)}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            {PATTERN_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Delay (ms)
          </label>
          <input
            type="number"
            value={step.delay}
            min={0}
            step={100}
            onChange={(e) => onChange('delay', Math.max(0, parseInt(e.target.value, 10) || 0))}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Durasi (ms)
          </label>
          <input
            type="number"
            value={step.duration}
            min={100}
            step={100}
            onChange={(e) => onChange('duration', Math.max(100, parseInt(e.target.value, 10) || 100))}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      </div>

      {step.pattern === 'slide_in' && (
        <div className="mt-2">
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Arah Slide
          </label>
          <select
            value={step.from ?? 'left'}
            onChange={(e) => onChange('from', e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            {SLIDE_FROM_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {step.pattern === 'text_reveal' && (
        <div className="mt-2">
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Unit Reveal
          </label>
          <select
            value={step.unit ?? 'char'}
            onChange={(e) => onChange('unit', e.target.value)}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          >
            {TEXT_REVEAL_UNIT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {step.pattern === 'scale' && (
        <div className="mt-2">
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Scale Awal (0.5 - 0.95, default 0.8)
          </label>
          <input
            type="number"
            value={step.from_scale ?? 0.8}
            min={0.5}
            max={0.95}
            step={0.05}
            onChange={(e) => onChange('from_scale', parseFloat(e.target.value) || 0.8)}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      )}

      {step.pattern === 'stagger_group' && (
        <div className="mt-2">
          <label className="block text-[10px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Y Offset (px, default 12)
          </label>
          <input
            type="number"
            value={step.y_offset ?? 12}
            min={0}
            step={2}
            onChange={(e) => onChange('y_offset', parseInt(e.target.value, 10) || 12)}
            className="w-full px-2 py-1.5 text-xs rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>
      )}

      {patternMeta && (
        <p className="mt-2 text-[10px] text-gray-500 dark:text-gray-400 italic">
          {patternMeta.description}
        </p>
      )}
    </div>
  );
}

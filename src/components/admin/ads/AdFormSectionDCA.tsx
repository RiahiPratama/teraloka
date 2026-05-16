'use client';

/**
 * TeraLoka — AdFormSectionDCA
 * Mission 8 Sub-Phase 8-B β (Batch 2)
 * ------------------------------------------------------------
 * Section 5 form: DCA (Dynamic Creative Ads) Frame Builder.
 *
 * Per AdFrame interface dari shared/types.ts (Mission 7 lock):
 *   - order:       sequence 0, 1, 2, ... (auto from row index)
 *   - headline:    title untuk frame ini (Lora serif rendered)
 *   - image_url:   gambar frame (lazy load setelah frame 0)
 *   - duration_ms: berapa lama frame visible (default 4000)
 *
 * UX:
 *   - Toggle activation di header (off = creative_frames null = static ad)
 *   - Table inline: order# | image | headline | duration | actions
 *   - Min 2 frames (DCA = multi-frame), max 5 frames
 *   - Reorder via ↑ ↓ arrows
 *   - Add frame button bottom (disabled di max 5)
 *
 * Backend validation:
 *   - Validate di createAdAdmin/updateAdAdmin (Batch 2 patch)
 */

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Check,
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/ImageUpload';
import { useAdForm, type AdFrame } from './AdFormProvider';

const MIN_FRAMES = 2;
const MAX_FRAMES = 5;
const DEFAULT_DURATION_MS = 4000;
const MIN_DURATION_MS = 2000;
const MAX_DURATION_MS = 15000;

// Helper: create new empty frame
function createEmptyFrame(order: number): AdFrame {
  return {
    order,
    headline:    '',
    image_url:   '',
    duration_ms: DEFAULT_DURATION_MS,
  };
}

// Helper: re-number order setelah reorder/remove
function renumberFrames(frames: AdFrame[]): AdFrame[] {
  return frames.map((f, idx) => ({ ...f, order: idx }));
}

export default function AdFormSectionDCA() {
  const { state, setField } = useAdForm();
  const [expanded, setExpanded] = useState(false); // default collapsed (optional feature)

  const isActive = state.creative_frames !== null;
  const frames = state.creative_frames ?? [];

  // Activate DCA: init with 2 empty frames
  const activateDCA = () => {
    setField('creative_frames', [createEmptyFrame(0), createEmptyFrame(1)]);
  };

  // Deactivate DCA: clear frames
  const deactivateDCA = () => {
    setField('creative_frames', null);
  };

  // Add frame
  const addFrame = () => {
    if (frames.length >= MAX_FRAMES) return;
    setField('creative_frames', [...frames, createEmptyFrame(frames.length)]);
  };

  // Remove frame
  const removeFrame = (idx: number) => {
    if (frames.length <= MIN_FRAMES) return;
    const next = frames.filter((_, i) => i !== idx);
    setField('creative_frames', renumberFrames(next));
  };

  // Reorder frame
  const moveFrame = (idx: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= frames.length) return;
    const next = [...frames];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    setField('creative_frames', renumberFrames(next));
  };

  // Update field di frame tertentu
  const updateFrame = <K extends keyof AdFrame>(idx: number, field: K, value: AdFrame[K]) => {
    const next = [...frames];
    next[idx] = { ...next[idx], [field]: value };
    setField('creative_frames', next);
  };

  // Validation summary
  const hasInvalidFrames = isActive && frames.some(
    (f) =>
      !f.headline.trim() ||
      f.headline.trim().length < 5 ||
      !f.image_url.trim() ||
      f.duration_ms < MIN_DURATION_MS ||
      f.duration_ms > MAX_DURATION_MS
  );

  const isComplete = !isActive || (frames.length >= MIN_FRAMES && !hasInvalidFrames);

  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-ads/12 text-ads shrink-0">
            <Layers size={16} />
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-[13px] font-bold text-text uppercase tracking-wider">
              5. DCA Frame Builder
              <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold bg-ads/12 text-ads">
                OPSIONAL
              </span>
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              {isActive
                ? `${frames.length} frame rotation aktif`
                : 'Iklan static (default) — atau aktifkan untuk multi-frame rotation'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isActive && (
            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-ads/12 text-ads uppercase tracking-wide">
              DCA {frames.length}F
            </span>
          )}
          {isComplete && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-healthy/12 text-status-healthy">
              <Check size={12} />
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border">
          {/* Activation toggle */}
          <div className="pt-4">
            {!isActive ? (
              <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-surface-muted/40 border-2 border-dashed border-border">
                <Layers className="text-ads" size={32} />
                <div className="text-center">
                  <p className="text-[13px] font-bold text-text">
                    Aktifkan DCA Rotation?
                  </p>
                  <p className="text-[11px] text-text-muted mt-1 max-w-md leading-relaxed">
                    DCA = Dynamic Creative Ads. Iklan rotate antar {MIN_FRAMES}-{MAX_FRAMES} frame
                    untuk increase engagement. Tiap frame punya headline + image + duration sendiri.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={activateDCA}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ads text-white text-[12px] font-bold hover:bg-ads-strong transition-colors"
                >
                  <Plus size={14} />
                  Aktifkan DCA ({MIN_FRAMES} frame default)
                </button>
              </div>
            ) : (
              <>
                {/* Info banner */}
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-status-info/8 border border-status-info/30 mb-3">
                  <Info size={12} className="text-status-info shrink-0 mt-0.5" />
                  <p className="text-[10px] text-status-info leading-relaxed">
                    Frame pertama (#1) = preview default sebelum rotation start.
                    Setiap frame butuh headline (min 5 char) + image + durasi {MIN_DURATION_MS / 1000}-{MAX_DURATION_MS / 1000} detik.
                  </p>
                </div>

                {/* Frame table */}
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="bg-surface-muted/40 px-3 py-2 border-b border-border">
                    <div className="grid grid-cols-12 gap-2 text-[9px] font-bold uppercase tracking-wide text-text-muted">
                      <div className="col-span-1">#</div>
                      <div className="col-span-3">Image</div>
                      <div className="col-span-5">Headline</div>
                      <div className="col-span-2">Durasi (detik)</div>
                      <div className="col-span-1 text-right">Aksi</div>
                    </div>
                  </div>

                  {frames.map((frame, idx) => {
                    const headlineErr = !frame.headline.trim() || frame.headline.trim().length < 5;
                    const imageErr = !frame.image_url.trim();
                    const durationErr = frame.duration_ms < MIN_DURATION_MS || frame.duration_ms > MAX_DURATION_MS;

                    return (
                      <div
                        key={idx}
                        className={cn(
                          'grid grid-cols-12 gap-2 px-3 py-3 border-b border-border last:border-b-0',
                          idx % 2 === 0 ? 'bg-surface' : 'bg-surface-muted/20'
                        )}
                      >
                        {/* Order # */}
                        <div className="col-span-1 flex items-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-ads/12 text-ads text-[12px] font-bold tabular-nums">
                            {idx + 1}
                          </span>
                        </div>

                        {/* Image upload */}
                        <div className="col-span-3">
                          <ImageUpload
                            bucket="ads"
                            maxFiles={1}
                            maxSizeMB={0.5}
                            existingUrls={frame.image_url ? [frame.image_url] : []}
                            onUpload={(urls) => updateFrame(idx, 'image_url', urls[0] ?? '')}
                            label=""
                          />
                          {imageErr && (
                            <p className="text-[9px] text-status-critical mt-1">Wajib</p>
                          )}
                        </div>

                        {/* Headline */}
                        <div className="col-span-5">
                          <input
                            type="text"
                            value={frame.headline}
                            onChange={(e) => updateFrame(idx, 'headline', e.target.value)}
                            placeholder={`Headline frame ${idx + 1}`}
                            maxLength={80}
                            className={cn(
                              'w-full px-2.5 py-1.5 rounded bg-surface border text-[11px] text-text',
                              'placeholder:text-text-subtle',
                              'focus:outline-none focus:ring-2 focus:ring-ads/20 transition-all',
                              headlineErr
                                ? 'border-status-critical/40'
                                : 'border-border focus:border-ads/50'
                            )}
                          />
                          <div className="flex items-center justify-between mt-0.5">
                            {headlineErr ? (
                              <span className="text-[9px] text-status-critical">Min 5 char</span>
                            ) : (
                              <span />
                            )}
                            <span className="text-[9px] text-text-subtle">{frame.headline.length}/80</span>
                          </div>
                        </div>

                        {/* Duration */}
                        <div className="col-span-2">
                          <input
                            type="number"
                            value={Math.round(frame.duration_ms / 1000)}
                            onChange={(e) => {
                              const seconds = Number(e.target.value);
                              if (!isNaN(seconds)) {
                                updateFrame(idx, 'duration_ms', seconds * 1000);
                              }
                            }}
                            min={MIN_DURATION_MS / 1000}
                            max={MAX_DURATION_MS / 1000}
                            step={1}
                            className={cn(
                              'w-full px-2 py-1.5 rounded bg-surface border text-[11px] text-text tabular-nums',
                              'focus:outline-none focus:ring-2 focus:ring-ads/20 transition-all',
                              durationErr
                                ? 'border-status-critical/40'
                                : 'border-border focus:border-ads/50'
                            )}
                          />
                          {durationErr && (
                            <span className="text-[9px] text-status-critical">{MIN_DURATION_MS / 1000}-{MAX_DURATION_MS / 1000} detik</span>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="col-span-1 flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            onClick={() => moveFrame(idx, 'up')}
                            disabled={idx === 0}
                            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Pindah atas"
                          >
                            <ArrowUp size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveFrame(idx, 'down')}
                            disabled={idx === frames.length - 1}
                            className="p-1 rounded text-text-muted hover:text-text hover:bg-surface-muted disabled:opacity-30 disabled:cursor-not-allowed"
                            title="Pindah bawah"
                          >
                            <ArrowDown size={11} />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeFrame(idx)}
                            disabled={frames.length <= MIN_FRAMES}
                            className="p-1 rounded text-status-critical hover:bg-status-critical/12 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={frames.length <= MIN_FRAMES ? `Min ${MIN_FRAMES} frame` : 'Hapus frame'}
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Bottom actions */}
                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={addFrame}
                    disabled={frames.length >= MAX_FRAMES}
                    className={cn(
                      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors',
                      frames.length >= MAX_FRAMES
                        ? 'bg-surface-muted text-text-subtle cursor-not-allowed'
                        : 'bg-ads/12 text-ads hover:bg-ads/20'
                    )}
                  >
                    <Plus size={12} />
                    Tambah Frame {frames.length >= MAX_FRAMES ? `(max ${MAX_FRAMES})` : `(${frames.length}/${MAX_FRAMES})`}
                  </button>

                  <button
                    type="button"
                    onClick={deactivateDCA}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-text-muted hover:text-status-critical hover:bg-status-critical/8 transition-colors"
                  >
                    <Trash2 size={12} />
                    Nonaktifkan DCA
                  </button>
                </div>

                {/* Summary errors */}
                {hasInvalidFrames && (
                  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-status-critical/8 border border-status-critical/30">
                    <AlertTriangle size={12} className="text-status-critical shrink-0 mt-0.5" />
                    <p className="text-[10px] text-status-critical leading-relaxed">
                      Beberapa frame belum valid. Pastikan setiap frame punya headline (min 5 char),
                      image, dan durasi {MIN_DURATION_MS / 1000}-{MAX_DURATION_MS / 1000} detik.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

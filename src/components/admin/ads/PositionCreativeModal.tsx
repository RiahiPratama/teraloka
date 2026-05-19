'use client';

/**
 * TeraLoka — PositionCreativeModal
 * SESI 5E Phase 3a (19 Mei 2026) — Position-First DCA Workflow
 * ────────────────────────────────────────────────────────────────
 * Modal popup untuk edit creative spesifik per-posisi.
 *
 * Triggered dari AdFormSectionTargeting saat admin klik "Edit Creative"
 * di sebuah position card.
 *
 * Modes:
 *   - STATIC: 1 image per posisi (commit ke state.images[positionKey])
 *   - DCA:    2-5 variants rotate (commit ke state.position_frames[positionKey])
 *
 * Backward compat:
 *   - Modal opsional. Admin tetap bisa pakai Section Creative + Section DCA legacy.
 *   - Per-position frames override flat creative_frames di submit.
 *
 * UX:
 *   - ESC close + backdrop click close + body scroll lock
 *   - Live capacity hint header (recommendedImageDim)
 *   - Frame builder: ↑↓ reorder, [+ Tambah Variant] (max 5), [🗑️ Hapus]
 *   - Save → commit ke state + close modal
 */

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  Image as ImageIcon,
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Info,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/ImageUpload';
import { useAdForm, type AdFrame } from './AdFormProvider';
import {
  getPositionMetadata,
  type PositionRenderMetadata,
} from './position-render-metadata';
// SESI 5E Phase 3c: Live preview mini-player
import PositionLivePreview from './PositionLivePreview';

// ─── Constants ────────────────────────────────────────────────────
const DCA_MIN_FRAMES = 2;
const DCA_MAX_FRAMES = 5;
const DEFAULT_DURATION_MS = 4000;
const MIN_DURATION_MS = 2000;
const MAX_DURATION_MS = 15000;

// SESI 5D-2: Base URL Bakabar untuk live preview
const BAKABAR_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : (process.env.NEXT_PUBLIC_BAKABAR_URL || 'https://teraloka.vercel.app');

// ─── Helpers ──────────────────────────────────────────────────────
function createEmptyFrame(order: number): AdFrame {
  return {
    order,
    headline:    '',
    image_url:   '',
    duration_ms: DEFAULT_DURATION_MS,
  };
}

function renumberFrames(frames: AdFrame[]): AdFrame[] {
  return frames.map((f, idx) => ({ ...f, order: idx }));
}

// ─── Props ────────────────────────────────────────────────────────
interface PositionCreativeModalProps {
  positionKey: string;
  isOpen:      boolean;
  onClose:     () => void;
}

type Mode = 'static' | 'dca';

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function PositionCreativeModal({
  positionKey,
  isOpen,
  onClose,
}: PositionCreativeModalProps) {
  const { state, setField } = useAdForm();
  const meta = getPositionMetadata(positionKey);

  // Mode: detect dari state existing
  const existingFrames = state.position_frames[positionKey];
  const existingImage  = state.images[positionKey];
  const initialMode: Mode = existingFrames ? 'dca' : 'static';

  const [mode, setMode] = useState<Mode>(initialMode);

  // Re-sync mode ketika modal open dengan position berbeda
  useEffect(() => {
    if (isOpen) {
      setMode(existingFrames ? 'dca' : 'static');
    }
  }, [isOpen, positionKey, existingFrames]);

  // ESC + body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // ───────────────────────────────────────────────────────────────
  // STATIC MODE HANDLERS
  // ───────────────────────────────────────────────────────────────
  const setStaticImage = (url: string) => {
    const next = { ...state.images, [positionKey]: url };
    setField('images', next);
  };

  const clearStaticImage = () => {
    const next = { ...state.images };
    delete next[positionKey];
    setField('images', next);
  };

  const switchToDCA = () => {
    // Init dengan 2 empty frames
    const next = {
      ...state.position_frames,
      [positionKey]: [createEmptyFrame(0), createEmptyFrame(1)],
    };
    setField('position_frames', next);
    // Clear static image untuk posisi ini (mode-exclusive)
    clearStaticImage();
    setMode('dca');
  };

  const switchToStatic = () => {
    // Remove position_frames untuk posisi ini
    const next = { ...state.position_frames };
    delete next[positionKey];
    setField('position_frames', next);
    setMode('static');
  };

  // ───────────────────────────────────────────────────────────────
  // DCA MODE HANDLERS
  // ───────────────────────────────────────────────────────────────
  const dcaFrames = state.position_frames[positionKey] ?? [];

  const updateFrame = (idx: number, patch: Partial<AdFrame>) => {
    const next = dcaFrames.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    setField('position_frames', { ...state.position_frames, [positionKey]: next });
  };

  const addFrame = () => {
    if (dcaFrames.length >= DCA_MAX_FRAMES) return;
    const next = [...dcaFrames, createEmptyFrame(dcaFrames.length)];
    setField('position_frames', { ...state.position_frames, [positionKey]: renumberFrames(next) });
  };

  const removeFrame = (idx: number) => {
    if (dcaFrames.length <= DCA_MIN_FRAMES) return;
    const next = renumberFrames(dcaFrames.filter((_, i) => i !== idx));
    setField('position_frames', { ...state.position_frames, [positionKey]: next });
  };

  const moveFrame = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= dcaFrames.length) return;
    const next = [...dcaFrames];
    [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
    setField('position_frames', { ...state.position_frames, [positionKey]: renumberFrames(next) });
  };

  // ───────────────────────────────────────────────────────────────
  // RENDER
  // ───────────────────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl my-8 bg-surface border-2 border-ads/40 rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border bg-ads/5">
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-extrabold text-text">
              Edit Creative — {meta.label}
              {meta.politisiOnly && (
                <span className="ml-1.5 text-[11px] text-status-warning">🏛️</span>
              )}
            </h2>
            <p className="text-[11px] text-text-muted mt-0.5">
              Position key: <code className="text-ads bg-ads/10 px-1 rounded">{positionKey}</code>
            </p>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px]">
              <span className="inline-flex items-center gap-1 text-ads font-bold">
                <ImageIcon size={11} />
                {meta.recommendedImageDim}
              </span>
              <span className="text-text-subtle">
                {meta.aspectRatio}
              </span>
              <a
                href={`${BAKABAR_BASE_URL}${meta.frontendUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-ads hover:underline"
              >
                <ExternalLink size={10} />
                Lihat di Bakabar
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-lg hover:bg-surface-muted/40 transition-colors"
            title="Tutup (ESC)"
          >
            <X size={18} className="text-text-muted" />
          </button>
        </div>

        {/* ── MODE SWITCHER ── */}
        <div className="px-5 py-3 border-b border-border bg-surface-muted/20">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={switchToStatic}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors',
                mode === 'static'
                  ? 'bg-ads text-white shadow'
                  : 'bg-surface text-text-muted border border-border hover:bg-surface-muted/40'
              )}
            >
              <ImageIcon size={13} />
              Static (1 gambar)
            </button>
            <button
              type="button"
              onClick={mode === 'dca' ? undefined : switchToDCA}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors',
                mode === 'dca'
                  ? 'bg-ads text-white shadow'
                  : 'bg-surface text-text-muted border border-border hover:bg-surface-muted/40'
              )}
            >
              <Layers size={13} />
              Dynamic Creative (DCA — 2-5 variants rotate)
            </button>
          </div>
        </div>

        {/* ── BODY ── */}
        <div className="p-5">
          {mode === 'static' ? (
            // ─── STATIC MODE ───
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2 block">
                Upload Image — {meta.recommendedImageDim}
              </label>
              <ImageUpload
                bucket="ads"
                maxFiles={1}
                maxSizeMB={0.5}
                existingUrls={existingImage ? [existingImage] : []}
                onUpload={(urls) => {
                  const url = urls[0] ?? '';
                  url ? setStaticImage(url) : clearStaticImage();
                }}
                label={`Upload ${meta.label} (${meta.recommendedImageDim})`}
              />
              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-status-info/8 border border-status-info/30">
                <Info size={12} className="text-status-info shrink-0 mt-0.5" />
                <p className="text-[11px] text-status-info leading-relaxed">
                  Image ini hanya tayang di posisi <strong>{meta.label}</strong>.
                  Untuk static cross-position fallback, pakai field <em>Default Image</em> di section Kreatif.
                </p>
              </div>
            </div>
          ) : (
            // ─── DCA MODE ───
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
                  Variants ({dcaFrames.length}/{DCA_MAX_FRAMES})
                </p>
                <p className="text-[10px] text-text-subtle">
                  Min {DCA_MIN_FRAMES} · auto-cycle setiap {MIN_DURATION_MS / 1000}-{MAX_DURATION_MS / 1000}s
                </p>
              </div>

              <div className="flex flex-col gap-3">
                {dcaFrames.map((frame, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-border bg-surface p-3"
                  >
                    {/* Frame header */}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-text">
                        Variant #{idx + 1}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveFrame(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded hover:bg-surface-muted/40 disabled:opacity-30"
                          title="Pindah ke atas"
                        >
                          <ArrowUp size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFrame(idx, 'down')}
                          disabled={idx === dcaFrames.length - 1}
                          className="p-1 rounded hover:bg-surface-muted/40 disabled:opacity-30"
                          title="Pindah ke bawah"
                        >
                          <ArrowDown size={12} />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFrame(idx)}
                          disabled={dcaFrames.length <= DCA_MIN_FRAMES}
                          className="p-1 rounded hover:bg-status-critical/15 text-status-critical disabled:opacity-30"
                          title={dcaFrames.length <= DCA_MIN_FRAMES ? `Min ${DCA_MIN_FRAMES} variants` : 'Hapus variant'}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Frame fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Image */}
                      <div className="md:col-span-1">
                        <label className="text-[10px] font-bold text-text-muted block mb-1">
                          Image *
                        </label>
                        <ImageUpload
                          bucket="ads"
                          maxFiles={1}
                          maxSizeMB={0.5}
                          existingUrls={frame.image_url ? [frame.image_url] : []}
                          onUpload={(urls: string[]) => updateFrame(idx, { image_url: urls[0] ?? '' })}
                          label={`Variant #${idx + 1} image`}
                        />
                      </div>

                      {/* Headline + duration */}
                      <div className="md:col-span-2 flex flex-col gap-2">
                        <div>
                          <label className="text-[10px] font-bold text-text-muted block mb-1">
                            Headline * (min 5 char)
                          </label>
                          <input
                            type="text"
                            value={frame.headline}
                            onChange={(e) => updateFrame(idx, { headline: e.target.value })}
                            maxLength={80}
                            placeholder="e.g., Diskon 50% Lebaran"
                            className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-[12px] text-text focus:border-ads focus:outline-none"
                          />
                          <p className="text-[9px] text-text-subtle mt-0.5">
                            {frame.headline.length}/80 karakter
                          </p>
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-text-muted block mb-1">
                            Durasi tampil
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={frame.duration_ms / 1000}
                              onChange={(e) => {
                                const sec = Number(e.target.value);
                                if (isNaN(sec)) return;
                                updateFrame(idx, { duration_ms: Math.round(sec * 1000) });
                              }}
                              min={MIN_DURATION_MS / 1000}
                              max={MAX_DURATION_MS / 1000}
                              step={1}
                              className="w-20 px-2 py-1.5 rounded-lg border border-border bg-surface text-[12px] text-text focus:border-ads focus:outline-none text-center"
                            />
                            <span className="text-[11px] text-text-muted">detik ({MIN_DURATION_MS / 1000}-{MAX_DURATION_MS / 1000}s)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add variant */}
              {dcaFrames.length < DCA_MAX_FRAMES && (
                <button
                  type="button"
                  onClick={addFrame}
                  className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed border-ads/40 text-ads text-[12px] font-bold hover:bg-ads/8 transition-colors"
                >
                  <Plus size={13} />
                  Tambah Variant ({dcaFrames.length + 1}/{DCA_MAX_FRAMES})
                </button>
              )}
            </div>
          )}

          {/* ═══ SESI 5E Phase 3c: LIVE PREVIEW MINI-PLAYER ═══ */}
          <div className="mt-4">
            <PositionLivePreview
              positionKey={positionKey}
              mode={mode}
              imageUrl={existingImage ?? state.image_url}
              frames={mode === 'dca' ? dcaFrames : undefined}
              headline={state.title}
              advertiserName={state.advertiser_name}
              advertiserType={state.advertiser_type}
              adFormat={state.ad_format}
              body={state.body}
              slug={state.slug}
            />
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-muted/20">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface border border-border text-text text-[12px] font-bold hover:bg-surface-muted/40 transition-colors"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-ads text-white text-[12px] font-bold hover:bg-ads/85 transition-colors"
          >
            Simpan &amp; Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

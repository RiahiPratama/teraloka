'use client';

/**
 * TeraLoka — PositionCreativeModal
 * SESI 5E Phase 3a (19 Mei 2026) — Position-First DCA Workflow
 * SESI 10 Sub-Phase B (24 Mei 2026) — GIF support di STATIC mode
 * SESI 11 Batch 2 (30 Mei 2026) — Tab default ikut ad_format + gating tab relevan
 * ────────────────────────────────────────────────────────────────
 * Modal popup untuk edit creative spesifik per-posisi.
 *
 * Triggered dari AdFormSectionTargeting saat admin klik "Edit Creative"
 * di sebuah position card.
 *
 * Modes:
 *   - STATIC:   1 image per posisi (commit ke state.images[positionKey])
 *               → Support static (JPG/PNG/WebP 500KB) ATAU GIF animasi (2MB)
 *   - DCA:      2-5 variants rotate (commit ke state.position_frames[positionKey])
 *               → Static only (rotation animation = JS-driven, GIF redundant)
 *   - ANIMATED: GSAP timeline per posisi (premium tier)
 *               → Static only (GSAP overlay on static, GIF = double animation chaos)
 *   - VIDEO:    MP4+WebM per posisi (commit ke state.position_video_sources)
 *
 * SESI 11 Batch 2 (admin gak nyasar):
 *   - detectInitialMode IKUTIN state.ad_format (bukan cuma creative existing) →
 *     iklan Dinamis-video buka tab Video, Dinamis-DCA buka tab DCA, dst.
 *   - visibleModes: cuma tampil tab yang relevan sama format. Format dengan
 *     1 mode (video/animated) → switcher disembunyiin, langsung ke editor.
 *   - Mode fresh yang butuh struktur (DCA/animated) di-seed saat open.
 *
 * Paradigm separation:
 *   STATIC      = quick banner (incl. GIF Kumparan-style)
 *   DCA         = code-driven multi-message rotation
 *   ANIMATED    = code-driven custom animation (GSAP)
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

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X,
  Image as ImageIcon,
  Layers,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Info,
  Sparkles,
  Film,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ImageUpload from '@/components/ui/ImageUpload';
import VideoUpload, { type AdVideoSource } from './VideoUpload';
import { useAdForm, type AdFrame } from './AdFormProvider';
import {
  getPositionMetadata,
  // SESI 8 (24 Mei 2026): Format-aware dim helpers
  getRecommendedDimForFormat,
  getAspectRatioForFormat,
  type PositionRenderMetadata,
} from './position-render-metadata';
// SESI 5E Phase 3c: Live preview mini-player
import PositionLivePreview from './PositionLivePreview';
// SESI 5H Phase 5B (21 Mei 2026): GSAP animation builder per-position (DCA-Aligned)
import AnimationBuilder from './AnimationBuilder';
import type { AnimationTimelineConfig } from '@/components/public/ads/AdAnimatedBanner';
// SESI 11 Batch 2 (30 Mei 2026): tier→motion buat default tab Dinamis-DCA
import { resolveTierMotion } from '@/lib/ads/tier-motion';

// ─── Constants ────────────────────────────────────────────────────
const DCA_MIN_FRAMES = 2;
const DCA_MAX_FRAMES = 5;
const DEFAULT_DURATION_MS = 4000;
const MIN_DURATION_MS = 2000;
const MAX_DURATION_MS = 15000;

// SESI 11 L4 (30 Mei 2026): BAKABAR_BASE_URL dihapus — link "Lihat di Bakabar"
// (404 ke /bakabar/sample-article) diganti preview inline yang diangkat ke atas.

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

// SESI 5H Phase 5B: Mode extended dengan 'animated'
// SESI 10 (24 Mei 2026): Mode extended dengan 'video'
type Mode = 'static' | 'dca' | 'animated' | 'video';

// SESI 10: Posisi yang boleh pakai video (mirror backend VIDEO_AD_POSITIONS).
// Tab Video cuma muncul untuk posisi banner-ish.
// SESI 11 Phase 1B (29 Mei 2026): keep `homepage_hero_banner` (DB key tetap legacy
// nama, rename serentak di Phase 2). Label admin UI udah "Carousel Pilihan Sponsor".
// inline_banner & banner = dormant tapi tetep eligible (kalau Phase 2 mount, video ready).
const VIDEO_ELIGIBLE_POSITIONS = [
  'banner',
  'homepage_hero_banner',
  'top_leaderboard',
  'inline_banner',
  'sidebar',
  'skyscraper_left',
  'skyscraper_right',
];

// SESI 5H Phase 5B: Empty animation timeline template (DCA-Aligned)
const EMPTY_TIMELINE: AnimationTimelineConfig = {
  variants: [
    {
      order:       0,
      image_url:   '',
      headline:    '',
      body:        null,
      cta_text:    null,
      duration_ms: 4000,
    },
  ],
  transition_pattern:     'fade',
  transition_ms:          500,
  text_reveal_enabled:    false,
  text_reveal_pattern:    'fade_in',
  text_reveal_stagger_ms: 150,
  loop:                   false,
};

/**
 * Parse recommendedImageDim string ke { width, height } number.
 * Format: "888×220px" atau "300x250" atau "300×250px"
 */
function parseDimensions(dimStr: string): { width: number; height: number } {
  if (!dimStr) return { width: 300, height: 250 };
  const match = dimStr.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (!match) return { width: 300, height: 250 };
  return {
    width:  parseInt(match[1], 10) || 300,
    height: parseInt(match[2], 10) || 250,
  };
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function PositionCreativeModal({
  positionKey,
  isOpen,
  onClose,
}: PositionCreativeModalProps) {
  const { state, setField, isEditMode } = useAdForm();
  const meta = getPositionMetadata(positionKey);

  // SESI 5H Phase 5B: Parse dimensi position untuk live preview AnimationBuilder
  const positionDims = useMemo(
    () => parseDimensions(meta.recommendedImageDim),
    [meta.recommendedImageDim],
  );

  // Mode: detect dari state existing
  const existingFrames   = state.position_frames[positionKey];
  const existingImage    = state.images[positionKey];
  // SESI 5H Phase 5B: per-position animation detection
  const existingTimeline = state.position_animation_timelines[positionKey];
  // SESI 10: per-position video detection
  const existingVideo    = state.position_video_sources[positionKey];
  const videoEligible    = VIDEO_ELIGIBLE_POSITIONS.includes(positionKey);
  // SESI 11 Batch 3 (30 Mei 2026): motion paket — sumber kebenaran tab di create mode.
  const motion           = resolveTierMotion(state.pricing_tier_data);

  // SESI 11 Batch 2 (30 Mei 2026): Tab default IKUTIN ad_format (biar admin gak
  // nyasar) — bukan cuma creative yang udah ada. Edit mode tetap aman karena
  // creative existing per-posisi konsisten sama ad_format global.
  const detectInitialMode = (): Mode => {
    switch (state.ad_format) {
      case 'video':    return videoEligible ? 'video' : 'static';
      case 'animated': return 'animated';
      case 'text':     return 'static';
      case 'image':
      default:
        if (existingFrames) return 'dca';    // DCA existing
        if (existingImage)  return 'static'; // static existing
        // Fresh banner: mendarat di Static (paling aman, gak nge-seed frame kosong
        // yang bikin status "2 banner" palsu). Admin upgrade ke DCA/Video/Animasi
        // via tab sesuai paket.
        return 'static';
    }
  };

  const [mode, setMode] = useState<Mode>(detectInitialMode());

  // Re-sync mode ketika modal open dengan position berbeda
  // SESI 11 Batch 2: seed struktur kalau fresh + mode butuh init (biar admin
  // gak mendarat di tab kosong yang bikin bingung).
  useEffect(() => {
    if (!isOpen) return;
    const m = detectInitialMode();
    setMode(m);
    if (m === 'dca' && !(state.position_frames[positionKey]?.length)) {
      setField('position_frames', {
        ...state.position_frames,
        [positionKey]: [createEmptyFrame(0), createEmptyFrame(1)],
      });
    } else if (m === 'animated' && !state.position_animation_timelines[positionKey]) {
      setField('position_animation_timelines', {
        ...state.position_animation_timelines,
        [positionKey]: { ...EMPTY_TIMELINE },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, positionKey, existingFrames, existingTimeline, existingVideo]);

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

  // ───────────────────────────────────────────────────────────────
  // ANIMATION HANDLERS (SESI 5H Phase 5B)
  // ───────────────────────────────────────────────────────────────

  const clearAnimationTimeline = () => {
    const next = { ...state.position_animation_timelines };
    delete next[positionKey];
    setField('position_animation_timelines', next);
  };

  const setAnimationTimeline = (timeline: AnimationTimelineConfig) => {
    setField('position_animation_timelines', {
      ...state.position_animation_timelines,
      [positionKey]: timeline,
    });
  };

  // ───────────────────────────────────────────────────────────────
  // VIDEO HANDLERS (SESI 10)
  // ───────────────────────────────────────────────────────────────

  const clearVideoSource = () => {
    const next = { ...state.position_video_sources };
    delete next[positionKey];
    setField('position_video_sources', next);
  };

  const setVideoSource = (source: AdVideoSource | null) => {
    if (source === null) {
      clearVideoSource();
      return;
    }
    setField('position_video_sources', {
      ...state.position_video_sources,
      [positionKey]: source,
    });
  };

  // ───────────────────────────────────────────────────────────────
  // MODE SWITCHERS (mode-exclusive cleanup)
  // ───────────────────────────────────────────────────────────────

  const switchToDCA = () => {
    const next = {
      ...state.position_frames,
      [positionKey]: [createEmptyFrame(0), createEmptyFrame(1)],
    };
    setField('position_frames', next);
    // Mode-exclusive cleanup
    clearStaticImage();
    clearAnimationTimeline();
    clearVideoSource();
    if (!isEditMode) setField('ad_format', 'image'); // DCA = keluarga image
    setMode('dca');
  };

  const switchToStatic = () => {
    const next = { ...state.position_frames };
    delete next[positionKey];
    setField('position_frames', next);
    // Mode-exclusive cleanup
    clearAnimationTimeline();
    clearVideoSource();
    if (!isEditMode) setField('ad_format', 'image'); // Static = keluarga image
    setMode('static');
  };

  const switchToAnimated = () => {
    // Init dengan empty timeline (klien craft via builder)
    setAnimationTimeline({ ...EMPTY_TIMELINE });
    // Mode-exclusive cleanup
    clearStaticImage();
    clearVideoSource();
    const nextFrames = { ...state.position_frames };
    delete nextFrames[positionKey];
    setField('position_frames', nextFrames);
    if (!isEditMode) setField('ad_format', 'animated');
    setMode('animated');
  };

  // SESI 10: switch ke video mode (mode-exclusive cleanup)
  const switchToVideo = () => {
    // Mode-exclusive cleanup — hapus creative mode lain
    clearStaticImage();
    clearAnimationTimeline();
    const nextFrames = { ...state.position_frames };
    delete nextFrames[positionKey];
    setField('position_frames', nextFrames);
    // Video source diisi via VideoUpload (start null/empty)
    if (!isEditMode) setField('ad_format', 'video');
    setMode('video');
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
  // SESI 11 Batch 3 (30 Mei 2026): Tab yang muncul.
  //   EDIT  → ad_format IMMUTABLE (backend nolak ubah). Tab dikunci ke keluarga
  //           format existing: image→[static,dca] (boleh swap), video→[video], dst.
  //   CREATE→ ad_format belum kekunci. Tab ngikut PAKET (resolveTierMotion):
  //           dca  → [static, dca]
  //           video→ [static, dca, video(kalau posisi eligible), animated]
  //           none → [static]
  // ───────────────────────────────────────────────────────────────
  const visibleModes: Mode[] = (() => {
    if (isEditMode) {
      switch (state.ad_format) {
        case 'video':    return videoEligible ? ['video'] : ['static'];
        case 'animated': return ['animated'];
        case 'text':     return ['static'];
        case 'image':
        default:         return ['static', 'dca'];
      }
    }
    // CREATE — by paket (motion)
    if (state.ad_format === 'text') return ['static']; // advertorial jarang buka modal
    const modes: Mode[] = ['static'];
    if (motion === 'dca' || motion === 'video') modes.push('dca');
    if (motion === 'video') {
      if (videoEligible) modes.push('video');
      modes.push('animated');
    }
    return modes;
  })();

  const TAB_DEFS: Array<{
    mode:        Mode;
    label:       string;
    Icon:        typeof ImageIcon;
    activeClass: string;
    onSelect:    () => void;
  }> = [
    { mode: 'static',   label: 'Static',           Icon: ImageIcon, activeClass: 'bg-ads text-white shadow',        onSelect: switchToStatic },
    { mode: 'dca',      label: 'DCA (2-5 rotate)', Icon: Layers,    activeClass: 'bg-ads text-white shadow',        onSelect: switchToDCA },
    { mode: 'animated', label: 'Animated GSAP',    Icon: Sparkles,  activeClass: 'bg-purple-600 text-white shadow', onSelect: switchToAnimated },
    { mode: 'video',    label: 'Banner Motion',    Icon: Film,      activeClass: 'bg-cyan-600 text-white shadow',   onSelect: switchToVideo },
  ];
  const visibleTabs = TAB_DEFS.filter((t) => visibleModes.includes(t.mode));

  // SESI 11 L4: penjelas kriteria materi per tier (biar admin gak nanya "kenapa DCA")
  const formatNote =
    visibleModes.includes('video')
      ? '🎬 Paket ini dukung Banner Motion (video webM/MP4) + banner statis.'
      : visibleModes.includes('animated')
        ? '✨ Paket ini dukung Animasi GSAP.'
        : visibleModes.includes('dca')
          ? 'Paket ini: banner Statis atau gonta-ganti (DCA, 2–5 banner berputar). Video & animasi mulai paket Local Corp ke atas.'
          : 'Paket ini: banner Statis.';

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
            {/* SESI 8 (24 Mei 2026): Format-aware dim — switch by state.ad_format */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px]">
              <span className="inline-flex items-center gap-1 text-ads font-bold">
                <ImageIcon size={11} />
                {getRecommendedDimForFormat(meta, state.ad_format)}
              </span>
              <span className="text-text-subtle">
                {getAspectRatioForFormat(meta, state.ad_format)}
              </span>
              {state.ad_format === 'text' && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700/40 text-amber-800 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wide">
                  Advertorial
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-text-subtle">
                Preview live ada di bawah ↓
              </span>
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
        {/* SESI 11 Batch 2: cuma tampil tab yang relevan sama format. Kalau cuma
            1 mode (video/animated/advertorial), switcher disembunyiin — langsung
            ke editor biar admin gak bingung. */}
        {visibleTabs.length > 1 && (
          <div className="px-5 py-3 border-b border-border bg-surface-muted/20">
            <div className="flex gap-2">
              {visibleTabs.map(({ mode: tabMode, label, Icon, activeClass, onSelect }) => (
                <button
                  key={tabMode}
                  type="button"
                  onClick={mode === tabMode ? undefined : onSelect}
                  className={cn(
                    'flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-[12px] font-bold transition-colors',
                    mode === tabMode
                      ? activeClass
                      : 'bg-surface text-text-muted border border-border hover:bg-surface-muted/40'
                  )}
                >
                  <Icon size={13} />
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── BODY ── */}
        <div className="p-5">
          {/* SESI 11 L4: PREVIEW-FIRST — diangkat ke atas biar admin langsung lihat
              hasilnya, gak perlu scroll lewat semua variant dulu. */}
          {mode !== 'animated' && mode !== 'video' && (
            <div className="mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ads mb-2">
                Preview — begini tampilnya di BAKABAR
              </p>
              <PositionLivePreview
                positionKey={positionKey}
                mode={mode}
                imageUrl={existingImage ?? state.image_url}
                frames={mode === 'dca' ? dcaFrames : undefined}
                headline={state.title}
                advertiserName={state.advertiser_name}
                advertiserType={state.advertiser_type}
                adFormat={state.ad_format === 'video' ? 'image' : state.ad_format}
                body={state.body}
                slug={state.slug}
              />
            </div>
          )}
          <p className="mb-4 text-[10px] text-text-muted leading-relaxed px-3 py-2 rounded-md bg-surface-muted/40 border border-border">
            {formatNote}
          </p>

          {/* ─── STATIC MODE ─── */}
          {/* SESI 10 Sub-Phase B: Support GIF animasi up to 2MB.
              Sebelumnya hardcode maxSizeMB={0.5} → block GIF.
              Sekarang remove override → inherit BUCKET_LIMITS.ads:
                static (JPG/PNG/WebP) capped 0.5MB via staticMaxSizeMB
                GIF capped 2MB via maxSizeMB
              Per-MIME validation di ImageUpload v3. */}
          {mode === 'static' && (
            <div>
              {/* SESI 11 Batch 2: catatan kalau format Video tapi posisi belum eligible */}
              {state.ad_format === 'video' && !videoEligible && (
                <div className="flex items-start gap-2 mb-3 p-3 rounded-lg bg-status-warning/8 border border-status-warning/30">
                  <Info size={12} className="text-status-warning shrink-0 mt-0.5" />
                  <p className="text-[10px] text-status-warning leading-relaxed">
                    Posisi <strong>{meta.label}</strong> belum dukung video. Pakai banner statis di sini,
                    atau pilih posisi banner lain (Top Billboard / Sidebar / Skyscraper) untuk video.
                  </p>
                </div>
              )}
              <label className="text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2 block">
                {/* SESI 8 (24 Mei 2026): Format-aware dim label */}
                Upload Image — {getRecommendedDimForFormat(meta, state.ad_format)}
              </label>
              <ImageUpload
                bucket="ads"
                maxFiles={1}
                existingUrls={existingImage ? [existingImage] : []}
                onUpload={(urls) => {
                  const url = urls[0] ?? '';
                  url ? setStaticImage(url) : clearStaticImage();
                }}
                label={`Upload ${meta.label} (${getRecommendedDimForFormat(meta, state.ad_format)})`}
              />

              {/* SESI 10 Sub-Phase B: GIF support hint */}
              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-ads/5 border border-ads/30">
                <Sparkles size={12} className="text-ads shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-text">
                    Static atau GIF animasi
                  </p>
                  <p className="text-[10px] text-text-muted mt-0.5 leading-relaxed">
                    <strong>JPG/PNG/WebP</strong> (maks 500KB) untuk banner standar.
                    <br />
                    <strong>GIF</strong> (maks 2MB) untuk banner dinamis ala Kumparan —
                    animasi auto-play di public.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-status-info/8 border border-status-info/30">
                <Info size={12} className="text-status-info shrink-0 mt-0.5" />
                <p className="text-[11px] text-status-info leading-relaxed">
                  Image ini hanya tayang di posisi <strong>{meta.label}</strong>.
                  Untuk static cross-position fallback, pakai field <em>Default Image</em> di section Kreatif.
                </p>
              </div>
            </div>
          )}

          {/* ─── DCA MODE ─── */}
          {/* SESI 10 Sub-Phase B: DCA tetap static-only by design.
              Reasoning: DCA = JS-driven rotation antar static frames.
              GIF dalam DCA frame = "apakah ini rotate atau play?" → confusion.
              Paradigm separation: STATIC=GIF entry, DCA=static rotation,
              ANIMATED=GSAP timeline. maxSizeMB={0.5} preserved di frame upload. */}
          {mode === 'dca' && (
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
                      {/* Image — DCA paradigm static-only, cap 0.5MB hardcode */}
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

          {/* ─── ANIMATED MODE (SESI 5H Phase 5B) ─── */}
          {mode === 'animated' && (
            <div>
              <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800">
                <Sparkles size={14} className="text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-purple-900 dark:text-purple-100">
                    Animated GSAP — Posisi {meta.label}
                  </p>
                  <p className="text-[10px] text-purple-700/80 dark:text-purple-300/80 mt-0.5 leading-relaxed">
                    Dimensi: {meta.recommendedImageDim} ({meta.aspectRatio}).
                    Preview di-render dengan dimensi asli posisi ini.
                  </p>
                </div>
              </div>

              {/* AnimationBuilder mount — fully controlled */}
              <AnimationBuilder
                timeline={existingTimeline ?? null}
                onChange={setAnimationTimeline}
                previewContext={{
                  title:               state.title,
                  body:                state.body,
                  image_url:           existingImage ?? state.image_url,
                  link_url:            state.link_url,
                  advertiser_name:     state.advertiser_name,
                  advertiser_logo_url: state.advertiser_logo_url,
                  disclaimer_text:     state.disclaimer_text,
                }}
                previewWidth={positionDims.width}
                previewHeight={positionDims.height}
              />
            </div>
          )}

          {/* ═══ SESI 10: VIDEO MODE ═══ */}
          {mode === 'video' && (
            <div>
              <div className="flex items-start gap-2 mb-4 p-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/20 border border-cyan-200 dark:border-cyan-800">
                <Film size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-cyan-900 dark:text-cyan-100">
                    Banner Motion — Posisi {meta.label}
                  </p>
                  <p className="text-[10px] text-cyan-700/80 dark:text-cyan-300/80 mt-0.5 leading-relaxed">
                    Dimensi: {meta.recommendedImageDim} ({meta.aspectRatio}).
                    Cukup 1 file (webM disarankan, ringan). Autoplay muted, loop otomatis.
                  </p>
                </div>
              </div>

              <VideoUpload
                value={existingVideo ?? null}
                onChange={setVideoSource}
                positionLabel={meta.label}
              />
            </div>
          )}

          {/* SESI 11 L4: live preview dipindah ke ATAS body (preview-first). */}
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

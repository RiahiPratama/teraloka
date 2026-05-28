'use client';

/**
 * TeraLoka — AdFormProvider
 * Mission 8 Sub-Phase 8-B + SESI 5B STEP 4 (18 Mei 2026)
 * SESI 5C-B (18 Mei 2026) — Phase B Frontend Form Enhancement
 * ------------------------------------------------------------
 * Context provider untuk Ad Form state management.
 *
 * Responsibilities:
 *   - Hold form state (16+ fields, nested creative_frames array)
 *   - Field-level validation
 *   - Submit handler: POST /admin-create atau PUT /admin-update/:id
 *   - Loading/error state
 *   - Edit mode bootstrap (fetch existing ad → populate form)
 *
 * History:
 *   - Batch 1 (16 Mei 2026): initial state, advertiser/creative/targeting
 *   - Batch 2 (16 Mei 2026): + AdFrame type export, + creative_frames validation
 *   - SESI 5B (18 Mei 2026): + advertiser_account_id, pricing_tier_id,
 *                             + use_free_text_mode (Hybrid Q2 C — Mode Cepat toggle)
 *                             + validation branching by mode
 *                             + edit bootstrap detect mode from ad.advertiser_account_id
 *   - SESI 5C-B (18 Mei 2026): + price_paid (HYBRID Q1 — estimate saat create)
 *                               + pricing_tier_data TRANSIENT (untuk auto-populate
 *                                 positions/duration di Targeting+Schedule sections)
 *
 * SESI 5C Decisions LOCKED:
 *   - Q1 HYBRID: price_paid input saat create (estimate), confirm SESI 5C modal
 *   - Q2 SOFT positions auto-populate (editable)
 *   - Q3 STRICT duration lock (auto-set ends_at = starts_at + tier.duration_days)
 *
 * pricing_tier_data architecture:
 *   - Transient state — NOT submitted to backend
 *   - Set saat PricingTierPicker.onSelect
 *   - Consumed by AdFormSectionTargeting (positions hint) + AdFormSectionSchedule (duration lock)
 *   - Cleared saat picker.onSelect(null)
 */

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { PricingTier } from '@/components/admin/ads/pricing-tiers/PricingTierPicker';
// SESI 5H Phase 5B (21 Mei 2026): Per-position GSAP animation timeline (DCA-Aligned)
import type { AnimationTimelineConfig } from '@/components/public/ads/AdAnimatedBanner';
// SESI 6 Sub-Phase 6H — Defer upload object files til submit
import { commitPendingObjectUploads } from '@/components/admin/ads/ObjectLayerEditor';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// ─── Types ────────────────────────────────────────────────────────

// SESI 5H Phase 5B (21 Mei 2026): +animated (DCA-Aligned variant carousel)
export type AdFormat = 'image' | 'text' | 'animated';
// SESI 5C-B (18 Mei 2026): +premium (PT/CV brand nasional besar)
export type AdvertiserType = 'umum' | 'politisi' | 'pemerintah' | 'komersial' | 'premium';

// Mirror shared/types.ts AdFrame interface (Mission 7 lock)
export interface AdFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

// Mission 7 DCA constraints (mirror backend Batch 2 validation)
export const DCA_MIN_FRAMES = 2;
export const DCA_MAX_FRAMES = 5;
export const DCA_MIN_DURATION_MS = 2000;
export const DCA_MAX_DURATION_MS = 15000;

// ─── SESI 5H Phase 5B Helper ──────────────────────────────────────
/**
 * Normalize animation_timeline shape dari DB ke per-position Record.
 *
 * Detection logic:
 *   1. null/undefined → {} (empty Record)
 *   2. Shape `{ steps, duration_ms, loop }` (legacy Phase 5A.3 single global):
 *      → empty {} (klien re-craft via Phase 5B variants)
 *   3. Shape `{ variants, ... }` (NEW Phase 5B per-position):
 *      → use as-is
 *
 * @param raw       Raw animation_timeline dari ad object (DB JSONB)
 * @param positions Active positions array (untuk backward compat)
 * @returns         Normalized Record per-position (Phase 5B shape)
 */
function normalizeAnimationTimelines(
  raw:       any,
  positions: string[],
): Record<string, AnimationTimelineConfig> {
  if (!raw || typeof raw !== 'object') return {};

  // Legacy Phase 5A.3 shape: has 'steps' at root → empty (incompatible)
  if (Array.isArray((raw as any).steps)) {
    return {};
  }

  // Per-position Record (Phase 5A.7 / 5B): values are timeline configs
  const result: Record<string, AnimationTimelineConfig> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    const v = value as any;
    // Phase 5B shape: has 'variants' array
    if (Array.isArray(v.variants) && v.variants.length > 0) {
      result[key] = v as AnimationTimelineConfig;
    }
    // Legacy Phase 5A.7 shape (steps-based): SKIP — klien re-craft
    // Founder yang baru push 5A.7, kemungkinan belum ada production ad pakai shape ini
  }
  return result;
}

export interface AdFormState {
  // ─── SESI 5B NEW ─────────────────────────────
  advertiser_account_id: string | null;  // FK to advertiser_accounts(id)
  pricing_tier_id:       string | null;  // FK to ads_pricing_tiers(id)
  use_free_text_mode:    boolean;        // UI toggle (NOT submitted to backend)

  // ─── SESI 5C-B NEW ───────────────────────────
  /**
   * Transient state — NOT submitted to backend.
   * Holds full tier entity for UX hints (positions auto-populate, duration lock).
   * Set via PricingTierPicker.onSelect, cleared via onSelect(null).
   */
  pricing_tier_data:     PricingTier | null;
  /**
   * Harga final disetujui (estimate saat create, confirm SESI 5C modal).
   * Optional di create: null = belum input, akan confirm di payment modal.
   * Backend default 0 kalau null. Money emit defer ke /record-payment.
   */
  price_paid:            number | null;

  // ─── Advertiser (legacy free-text, kept for backward compat) ──
  advertiser_name:     string;
  advertiser_type:     AdvertiserType;
  advertiser_phone:    string;
  advertiser_logo_url: string;

  // ─── Creative ──────────────────────────────────
  ad_format:       AdFormat;
  title:           string;
  body:            string;
  image_url:       string;
  /** SESI 7 (22 Mei 2026): Caption untuk cover image advertorial (max 200 char). */
  cover_image_caption: string;
  /**
   * SESI 5D (18 Mei 2026): Per-position image map (HYBRID).
   * Key = position key (top_leaderboard, sidebar_left, etc).
   * Value = uploaded image URL untuk posisi itu.
   * Kalau key tidak ada → frontend lookup fallback ke image_url default.
   * Backend buildImagesMap() handle final persistence.
   */
  images:          Record<string, string>;
  link_url:        string;
  disclaimer_text: string;
  slug:            string;

  // ─── Targeting ─────────────────────────────────
  positions:       string[];
  target_regions:  string[] | null;

  // ─── DCA ────────────────────────────────────────
  /**
   * LEGACY (pre-SESI 5E): Flat array, shared across all positions.
   * Backend tetap accept via Hybrid C. Untuk admin baru, prefer position_frames.
   */
  creative_frames: AdFrame[] | null;

  /**
   * SESI 5E Phase 3a (19 Mei 2026): Per-position DCA frames.
   * Key = position key (top_leaderboard, sidebar, etc).
   * Value = AdFrame[] (2-5 frames) untuk posisi tersebut.
   * Submit logic: kalau non-empty, override creative_frames flat dengan Record shape.
   * Empty {} = pakai creative_frames flat (legacy path).
   */
  position_frames: Record<string, AdFrame[]>;

  // ─── Animation (SESI 5H Phase 5B) ───────────────────
  /**
   * SESI 5H Phase 5B (21 Mei 2026): Per-position GSAP animation timelines.
   * Key = position key (top_leaderboard, sidebar, in_article, etc).
   * Value = AnimationTimelineConfig dengan DCA-Aligned shape:
   *           variants[] + transition_* + text_reveal_* + loop.
   *
   * Empty {} = no animation set (default).
   * Submit logic: kalau ad_format='animated' DAN map non-empty, kirim Record
   *               shape ke backend animation_timeline column.
   *
   * Mode-exclusive per position: setiap position pilih SATU dari
   * static image (state.images) / DCA frames (state.position_frames) /
   * animation timeline (state.position_animation_timelines).
   */
  position_animation_timelines: Record<string, AnimationTimelineConfig>;

  // ─── Schedule ──────────────────────────────────
  starts_at:       string;
  ends_at:         string;
}

const EMPTY_STATE: AdFormState = {
  // SESI 5B
  advertiser_account_id: null,
  pricing_tier_id:       null,
  use_free_text_mode:    false, // default = picker mode (encourage best practice)

  // SESI 5C-B
  pricing_tier_data:     null, // transient — auto-set by PricingTierPicker
  price_paid:            null, // optional — null = belum input, confirm SESI 5C modal

  // Advertiser legacy
  advertiser_name:     '',
  advertiser_type:     'komersial',
  advertiser_phone:    '',
  advertiser_logo_url: '',

  // Creative
  ad_format:           'image',
  title:               '',
  body:                '',
  image_url:           '',
  cover_image_caption: '',          // SESI 7: caption untuk cover image advertorial
  images:              {},  // SESI 5D: empty map (HYBRID fallback ke image_url)
  link_url:            '',
  disclaimer_text:     '',
  slug:                '',

  // Targeting
  positions:           [],
  target_regions:      null,

  // DCA
  creative_frames:     null,
  // SESI 5E Phase 3a: per-position frames (empty = use legacy creative_frames flat)
  position_frames:     {},

  // SESI 5H Phase 5B: per-position animation timelines (empty = no animation)
  position_animation_timelines: {},

  // Schedule
  starts_at:           new Date().toISOString(),
  ends_at:             new Date(Date.now() + 30 * 86400000).toISOString(),
};

// ─── Validation ───────────────────────────────────────────────────

export type FieldError = {
  field:   keyof AdFormState | 'general';
  message: string;
};

export function validateAdForm(state: AdFormState): FieldError[] {
  const errors: FieldError[] = [];

  // ─── Advertiser validation: branching by mode ─────────────
  if (state.use_free_text_mode) {
    // Free-text mode (Mode Cepat): existing rules
    if (!state.advertiser_name.trim()) {
      errors.push({ field: 'advertiser_name', message: 'Nama advertiser wajib diisi' });
    }
    if (state.advertiser_name.trim().length > 80) {
      errors.push({ field: 'advertiser_name', message: 'Nama maks 80 karakter' });
    }
  } else {
    // Picker mode (default): advertiser_account_id required
    if (!state.advertiser_account_id) {
      errors.push({
        field:   'advertiser_account_id',
        message: 'Pilih advertiser dari daftar atau aktifkan "Mode Cepat"',
      });
    }
  }

  // pricing_tier_id: OPTIONAL in MVP (admin bisa skip — future enforce di SESI selanjutnya)

  if (!state.title.trim()) {
    errors.push({ field: 'title', message: 'Judul iklan wajib diisi' });
  }
  if (state.title.trim().length > 120) {
    errors.push({ field: 'title', message: 'Judul maks 120 karakter' });
  }

  if (!state.link_url.trim()) {
    errors.push({ field: 'link_url', message: 'Link tujuan wajib diisi' });
  } else if (!/^https?:\/\//i.test(state.link_url.trim())) {
    errors.push({ field: 'link_url', message: 'Link harus mulai http:// atau https://' });
  }

  if (state.ad_format === 'image') {
    // SESI 5E Phase 3b: Default image_url no longer strictly required.
    // New rule: setiap position dicentang WAJIB punya creative —
    // either state.images[position] OR state.position_frames[position],
    // ATAU fallback state.image_url (legacy default).
    const hasDefaultImage = state.image_url.trim().length > 0;
    const positionsWithoutCreative = state.positions.filter((posKey) => {
      const hasCustomImage = !!state.images[posKey];
      const hasDCA = (state.position_frames[posKey]?.length ?? 0) > 0;
      return !hasCustomImage && !hasDCA;
    });

    // Kalau ada position tanpa creative, default image_url wajib jadi fallback
    if (positionsWithoutCreative.length > 0 && !hasDefaultImage) {
      errors.push({
        field: 'images',
        message: `Posisi belum punya banner: ${positionsWithoutCreative.join(', ')}. Klik "Upload Banner" di Targeting untuk set creative.`,
      });
    }
  }

  if (state.ad_format === 'text') {
    if (!state.body.trim()) {
      errors.push({ field: 'body', message: 'Body advertorial wajib diisi' });
    } else if (state.body.trim().length < 100) {
      errors.push({ field: 'body', message: 'Body advertorial minimal 100 karakter' });
    } else if (state.body.trim().length > 5000) {
      errors.push({ field: 'body', message: 'Body advertorial maks 5000 karakter' });
    }

    // KPU compliance untuk politisi
    if (state.advertiser_type === 'politisi' && !state.disclaimer_text.trim()) {
      errors.push({
        field:   'disclaimer_text',
        message: 'Disclaimer KPU wajib untuk advertiser politisi',
      });
    }
  }

  // SESI 5H Phase 5B: Per-position animation validation (DCA-Aligned)
  if (state.ad_format === 'animated') {
    const timelines = state.position_animation_timelines;
    const timelineKeys = Object.keys(timelines);

    if (timelineKeys.length === 0) {
      errors.push({
        field:   'position_animation_timelines',
        message: 'Animasi belum dikonfigurasi. Klik "Edit Creative" di Targeting per posisi, lalu pilih tab "Animated GSAP".',
      });
    } else {
      // Validate setiap timeline yang ada
      for (const posKey of timelineKeys) {
        const tl = timelines[posKey];

        if (!Array.isArray(tl.variants) || tl.variants.length === 0) {
          errors.push({
            field:   'position_animation_timelines',
            message: `Posisi "${posKey}": animasi belum punya variant (minimal 1 variant).`,
          });
          continue;
        }
        if (tl.variants.length > 5) {
          errors.push({
            field:   'position_animation_timelines',
            message: `Posisi "${posKey}": maksimal 5 variant per posisi.`,
          });
        }

        // Per-variant validation (mirror DCA pattern)
        for (let i = 0; i < tl.variants.length; i++) {
          const v = tl.variants[i];
          if (!v.image_url || v.image_url.trim() === '') {
            errors.push({
              field:   'position_animation_timelines',
              message: `Posisi "${posKey}" variant #${i + 1}: background image wajib upload.`,
            });
          }
          if (!v.headline || v.headline.trim().length < 5) {
            errors.push({
              field:   'position_animation_timelines',
              message: `Posisi "${posKey}" variant #${i + 1}: headline minimal 5 karakter.`,
            });
          }
          if (typeof v.duration_ms !== 'number' || v.duration_ms < 2000 || v.duration_ms > 15000) {
            errors.push({
              field:   'position_animation_timelines',
              message: `Posisi "${posKey}" variant #${i + 1}: durasi harus 2-15 detik.`,
            });
          }
        }

        if (typeof tl.loop !== 'boolean') {
          errors.push({
            field:   'position_animation_timelines',
            message: `Posisi "${posKey}": loop config harus boolean.`,
          });
        }
      }

      // Cross-check: setiap timeline key harus exist di state.positions
      const orphanedKeys = timelineKeys.filter((k) => !state.positions.includes(k));
      if (orphanedKeys.length > 0) {
        errors.push({
          field:   'position_animation_timelines',
          message: `Animasi konfigurasi untuk posisi yang tidak aktif: ${orphanedKeys.join(', ')}. Aktifkan posisi atau hapus animasi.`,
        });
      }

      // Cross-check: setiap position dicentang dengan ad_format='animated' WAJIB punya timeline
      const positionsWithoutTimeline = state.positions.filter((p) => !timelines[p]);
      if (positionsWithoutTimeline.length > 0) {
        errors.push({
          field:   'position_animation_timelines',
          message: `Posisi belum punya animasi: ${positionsWithoutTimeline.join(', ')}. Edit creative per posisi → tab Animated GSAP.`,
        });
      }
    }
  }

  if (state.positions.length === 0) {
    errors.push({ field: 'positions', message: 'Minimal 1 posisi iklan wajib dipilih' });
  }

  if (!state.starts_at) {
    errors.push({ field: 'starts_at', message: 'Tanggal mulai wajib diisi' });
  }
  if (!state.ends_at) {
    errors.push({ field: 'ends_at', message: 'Tanggal akhir wajib diisi' });
  }
  if (state.starts_at && state.ends_at && new Date(state.ends_at) <= new Date(state.starts_at)) {
    errors.push({ field: 'ends_at', message: 'Tanggal akhir harus setelah tanggal mulai' });
  }

  // Batch 2: DCA creative_frames validation (LEGACY flat)
  if (state.creative_frames !== null) {
    const frames = state.creative_frames;

    if (frames.length < DCA_MIN_FRAMES) {
      errors.push({
        field:   'creative_frames',
        message: `DCA butuh minimal ${DCA_MIN_FRAMES} frames`,
      });
    } else if (frames.length > DCA_MAX_FRAMES) {
      errors.push({
        field:   'creative_frames',
        message: `DCA maksimal ${DCA_MAX_FRAMES} frames`,
      });
    } else {
      // Per-frame validation
      const invalidFrames: number[] = [];
      frames.forEach((f, idx) => {
        if (
          !f.headline.trim() ||
          f.headline.trim().length < 5 ||
          !f.image_url.trim() ||
          f.duration_ms < DCA_MIN_DURATION_MS ||
          f.duration_ms > DCA_MAX_DURATION_MS
        ) {
          invalidFrames.push(idx + 1);
        }
      });
      if (invalidFrames.length > 0) {
        errors.push({
          field:   'creative_frames',
          message: `Frame ${invalidFrames.join(', ')} belum valid (headline min 5 char + image + durasi ${DCA_MIN_DURATION_MS / 1000}-${DCA_MAX_DURATION_MS / 1000}s)`,
        });
      }
    }
  }

  // SESI 5E Phase 3a: Per-position frames validation
  // Setiap key di position_frames WAJIB ada di positions array (alignment)
  // Setiap value adalah AdFrame[] yang valid (2-5 frames, per-frame check)
  for (const [posKey, frames] of Object.entries(state.position_frames)) {
    if (!state.positions.includes(posKey)) {
      errors.push({
        field:   'position_frames',
        message: `Posisi "${posKey}" punya DCA tapi belum dicentang di Targeting. Hapus atau centang posisi.`,
      });
      continue;
    }

    if (frames.length < DCA_MIN_FRAMES) {
      errors.push({
        field:   'position_frames',
        message: `Posisi "${posKey}": DCA butuh minimal ${DCA_MIN_FRAMES} frames`,
      });
      continue;
    }
    if (frames.length > DCA_MAX_FRAMES) {
      errors.push({
        field:   'position_frames',
        message: `Posisi "${posKey}": DCA maksimal ${DCA_MAX_FRAMES} frames`,
      });
      continue;
    }

    const invalidFrames: number[] = [];
    frames.forEach((f, idx) => {
      if (
        !f.headline.trim() ||
        f.headline.trim().length < 5 ||
        !f.image_url.trim() ||
        f.duration_ms < DCA_MIN_DURATION_MS ||
        f.duration_ms > DCA_MAX_DURATION_MS
      ) {
        invalidFrames.push(idx + 1);
      }
    });
    if (invalidFrames.length > 0) {
      errors.push({
        field:   'position_frames',
        message: `Posisi "${posKey}" Frame ${invalidFrames.join(', ')}: headline min 5 char + image + durasi ${DCA_MIN_DURATION_MS / 1000}-${DCA_MAX_DURATION_MS / 1000}s`,
      });
    }
  }

  return errors;
}

// ─── Context ──────────────────────────────────────────────────────

export interface AdFormContextType {
  state:          AdFormState;
  setField:       <K extends keyof AdFormState>(key: K, value: AdFormState[K]) => void;
  errors:         FieldError[];
  errorFor:       (field: keyof AdFormState) => string | undefined;
  isDirty:        boolean;
  isSubmitting:   boolean;
  submitError:    string | null;
  isEditMode:     boolean;
  editingAdId:    string | null;
  loadingExisting: boolean;
  submit:         () => Promise<{ ok: true; ad_id?: string } | { ok: false; error: string }>;
  reset:          () => void;
}

const AdFormContext = createContext<AdFormContextType | null>(null);

export function useAdForm(): AdFormContextType {
  const ctx = useContext(AdFormContext);
  if (!ctx) throw new Error('useAdForm must be used inside AdFormProvider');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────

export function AdFormProvider({
  editingAdId,
  children,
}: {
  editingAdId?: string | null;
  children: ReactNode;
}) {
  const { token } = useAuth();
  const [state, setState] = useState<AdFormState>(EMPTY_STATE);
  const [isDirty, setIsDirty] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loadingExisting, setLoadingExisting] = useState(false);

  const isEditMode = Boolean(editingAdId);

  // Bootstrap edit mode — fetch existing ad
  useEffect(() => {
    if (!editingAdId || !token) return;
    setLoadingExisting(true);
    (async () => {
      try {
        const res = await fetch(`${API}/admin/ads/detail/${editingAdId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!json.success || !json.data?.ad) {
          setSubmitError('Gagal memuat iklan untuk edit');
          return;
        }
        const ad = json.data.ad;

        // SESI 5B: Detect mode dari ad.advertiser_account_id presence
        // - Present → picker mode (use_free_text_mode = false)
        // - Absent  → free-text mode (legacy, use_free_text_mode = true)
        const hasAdvertiserAccount = Boolean(ad.advertiser_account_id);

        setState({
          // SESI 5B fields
          advertiser_account_id: ad.advertiser_account_id ?? null,
          pricing_tier_id:       ad.pricing_tier_id ?? null,
          use_free_text_mode:    !hasAdvertiserAccount, // legacy ads → free-text mode

          // SESI 5C-B fields
          pricing_tier_data:     null, // set by Advertiser section useEffect (fetch by id)
          price_paid:            ad.price_paid ?? null, // null = belum ada record-payment

          // Legacy fields (kept untuk backward compat + denormalized cache)
          advertiser_name:     ad.advertiser_name ?? '',
          advertiser_type:     ad.advertiser_type ?? 'komersial',
          advertiser_phone:    ad.advertiser_phone ?? '',
          advertiser_logo_url: ad.advertiser_logo_url ?? '',
          ad_format:           ad.ad_format ?? 'image',
          title:               ad.title ?? '',
          body:                ad.body ?? '',
          image_url:           ad.image_url ?? '',
          cover_image_caption: ad.cover_image_caption ?? '',  // SESI 7
          images:              ad.images ?? {},  // SESI 5D
          link_url:            ad.link_url ?? '',
          disclaimer_text:     ad.disclaimer_text ?? '',
          slug:                ad.slug ?? '',
          positions:           ad.positions ?? [],
          target_regions:      ad.target_regions ?? null,
          // SESI 5E Phase 3a: Detect creative_frames hybrid shape pada load
          // - Array (legacy) → state.creative_frames flat
          // - Record per-position → state.position_frames
          // - null → both null/{}
          creative_frames:     Array.isArray(ad.creative_frames) ? ad.creative_frames : null,
          position_frames:     (ad.creative_frames && typeof ad.creative_frames === 'object' && !Array.isArray(ad.creative_frames))
            ? ad.creative_frames as Record<string, AdFrame[]>
            : {},
          // SESI 5H Phase 5B: per-position animation timelines from DB
          position_animation_timelines: normalizeAnimationTimelines(
            ad.animation_timeline,
            ad.positions ?? [],
          ),
          starts_at:           ad.starts_at ?? new Date().toISOString(),
          ends_at:             ad.ends_at ?? new Date(Date.now() + 30 * 86400000).toISOString(),
        });
        setIsDirty(false);
      } catch (err: any) {
        setSubmitError(err?.message ?? 'Network error');
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [editingAdId, token]);

  const setField = useCallback(<K extends keyof AdFormState>(key: K, value: AdFormState[K]) => {
    setState((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  const errors = validateAdForm(state);
  const errorFor = useCallback(
    (field: keyof AdFormState) => errors.find((e) => e.field === field)?.message,
    [errors]
  );

  const submit = useCallback(async () => {
    if (errors.length > 0) {
      return { ok: false as const, error: 'Form belum valid — periksa field yang merah' };
    }

    if (!token) {
      return { ok: false as const, error: 'Token auth hilang — login ulang' };
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // ════════════════════════════════════════════════════════════════
      // SESI 6 Sub-Phase 6H — Commit pending object file uploads
      // ────────────────────────────────────────────────────────────────
      // Object file (.gif/.png/.webp) belum di-upload ke Storage saat
      // admin tambah Object di builder. Sekarang (sebelum kirim payload)
      // upload semua pending file → replace blob: URL dengan public URL.
      // Kalau upload gagal → throw → user lihat error message.
      // ════════════════════════════════════════════════════════════════
      let committedAnimationTimelines = state.position_animation_timelines;
      if (state.ad_format === 'animated' && Object.keys(state.position_animation_timelines).length > 0) {
        const advertiserId = state.advertiser_account_id ?? null;
        const nextTimelines: Record<string, AnimationTimelineConfig> = {};
        for (const [positionKey, timeline] of Object.entries(state.position_animation_timelines)) {
          if (!timeline || !Array.isArray(timeline.variants) || timeline.variants.length === 0) {
            nextTimelines[positionKey] = timeline;
            continue;
          }
          const updatedVariants = await commitPendingObjectUploads(timeline.variants, advertiserId);
          nextTimelines[positionKey] = { ...timeline, variants: updatedVariants };
        }
        committedAnimationTimelines = nextTimelines;
        // Sync state supaya UI gak refer ke blob: URL stale post-save
        setState((prev) => ({ ...prev, position_animation_timelines: nextTimelines }));
      }

      const url = isEditMode
        ? `${API}/admin/ads/admin-update/${editingAdId}`
        : `${API}/admin/ads/admin-create`;
      const method = isEditMode ? 'PUT' : 'POST';

      // Build payload — sanitize empty strings ke null
      // SESI 5B: include advertiser_account_id + pricing_tier_id
      // SESI 5C-B: include price_paid (optional estimate)
      // Backend resolves: kalau advertiser_account_id given, derive denormalized
      // fields dari entity (single source of truth).
      // NOTE: pricing_tier_data is TRANSIENT (UX hints), NOT submitted.
      const payload = {
        // SESI 5B NEW
        advertiser_account_id: state.advertiser_account_id,
        pricing_tier_id:       state.pricing_tier_id,

        // SESI 5C-B NEW
        price_paid:            state.price_paid, // null OK — backend default 0

        // Advertiser (legacy fields kept — backend uses sebagai cache/fallback)
        advertiser_name:     state.advertiser_name.trim(),
        advertiser_type:     state.advertiser_type,
        advertiser_phone:    state.advertiser_phone.trim() || null,
        advertiser_logo_url: state.advertiser_logo_url.trim() || null,

        // Creative
        ad_format:           state.ad_format,
        title:               state.title.trim(),
        body:                state.body.trim() || null,
        image_url:           state.image_url.trim() || null,
        cover_image_caption: state.cover_image_caption.trim() || null,  // SESI 7
        images:              Object.keys(state.images).length > 0 ? state.images : null,  // SESI 5D
        link_url:            state.link_url.trim(),
        disclaimer_text:     state.disclaimer_text.trim() || null,
        slug:                state.slug.trim() || null,

        // Targeting
        positions:           state.positions,
        target_regions:      state.target_regions,

        // DCA (SESI 5E Phase 3a Hybrid C):
        // - position_frames non-empty → use Record shape (per-position)
        // - position_frames empty + creative_frames non-null → legacy flat array
        // - both empty/null → static ad (null)
        creative_frames:     Object.keys(state.position_frames).length > 0
          ? state.position_frames
          : state.creative_frames,

        // SESI 5H Phase 5B: per-position animation timelines (DCA-Aligned)
        // - ad_format='animated' + map non-empty → kirim Record shape ke backend
        // - else → null (clear field di backend update)
        // SESI 6H: committedAnimationTimelines = pending object files udah ke-upload
        animation_timeline:  state.ad_format === 'animated' && Object.keys(committedAnimationTimelines).length > 0
          ? committedAnimationTimelines
          : null,

        // Schedule
        starts_at:           state.starts_at,
        ends_at:             state.ends_at,
      };

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const json = await res.json();

      if (!json.success) {
        const msg = json.error?.message ?? 'Submit gagal';
        setSubmitError(msg);
        return { ok: false as const, error: msg };
      }

      setIsDirty(false);
      return { ok: true as const, ad_id: json.data?.ad_id };
    } catch (err: any) {
      const msg = err?.message ?? 'Network error';
      setSubmitError(msg);
      return { ok: false as const, error: msg };
    } finally {
      setIsSubmitting(false);
    }
  }, [errors.length, token, isEditMode, editingAdId, state]);

  const reset = useCallback(() => {
    setState(EMPTY_STATE);
    setIsDirty(false);
    setSubmitError(null);
  }, []);

  return (
    <AdFormContext.Provider
      value={{
        state,
        setField,
        errors,
        errorFor,
        isDirty,
        isSubmitting,
        submitError,
        isEditMode,
        editingAdId: editingAdId ?? null,
        loadingExisting,
        submit,
        reset,
      }}
    >
      {children}
    </AdFormContext.Provider>
  );
}

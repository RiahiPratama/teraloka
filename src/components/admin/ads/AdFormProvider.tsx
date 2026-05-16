'use client';

/**
 * TeraLoka — AdFormProvider
 * Mission 8 Sub-Phase 8-B α (Batch 1) → β (Batch 2)
 * ------------------------------------------------------------
 * Context provider untuk Ad Form state management.
 *
 * Responsibilities:
 *   - Hold form state (12+ fields, nested creative_frames array)
 *   - Field-level validation (Batch 2: + creative_frames validation)
 *   - Submit handler: POST /admin-create atau PUT /admin-update/:id
 *   - Loading/error state
 *   - Edit mode bootstrap (fetch existing ad → populate form)
 *
 * History:
 *   - Batch 1 (16 Mei 2026): initial state, advertiser/creative/targeting
 *   - Batch 2 (16 Mei 2026): + AdFrame type export, + creative_frames validation
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

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

// ─── Types ────────────────────────────────────────────────────────

export type AdFormat = 'image' | 'text';
export type AdvertiserType = 'umum' | 'politisi' | 'pemerintah' | 'komersial';

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

export interface AdFormState {
  // Advertiser
  advertiser_name:     string;
  advertiser_type:     AdvertiserType;
  advertiser_phone:    string;
  advertiser_logo_url: string;

  // Creative
  ad_format:       AdFormat;
  title:           string;
  body:            string;
  image_url:       string;
  link_url:        string;
  disclaimer_text: string;
  slug:            string;

  // Targeting
  positions:       string[];
  target_regions:  string[] | null; // null = semua region

  // DCA (Batch 2)
  creative_frames: AdFrame[] | null; // null = static ad

  // Schedule (Batch 2 default values)
  starts_at:       string; // ISO datetime string
  ends_at:         string;
}

const EMPTY_STATE: AdFormState = {
  advertiser_name:     '',
  advertiser_type:     'komersial',
  advertiser_phone:    '',
  advertiser_logo_url: '',
  ad_format:           'image',
  title:               '',
  body:                '',
  image_url:           '',
  link_url:            '',
  disclaimer_text:     '',
  slug:                '',
  positions:           [],
  target_regions:      null,
  creative_frames:     null,
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

  if (!state.advertiser_name.trim()) {
    errors.push({ field: 'advertiser_name', message: 'Nama advertiser wajib diisi' });
  }
  if (state.advertiser_name.trim().length > 80) {
    errors.push({ field: 'advertiser_name', message: 'Nama maks 80 karakter' });
  }

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

  if (state.ad_format === 'image' && !state.image_url.trim()) {
    errors.push({ field: 'image_url', message: 'Image untuk iklan image format wajib' });
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

  // Batch 2: DCA creative_frames validation
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
        setState({
          advertiser_name:     ad.advertiser_name ?? '',
          advertiser_type:     ad.advertiser_type ?? 'komersial',
          advertiser_phone:    ad.advertiser_phone ?? '',
          advertiser_logo_url: ad.advertiser_logo_url ?? '',
          ad_format:           ad.ad_format ?? 'image',
          title:               ad.title ?? '',
          body:                ad.body ?? '',
          image_url:           ad.image_url ?? '',
          link_url:            ad.link_url ?? '',
          disclaimer_text:     ad.disclaimer_text ?? '',
          slug:                ad.slug ?? '',
          positions:           ad.positions ?? [],
          target_regions:      ad.target_regions ?? null,
          creative_frames:     ad.creative_frames ?? null,
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
      const url = isEditMode
        ? `${API}/admin/ads/admin-update/${editingAdId}`
        : `${API}/admin/ads/admin-create`;
      const method = isEditMode ? 'PUT' : 'POST';

      // Build payload — sanitize empty strings ke null
      const payload = {
        advertiser_name:     state.advertiser_name.trim(),
        advertiser_type:     state.advertiser_type,
        advertiser_phone:    state.advertiser_phone.trim() || null,
        advertiser_logo_url: state.advertiser_logo_url.trim() || null,
        ad_format:           state.ad_format,
        title:               state.title.trim(),
        body:                state.body.trim() || null,
        image_url:           state.image_url.trim() || null,
        link_url:            state.link_url.trim(),
        disclaimer_text:     state.disclaimer_text.trim() || null,
        slug:                state.slug.trim() || null,
        positions:           state.positions,
        target_regions:      state.target_regions,
        creative_frames:     state.creative_frames,
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

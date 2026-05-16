'use client';

/**
 * TeraLoka — AdFormPage
 * Mission 8 Sub-Phase 8-B (α / Batch 1)
 * ------------------------------------------------------------
 * Page container untuk create/edit iklan.
 * Routes:
 *   - /admin/ads/new          → create mode
 *   - /admin/ads/[id]/edit    → edit mode (fetch existing)
 *
 * Layout:
 *   - Header: title + back button + sticky submit hint
 *   - Body: 3 sections collapsible (Advertiser / Creative / Targeting)
 *   - Placeholder slot bottom: Schedule + DCA (Batch 2)
 *   - Footer: sticky submit bar (Save + Cancel + validation summary)
 *
 * Used as the default export, gets mounted di:
 *   - src/app/admin/ads/new/page.tsx
 *   - src/app/admin/ads/[id]/edit/page.tsx
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AdFormProvider,
  useAdForm,
} from './AdFormProvider';
import AdFormSectionAdvertiser from './AdFormSectionAdvertiser';
import AdFormSectionCreative from './AdFormSectionCreative';
import AdFormSectionTargeting from './AdFormSectionTargeting';

export interface AdFormPageProps {
  /** Kalau provided, masuk edit mode + auto-fetch existing ad */
  editingAdId?: string | null;
}

export default function AdFormPage({ editingAdId = null }: AdFormPageProps) {
  return (
    <AdFormProvider editingAdId={editingAdId}>
      <AdFormPageInner />
    </AdFormProvider>
  );
}

function AdFormPageInner() {
  const router = useRouter();
  const {
    isEditMode,
    isSubmitting,
    submitError,
    errors,
    isDirty,
    loadingExisting,
    submit,
  } = useAdForm();

  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleCancel = () => {
    if (isDirty && !window.confirm('Form belum disimpan. Yakin keluar?')) return;
    router.push('/admin/ads');
  };

  const handleSubmit = async () => {
    const result = await submit();
    if (result.ok) {
      showToast(
        isEditMode ? '✓ Iklan berhasil di-update' : '✓ Iklan berhasil ditambahkan',
        'ok'
      );
      setTimeout(() => router.push('/admin/ads'), 800);
    } else {
      showToast(result.error, 'err');
    }
  };

  // ─── Loading state saat fetch existing ad untuk edit ─────────
  if (loadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="text-ads animate-spin mb-3" size={32} />
        <p className="text-[13px] text-text-muted">Memuat data iklan untuk edit...</p>
      </div>
    );
  }

  const hasErrors = errors.length > 0;

  return (
    <div className="flex flex-col gap-4 pb-24">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md">
          <div
            className={cn(
              'flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg',
              toast.type === 'ok'
                ? 'bg-status-healthy text-white'
                : 'bg-status-critical text-white'
            )}
          >
            {toast.type === 'ok' ? (
              <CheckCircle2 size={18} />
            ) : (
              <AlertCircle size={18} />
            )}
            <span className="text-[12px] font-semibold">{toast.msg}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleCancel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-border text-text-muted hover:text-text transition-colors text-[12px] font-bold"
        >
          <ArrowLeft size={12} />
          Kembali
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold text-text tracking-tight">
            {isEditMode ? 'Edit Iklan' : 'Tambah Iklan Baru'}
          </h2>
          <p className="text-[12px] text-text-muted mt-0.5">
            {isEditMode
              ? 'Ubah detail iklan — perubahan langsung berlaku setelah simpan'
              : 'Onboarding iklan baru. Status default: active untuk umum/komersial, pending_review untuk politisi/pemerintah'}
          </p>
        </div>
      </div>

      {/* 3 Sections (Batch 1) */}
      <AdFormSectionAdvertiser />
      <AdFormSectionCreative />
      <AdFormSectionTargeting />

      {/* Placeholder Batch 2 sections (Schedule + DCA) */}
      <div className="bg-surface-muted/40 border border-dashed border-border rounded-xl p-6 text-center">
        <p className="text-[12px] font-semibold text-text-muted">
          🚧 Schedule + DCA Frame Builder (Sub-Phase 8-B Batch 2)
        </p>
        <p className="text-[11px] text-text-subtle mt-1">
          Saat ini default schedule: hari ini → 30 hari ke depan. DCA frames belum bisa di-edit via form.
        </p>
      </div>

      {/* Validation summary (kalau ada error) */}
      {hasErrors && (
        <div className="bg-status-critical/8 border border-status-critical/30 rounded-xl p-3">
          <p className="text-[11px] font-bold text-status-critical mb-1.5 uppercase tracking-wide">
            ⚠ Form belum valid ({errors.length} error)
          </p>
          <ul className="text-[10px] text-status-critical space-y-0.5">
            {errors.slice(0, 5).map((e, i) => (
              <li key={i}>
                • <strong>{e.field}:</strong> {e.message}
              </li>
            ))}
            {errors.length > 5 && (
              <li className="italic">...dan {errors.length - 5} error lain</li>
            )}
          </ul>
        </div>
      )}

      {/* Submit error */}
      {submitError && (
        <div className="bg-status-critical/8 border border-status-critical/30 rounded-xl p-3 flex items-center gap-2">
          <AlertCircle size={14} className="text-status-critical shrink-0" />
          <p className="text-[12px] text-status-critical font-semibold">
            {submitError}
          </p>
        </div>
      )}

      {/* Sticky submit bar */}
      <div className="fixed bottom-0 left-0 right-0 md:left-[256px] z-30 bg-surface border-t border-border shadow-lg">
        <div className="px-5 md:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            {hasErrors ? (
              <p className="text-[11px] text-status-critical font-semibold">
                {errors.length} field belum valid
              </p>
            ) : isDirty ? (
              <p className="text-[11px] text-status-warning font-semibold">
                ● Belum disimpan
              </p>
            ) : (
              <p className="text-[11px] text-text-muted">
                Form siap submit
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors text-[12px] font-bold disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={hasErrors || isSubmitting}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold text-white',
                'bg-ads hover:bg-ads-strong transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isSubmitting ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Save size={14} />
              )}
              {isSubmitting
                ? 'Menyimpan...'
                : isEditMode
                  ? 'Simpan Perubahan'
                  : 'Simpan Iklan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

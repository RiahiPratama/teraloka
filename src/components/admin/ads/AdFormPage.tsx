'use client';

/**
 * TeraLoka — AdFormPage
 * Mission 8 Sub-Phase 8-B α (Batch 1) → β (Batch 2)
 * SESI 11 Spine Batch 1 (30 Mei 2026) — Gated spine flow
 * ------------------------------------------------------------
 * Page container untuk create/edit iklan.
 * Routes:
 *   - /admin/ads/new          → create mode
 *   - /admin/ads/[id]/edit    → edit mode (fetch existing)
 *
 * Layout:
 *   - Header: title + back button
 *   - Body: section spine
 *     1. Advertiser + Paket  (ANCHOR — wajib dulu)
 *     2. Konten Kreatif       ┐
 *     3. Targeting Posisi     ├ ke-LOCK sampai Langkah 1 beres (create mode)
 *     4. Jadwal Tayang        ┘
 *   - Footer: sticky submit bar
 *
 * SESI 11 Spine Batch 1:
 *   - Create mode: Langkah materi/posisi/jadwal ke-lock sampai advertiser + paket
 *     dipilih (step1Done). Tujuan: alur jadi spine lurus — anchor dulu, sisanya
 *     ngalir. Edit mode: TIDAK di-gate (admin tweak bebas, termasuk iklan legacy
 *     yang belum punya tier).
 *
 * History:
 *   - Batch 1 (16 Mei 2026): 3 section + placeholder Batch 2
 *   - Batch 2 (16 Mei 2026): + Schedule section + DCA section
 *   - SESI 5E Phase 3b: DCA section eliminated (per-posisi modal di Targeting)
 *   - SESI 11 Spine Batch 1 (30 Mei 2026): gated spine
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Save,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AdFormProvider,
  useAdForm,
} from './AdFormProvider';
import AdFormSectionAdvertiser from './AdFormSectionAdvertiser';
import AdFormSectionCreative from './AdFormSectionCreative';
import AdFormSectionTargeting from './AdFormSectionTargeting';
import AdFormSectionSchedule from './AdFormSectionSchedule';
// SESI 5E Phase 3b: AdFormSectionDCA ELIMINATED — DCA per-position handled di PositionCreativeModal

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
    state,
    isEditMode,
    isDraftAd,
    isSubmitting,
    submitError,
    errors,
    isDirty,
    loadingExisting,
    submit,
    submitDraft,
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
        isEditMode
          ? (isDraftAd ? '✓ Draft difinalisasi & tayang' : '✓ Iklan berhasil di-update')
          : '✓ Iklan berhasil ditambahkan',
        'ok'
      );
      setTimeout(() => router.push('/admin/ads'), 800);
    } else {
      showToast(result.error, 'err');
    }
  };

  // SESI 11 (31 Mei 2026): Simpan sebagai draft (loket santai — skip validasi).
  const handleSaveDraft = async () => {
    const result = await submitDraft();
    if (result.ok) {
      showToast('✓ Tersimpan sebagai draft', 'ok');
      setTimeout(() => router.push('/admin/ads'), 800);
    } else {
      showToast(result.error, 'err');
    }
  };

  // Loading state saat fetch existing ad untuk edit
  if (loadingExisting) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <Loader2 className="text-ads animate-spin mb-3" size={32} />
        <p className="text-[13px] text-text-muted">Memuat data iklan untuk edit...</p>
      </div>
    );
  }

  const hasErrors = errors.length > 0;

  // ─── SESI 11 Spine Batch 1: Langkah 1 (anchor) beres? ───
  // Picker mode: advertiser + paket dipilih.
  // Mode Cepat: nama + tipe + paket.
  // Edit mode: SELALU bebas (jangan ngunci tweak iklan lama yang belum punya tier).
  const step1Done =
    isEditMode ||
    (!!state.pricing_tier_id &&
      (state.use_free_text_mode
        ? state.advertiser_name.trim() !== '' && Boolean(state.advertiser_type)
        : state.advertiser_account_id !== null));

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
              : 'Mulai dari Langkah 1 (pilih advertiser + paket). Materi, posisi, dan jadwal kebuka setelahnya.'}
          </p>
        </div>
      </div>

      {/* ─── Spine: Langkah 1 = anchor (selalu tampil) ─── */}
      <AdFormSectionAdvertiser />

      {/* ─── Langkah 2-4: ke-lock sampai Langkah 1 beres (create mode) ─── */}
      {step1Done ? (
        <>
          <AdFormSectionCreative />
          <AdFormSectionTargeting />
          <AdFormSectionSchedule />
        </>
      ) : (
        <LockedStepsHint />
      )}

      {/* Validation summary (kalau ada error) */}
      {hasErrors && (
        <div className="bg-status-critical/8 border border-status-critical/30 rounded-xl p-3">
          <p className="text-[11px] font-bold text-status-critical mb-1.5 uppercase tracking-wide">
            ⚠ Form belum valid ({errors.length} error)
          </p>
          <ul className="text-[10px] text-status-critical space-y-0.5">
            {errors.slice(0, 6).map((e, i) => (
              <li key={i}>
                • <strong>{e.field}:</strong> {e.message}
              </li>
            ))}
            {errors.length > 6 && (
              <li className="italic">...dan {errors.length - 6} error lain</li>
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
            ) : !step1Done ? (
              <p className="text-[11px] text-text-muted">
                Selesaikan Langkah 1 dulu (advertiser + paket)
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
            {/* SESI 11: Simpan Draft — tampil saat create ATAU edit iklan draft.
                Iklan yg udah tayang/pending TIDAK bisa diturunkan jadi draft. */}
            {(!isEditMode || isDraftAd) && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSubmitting || !state.title.trim()}
                title={
                  !state.title.trim()
                    ? 'Isi judul dulu untuk simpan draft'
                    : 'Simpan tanpa validasi penuh — lanjut kapan aja'
                }
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold',
                  'bg-surface border border-border text-text-muted hover:text-text hover:bg-surface-muted transition-colors',
                  'disabled:opacity-50 disabled:cursor-not-allowed'
                )}
              >
                <FileText size={14} />
                Simpan Draft
              </button>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={hasErrors || isSubmitting || !step1Done}
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
                  ? (isDraftAd ? 'Finalisasi & Tayang' : 'Simpan Perubahan')
                  : 'Simpan Iklan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SESI 11 Spine Batch 1: placeholder saat langkah lanjutan masih terkunci ───
function LockedStepsHint() {
  const steps = [
    { n: 2, label: 'Konten Kreatif',           desc: 'Materi iklan (gambar / dinamis / advertorial)' },
    { n: 3, label: 'Targeting Posisi & Wilayah', desc: 'Di mana iklan tayang' },
    { n: 4, label: 'Jadwal Tayang',            desc: 'Kapan iklan mulai & berhenti' },
  ];

  return (
    <div className="bg-surface border border-dashed border-border rounded-xl p-4">
      <div className="flex items-start gap-2.5 mb-3">
        <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-muted text-text-muted shrink-0">
          <Lock size={15} />
        </span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-text">
            Langkah berikutnya kebuka otomatis
          </p>
          <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
            Pilih <strong>advertiser</strong> + <strong>paket</strong> di Langkah 1 dulu.
            Tipe, harga, posisi, durasi, sebagian besar ngikut otomatis dari paket.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2 pl-1">
        {steps.map((s) => (
          <div
            key={s.n}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-muted/40 opacity-60"
          >
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface text-text-muted text-[11px] font-bold shrink-0">
              {s.n}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-bold text-text-muted truncate">{s.label}</p>
              <p className="text-[10px] text-text-subtle truncate">{s.desc}</p>
            </div>
            <Lock size={12} className="text-text-subtle shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

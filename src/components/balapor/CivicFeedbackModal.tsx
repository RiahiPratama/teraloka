'use client';

// ════════════════════════════════════════════════════════════════
// CIVIC FEEDBACK MODAL — Sub-Sprint 1C-B.3
// ────────────────────────────────────────────────────────────────
// Modal untuk pelapor submit civic feedback (update tindak lanjut).
//
// Layout:
//   - Mobile: bottom sheet (slide-up dari bawah)
//   - Desktop: center modal dengan backdrop
//
// Form fields:
//   - Status: 4 radio cards (belum_ditangani / sedang_ditangani /
//     sudah_selesai / tidak_jelas) — required
//   - Catatan: textarea optional, max 500 chars
//   - Foto bukti: ImageUpload reuse (bucket "reports", max 3 files)
//
// Submit:
//   - POST /balapor/reports/me/:id/follow-ups
//   - Loading state saat submit
//   - Success: toast.success + close modal + optimistic update parent
//   - Error: toast.error + inline message + keep modal open
//
// Validation:
//   - Status required (button submit disabled sampai dipilih)
//   - Note max 500 chars (counter visual)
//   - Photo via ImageUpload (built-in validation)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/Toast';
import ImageUpload from '@/components/ui/ImageUpload';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ─── Types ──────────────────────────────────────────────────────

type FollowUpStatus =
  | 'belum_ditangani'
  | 'sedang_ditangani'
  | 'sudah_selesai'
  | 'tidak_jelas';

interface CivicFeedbackModalProps {
  reportId: string;
  reportDisplayId: string | null;
  reportTitle: string;
  currentStatus: FollowUpStatus | null;
  onClose: () => void;
  onSubmitSuccess: (newStatus: FollowUpStatus, updatedAt: string) => void;
}

// ─── Status options ─────────────────────────────────────────────

const STATUS_OPTIONS: {
  value: FollowUpStatus;
  icon: string;
  label: string;
  description: string;
  activeBg: string;
  activeBorder: string;
  activeText: string;
}[] = [
  {
    value: 'belum_ditangani',
    icon: '⚠️',
    label: 'Belum ditangani',
    description: 'Belum ada perbaikan terlihat',
    activeBg: 'bg-amber-50',
    activeBorder: 'border-amber-400',
    activeText: 'text-amber-700',
  },
  {
    value: 'sedang_ditangani',
    icon: '🔧',
    label: 'Sedang ditangani',
    description: 'Ada tindakan terlihat, belum selesai',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-400',
    activeText: 'text-blue-700',
  },
  {
    value: 'sudah_selesai',
    icon: '✅',
    label: 'Sudah selesai',
    description: 'Masalah teratasi sepenuhnya',
    activeBg: 'bg-green-50',
    activeBorder: 'border-green-400',
    activeText: 'text-green-700',
  },
  {
    value: 'tidak_jelas',
    icon: '❓',
    label: 'Tidak jelas',
    description: 'Kondisi sama, status ambigu',
    activeBg: 'bg-gray-50',
    activeBorder: 'border-gray-400',
    activeText: 'text-gray-700',
  },
];

const NOTE_MAX_LENGTH = 500;

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function CivicFeedbackModal({
  reportId,
  reportDisplayId,
  reportTitle,
  currentStatus,
  onClose,
  onSubmitSuccess,
}: CivicFeedbackModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();

  const [selectedStatus, setSelectedStatus] = useState<FollowUpStatus | null>(currentStatus);
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Lock body scroll saat modal open + handle Escape key
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose, submitting]);

  async function handleSubmit() {
    if (!selectedStatus) return;
    if (submitting) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(
        `${API_URL}/balapor/reports/me/${reportId}/follow-ups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: selectedStatus,
            note: note.trim() || undefined,
            photos: photos.length > 0 ? photos : undefined,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        // Error mapping berdasarkan response code
        const apiError = data.error;
        const errorMessage =
          (typeof apiError === 'string' ? apiError : apiError?.message) ||
          'Gagal menyimpan tindak lanjut. Coba lagi.';

        setErrorMsg(errorMessage);
        toast.error(errorMessage);
        return;
      }

      // Success — update parent state + close modal
      const followUp = data.data;
      const updatedAt = followUp?.created_at || new Date().toISOString();

      toast.success('Tindak lanjut tersimpan. Terima kasih sudah membantu!');
      onSubmitSuccess(selectedStatus, updatedAt);
    } catch (err) {
      const errorMessage = 'Koneksi bermasalah. Pastikan internet aktif.';
      setErrorMsg(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="civic-feedback-modal-title"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !submitting && onClose()}
      />

      {/* Modal panel — bottom sheet mobile, center desktop */}
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2
              id="civic-feedback-modal-title"
              className="text-base font-bold text-gray-900"
            >
              Update Status Tindak Lanjut
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              <span className="font-mono mr-1">{reportDisplayId || '#—'}</span>
              · {reportTitle}
            </p>
          </div>
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="text-gray-400 hover:text-gray-600 p-1 disabled:opacity-50 shrink-0"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Status radio cards */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">
              Status terkini di lokasi <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isActive = selectedStatus === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedStatus(opt.value)}
                    disabled={submitting}
                    type="button"
                    className={`text-left border-2 rounded-lg p-3 transition-all disabled:opacity-50 ${
                      isActive
                        ? `${opt.activeBg} ${opt.activeBorder}`
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-base">{opt.icon}</span>
                      <span
                        className={`text-sm font-semibold ${
                          isActive ? opt.activeText : 'text-gray-900'
                        }`}
                      >
                        {opt.label}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      {opt.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Catatan */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="follow-up-note"
                className="text-sm font-semibold text-gray-900"
              >
                Catatan
              </label>
              <span className="text-xs text-gray-400">
                {note.length}/{NOTE_MAX_LENGTH}
              </span>
            </div>
            <textarea
              id="follow-up-note"
              value={note}
              onChange={(e) => {
                if (e.target.value.length <= NOTE_MAX_LENGTH) {
                  setNote(e.target.value);
                }
              }}
              disabled={submitting}
              placeholder="Contoh: Sudah ada perbaikan parsial, tapi rambu jalan masih hilang..."
              rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none disabled:bg-gray-50"
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional. Detail tambahan kondisi di lokasi.
            </p>
          </div>

          {/* Photo upload */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-2">
              Foto bukti terkini
            </p>
            <ImageUpload
              bucket="reports"
              onUpload={setPhotos}
              existingUrls={photos}
              label=""
            />
            <p className="text-xs text-gray-500 mt-1">
              Optional. Maks 3 foto, 3 MB per foto.
            </p>
          </div>

          {/* Error message inline */}
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 rounded-lg p-3">
              <p className="text-sm text-rose-700 font-medium">⚠️ {errorMsg}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 p-4 border-t border-gray-100 shrink-0 bg-gray-50">
          <button
            onClick={() => !submitting && onClose()}
            disabled={submitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!selectedStatus || submitting}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Mengirim...</span>
              </>
            ) : (
              <span>Kirim Update</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

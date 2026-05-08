'use client';

/**
 * TeraLoka — DeleteReportModal
 * Sub-Sprint 1C-C-3 — Soft Delete Workflow
 * ------------------------------------------------------------
 * Modal untuk soft delete laporan dengan reason picker + notes + redact option.
 *
 * Backend endpoint: POST /admin/balapor/:id/soft-delete (super_admin only)
 *
 * Validation:
 *   - reason WAJIB pilih (8 enum)
 *   - notes WAJIB minimal 10 karakter
 *   - redact_content auto-true untuk hoax/fitnah/PII (bisa override)
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type DeleteReason =
  | 'hoax_terverifikasi'
  | 'fitnah_namabaikseseorang'
  | 'data_pribadi_terbuka'
  | 'duplikat'
  | 'spam_automated'
  | 'pelapor_request_hapus'
  | 'legal_takedown'
  | 'lainnya';

interface ReasonOption {
  value: DeleteReason;
  label: string;
  description: string;
  autoRedact: boolean;
  severity: 'critical' | 'warning' | 'normal';
}

const REASON_OPTIONS: ReasonOption[] = [
  {
    value: 'hoax_terverifikasi',
    label: 'Hoax Terverifikasi',
    description: 'Laporan terbukti hoax setelah investigasi tim moderasi',
    autoRedact: true,
    severity: 'critical',
  },
  {
    value: 'fitnah_namabaikseseorang',
    label: 'Fitnah / Pencemaran Nama Baik',
    description: 'Konten menyerang individu/lembaga tanpa bukti',
    autoRedact: true,
    severity: 'critical',
  },
  {
    value: 'data_pribadi_terbuka',
    label: 'Data Pribadi Terbuka (PII)',
    description: 'Mengandung informasi pribadi yang tidak seharusnya publik',
    autoRedact: true,
    severity: 'critical',
  },
  {
    value: 'spam_automated',
    label: 'Spam Otomatis',
    description: 'Konten generik / bot spam',
    autoRedact: true,
    severity: 'warning',
  },
  {
    value: 'duplikat',
    label: 'Duplikat',
    description: 'Sudah ada laporan serupa untuk lokasi/kasus sama',
    autoRedact: false,
    severity: 'normal',
  },
  {
    value: 'pelapor_request_hapus',
    label: 'Permintaan Pelapor',
    description: 'Pelapor minta laporannya dihapus',
    autoRedact: false,
    severity: 'normal',
  },
  {
    value: 'legal_takedown',
    label: 'Legal Takedown',
    description: 'Permintaan resmi dari pihak berwenang',
    autoRedact: false,
    severity: 'warning',
  },
  {
    value: 'lainnya',
    label: 'Lainnya',
    description: 'Alasan di luar kategori (jelaskan di catatan)',
    autoRedact: false,
    severity: 'normal',
  },
];

const AUTO_REDACT_REASONS: DeleteReason[] = [
  'hoax_terverifikasi',
  'fitnah_namabaikseseorang',
  'data_pribadi_terbuka',
  'spam_automated',
];

export interface DeleteReportModalProps {
  /** Report yang akan dihapus (modal visible kalau != null) */
  report: { id: string; title: string; display_id: string | null } | null;
  /** Callback close modal tanpa submit */
  onClose: () => void;
  /** Callback submit — caller handle API call + toast + refetch */
  onSubmit: (params: {
    reportId: string;
    reason: DeleteReason;
    notes: string;
    redactContent: boolean;
  }) => Promise<void>;
}

export function DeleteReportModal({ report, onClose, onSubmit }: DeleteReportModalProps) {
  const [reason, setReason] = useState<DeleteReason | ''>('');
  const [notes, setNotes] = useState('');
  const [redactContent, setRedactContent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Reset state saat modal opened
  useEffect(() => {
    if (report) {
      setReason('');
      setNotes('');
      setRedactContent(false);
      setSubmitting(false);
    }
  }, [report]);

  // Auto-set redact_content saat reason berubah ke critical
  useEffect(() => {
    if (reason && AUTO_REDACT_REASONS.includes(reason as DeleteReason)) {
      setRedactContent(true);
    } else {
      setRedactContent(false);
    }
  }, [reason]);

  if (!report) return null;

  const isValid = reason !== '' && notes.trim().length >= 10;
  const selectedOption = REASON_OPTIONS.find(o => o.value === reason);

  async function handleSubmit() {
    if (!isValid || !report) return;
    setSubmitting(true);
    try {
      await onSubmit({
        reportId: report.id,
        reason: reason as DeleteReason,
        notes: notes.trim(),
        redactContent,
      });
      onClose();
    } catch {
      // Caller handle error toast — keep modal open
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-modal-title"
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-status-critical/8">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-status-critical/15 flex items-center justify-center shrink-0">
              <AlertTriangle size={20} className="text-status-critical" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="delete-modal-title" className="text-base font-bold text-text">
                Hapus Laporan
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                <span className="font-mono">{report.display_id || '#—'}</span>
                {' · '}
                <span className="truncate">{report.title}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="text-text-muted hover:text-text transition-colors p-1 rounded-md hover:bg-surface-muted disabled:opacity-50"
            aria-label="Tutup modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-5">
          {/* Reason picker */}
          <div>
            <label className="text-xs font-bold text-text uppercase tracking-wider mb-2 block">
              Alasan Hapus <span className="text-status-critical">*</span>
            </label>
            <div className="grid gap-2">
              {REASON_OPTIONS.map(opt => {
                const isSelected = reason === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setReason(opt.value)}
                    disabled={submitting}
                    className={cn(
                      'text-left p-3 rounded-lg border-2 transition-all',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30',
                      isSelected
                        ? opt.severity === 'critical'
                          ? 'border-status-critical bg-status-critical/8'
                          : opt.severity === 'warning'
                            ? 'border-status-warning bg-status-warning/8'
                            : 'border-balapor bg-balapor/8'
                        : 'border-border bg-surface hover:bg-surface-muted',
                      submitting && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-text mb-0.5">
                          {opt.label}
                          {opt.autoRedact && (
                            <span className="ml-2 text-[10px] uppercase font-bold tracking-wider text-status-critical">
                              auto-redact
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted">{opt.description}</div>
                      </div>
                      {isSelected && (
                        <div
                          className={cn(
                            'shrink-0 h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold text-white',
                            opt.severity === 'critical'
                              ? 'bg-status-critical'
                              : opt.severity === 'warning'
                                ? 'bg-status-warning'
                                : 'bg-balapor'
                          )}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="delete-notes" className="text-xs font-bold text-text uppercase tracking-wider mb-2 block">
              Catatan Detail <span className="text-status-critical">*</span>
              <span className="ml-2 text-text-muted font-normal normal-case tracking-normal">
                (minimal 10 karakter)
              </span>
            </label>
            <textarea
              id="delete-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              disabled={submitting}
              rows={4}
              placeholder="Jelaskan konteks/bukti dasar penghapusan untuk audit log forensic..."
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border bg-surface',
                'text-sm text-text placeholder:text-text-subtle',
                'focus:outline-none focus:ring-2',
                'disabled:opacity-50',
                'resize-none',
                // Sub-Sprint 1C-C-9 — visual error state
                reason && notes.trim().length > 0 && notes.trim().length < 10
                  ? 'border-status-critical/60 focus:ring-status-critical/30 focus:border-status-critical'
                  : 'border-border focus:ring-balapor/30 focus:border-balapor'
              )}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-text-muted">
                {notes.trim().length < 10
                  ? `${10 - notes.trim().length} karakter lagi`
                  : '✓ Cukup'}
              </span>
              <span className="text-[11px] text-text-muted tabular-nums">
                {notes.length} karakter
              </span>
            </div>
          </div>

          {/* Redact checkbox */}
          <div className="bg-surface-muted/50 rounded-lg p-3 border border-border">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={redactContent}
                onChange={e => setRedactContent(e.target.checked)}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 rounded border-border accent-status-critical disabled:opacity-50"
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text">
                  Redact konten (pseudonymize)
                </div>
                <div className="text-xs text-text-muted mt-0.5">
                  Replace title + body dengan placeholder. Hash original disimpan untuk forensic recovery.
                  {selectedOption?.autoRedact && (
                    <span className="block mt-1 text-status-critical font-medium">
                      Auto-checked karena alasan ini sensitif.
                    </span>
                  )}
                </div>
              </div>
            </label>
          </div>

          {/* Warning footer */}
          <div className="bg-status-warning/8 border border-status-warning/20 rounded-lg p-3">
            <p className="text-xs text-text leading-relaxed">
              <span className="font-bold text-status-warning">⚠️ Soft Delete:</span>{' '}
              Laporan akan disembunyikan dari pelapor + listing publik. Audit trail dipertahankan,
              data bisa di-restore via tab Audit Log.
            </p>
          </div>

          {/* Validation error banner (Sub-Sprint 1C-C-9 UX fix) */}
          {!isValid && (reason || notes.length > 0) && (
            <div className="bg-status-critical/8 border border-status-critical/30 rounded-lg p-3">
              <p className="text-xs text-status-critical font-semibold flex items-center gap-2">
                <AlertTriangle size={13} />
                {!reason && 'Pilih alasan hapus dulu'}
                {reason && notes.trim().length < 10 && `Catatan detail wajib minimal 10 karakter (sekarang ${notes.trim().length})`}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-muted/30 flex items-center justify-end gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={onClose}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? 'Menghapus…' : 'Hapus Laporan'}
          </Button>
        </div>
      </div>
    </div>
  );
}

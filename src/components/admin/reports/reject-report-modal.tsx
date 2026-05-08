'use client';

/**
 * TeraLoka — RejectReportModal
 * Sub-Sprint 1C-C-9 — Replace window.prompt() dengan modal proper
 * ------------------------------------------------------------
 * Modal untuk reject laporan dengan reason picker.
 *
 * Validation:
 *   - reason WAJIB minimal 10 karakter
 *   - Reason ditampilkan ke pelapor (transparency)
 */

import { useEffect, useState } from 'react';
import { XCircle, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const COMMON_REASONS = [
  'Informasi tidak lengkap atau tidak jelas',
  'Tidak terbukti / tidak ada bukti pendukung',
  'Sudah ada laporan sama sebelumnya (duplikat)',
  'Kategori salah — bukan ranah BALAPOR',
  'Konten tidak sesuai — pakai bahasa yang lebih sopan',
];

export interface RejectReportModalProps {
  /** Report yang akan di-reject (modal visible kalau != null) */
  report: { id: string; title: string; display_id: string | null } | null;
  /** Callback close modal tanpa submit */
  onClose: () => void;
  /** Callback submit — caller handle API call + toast + refetch */
  onSubmit: (params: {
    reportId: string;
    reason: string;
  }) => Promise<void>;
}

export function RejectReportModal({ report, onClose, onSubmit }: RejectReportModalProps) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Reset state saat modal opened
  useEffect(() => {
    if (report) {
      setReason('');
      setSubmitting(false);
    }
  }, [report]);

  if (!report) return null;

  const isValid = reason.trim().length >= 10;

  async function handleSubmit() {
    if (!isValid || !report) return;
    setSubmitting(true);
    try {
      await onSubmit({
        reportId: report.id,
        reason: reason.trim(),
      });
      onClose();
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reject-modal-title"
    >
      <div className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-status-warning/8">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-status-warning/15 flex items-center justify-center shrink-0">
              <XCircle size={20} className="text-status-warning" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="reject-modal-title" className="text-base font-bold text-text">
                Tolak Laporan
              </h2>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                <span className="font-mono">{report.display_id || '#—'}</span>
                {' · '}
                <span>{report.title}</span>
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
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {/* Quick reason templates */}
          <div>
            <label className="text-xs font-bold text-text uppercase tracking-wider mb-2 block">
              Template Cepat
            </label>
            <div className="space-y-1.5">
              {COMMON_REASONS.map((tpl) => (
                <button
                  key={tpl}
                  type="button"
                  onClick={() => setReason(tpl)}
                  disabled={submitting}
                  className={cn(
                    'w-full text-left px-3 py-2 rounded-lg border text-xs',
                    'transition-colors',
                    reason === tpl
                      ? 'border-status-warning bg-status-warning/8 text-text'
                      : 'border-border bg-surface hover:bg-surface-muted text-text-muted hover:text-text',
                    submitting && 'opacity-50 cursor-not-allowed'
                  )}
                >
                  {tpl}
                </button>
              ))}
            </div>
          </div>

          {/* Custom reason textarea */}
          <div>
            <label htmlFor="reject-reason" className="text-xs font-bold text-text uppercase tracking-wider mb-2 block">
              Alasan Detail <span className="text-status-warning">*</span>
              <span className="ml-2 text-text-muted font-normal normal-case tracking-normal">
                (min 10 karakter — akan ditampilkan ke pelapor)
              </span>
            </label>
            <textarea
              id="reject-reason"
              value={reason}
              onChange={e => setReason(e.target.value)}
              disabled={submitting}
              rows={3}
              placeholder="Jelaskan alasan penolakan dengan jelas dan sopan..."
              className={cn(
                'w-full px-3 py-2.5 rounded-lg border border-border bg-surface',
                'text-sm text-text placeholder:text-text-subtle',
                'focus:outline-none focus:ring-2 focus:ring-status-warning/30 focus:border-status-warning',
                'disabled:opacity-50 resize-none'
              )}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[11px] text-text-muted">
                {reason.trim().length < 10
                  ? `${10 - reason.trim().length} karakter lagi`
                  : '✓ Cukup'}
              </span>
              <span className="text-[11px] text-text-muted tabular-nums">
                {reason.length} karakter
              </span>
            </div>
          </div>

          {/* Info footer */}
          <div className="bg-status-warning/8 border border-status-warning/20 rounded-lg p-3">
            <p className="text-xs text-text leading-relaxed">
              <span className="font-bold text-status-warning">⚠️ Penolakan:</span>{' '}
              Status laporan jadi <strong>rejected</strong>. Alasan ini akan terlihat
              oleh pelapor. Pelapor bisa submit ulang kalau perbaiki masalah.
            </p>
          </div>
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
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            disabled={!isValid || submitting}
          >
            {submitting ? 'Menolak…' : 'Tolak Laporan'}
          </Button>
        </div>
      </div>
    </div>
  );
}

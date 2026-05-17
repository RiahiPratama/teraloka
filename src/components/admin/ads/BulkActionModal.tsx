'use client';

/**
 * TeraLoka — BulkActionModal
 * Sub-Phase 8-E-6 Mini B (17 Mei 2026)
 * ------------------------------------------------------------
 * Custom themed modal untuk konfirmasi bulk action.
 * Replace native window.confirm() + window.prompt() pattern.
 *
 * 3 action variants:
 *   - pause       — list preview, no reason input
 *   - resume      — list preview, no reason input
 *   - soft_delete — list preview + reason textarea (min 5 chars)
 *
 * Pattern reuse: mirror DeleteAdModal + RejectAdModal structure.
 */

import { useState, useEffect } from 'react';
import { X, Pause, Play, Trash2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdRow } from './AdsCommandCenter';
import type { BulkActionType } from './AdsTable';

export interface BulkActionModalProps {
  action: BulkActionType | null;
  ads: AdRow[]; // ads eligible untuk action ini
  onConfirm: (action: BulkActionType, adIds: string[], reason?: string) => Promise<void>;
  onClose: () => void;
}

const ACTION_CONFIG: Record<BulkActionType, {
  title:        string;
  verb:         string;
  description:  string;
  icon:         typeof Pause;
  iconClass:    string;
  confirmClass: string;
  confirmText:  string;
  requiresReason: boolean;
}> = {
  pause: {
    title:          'Pause Iklan',
    verb:           'pause',
    description:    'Iklan akan berhenti tayang sementara. Bisa di-resume kapan saja.',
    icon:           Pause,
    iconClass:      'text-status-info bg-status-info/12',
    confirmClass:   'bg-status-info hover:bg-status-info/90',
    confirmText:    'Pause Sekarang',
    requiresReason: false,
  },
  resume: {
    title:          'Resume Iklan',
    verb:           'resume',
    description:    'Iklan akan kembali tayang aktif di posisi yang ditentukan.',
    icon:           Play,
    iconClass:      'text-status-healthy bg-status-healthy/12',
    confirmClass:   'bg-status-healthy hover:bg-status-healthy/90',
    confirmText:    'Resume Sekarang',
    requiresReason: false,
  },
  soft_delete: {
    title:          'Hapus Iklan ke Sampah',
    verb:           'hapus',
    description:    'Iklan dipindah ke Sampah. Bisa di-restore selama 30 hari sebelum permanent delete.',
    icon:           Trash2,
    iconClass:      'text-balapor bg-balapor/12',
    confirmClass:   'bg-balapor hover:bg-balapor/90',
    confirmText:    'Hapus ke Sampah',
    requiresReason: true,
  },
};

const MAX_PREVIEW = 5;

export default function BulkActionModal({
  action,
  ads,
  onConfirm,
  onClose,
}: BulkActionModalProps) {
  const [reason, setReason]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  // Reset state saat modal open
  useEffect(() => {
    if (action) {
      setReason('');
      setError(null);
      setSubmitting(false);
    }
  }, [action]);

  if (!action) return null;

  const config = ACTION_CONFIG[action];
  const Icon = config.icon;
  const previewAds = ads.slice(0, MAX_PREVIEW);
  const remainingCount = Math.max(0, ads.length - MAX_PREVIEW);

  const handleSubmit = async () => {
    setError(null);

    // Validate reason untuk soft_delete
    if (config.requiresReason) {
      const trimmed = reason.trim();
      if (trimmed.length < 5) {
        setError('Alasan minimal 5 karakter');
        return;
      }
    }

    setSubmitting(true);
    try {
      const adIds = ads.map((a) => a.id);
      await onConfirm(
        action,
        adIds,
        config.requiresReason ? reason.trim() : undefined
      );
    } catch (err: any) {
      setError(err?.message ?? 'Gagal memproses');
      setSubmitting(false);
    }
    // Note: gak setSubmitting(false) di success — parent akan close modal
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onClose();
      }}
    >
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('flex items-center justify-center w-10 h-10 rounded-lg shrink-0', config.iconClass)}>
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[15px] font-extrabold text-text">
                {config.title}
              </h3>
              <p className="text-[11px] text-text-muted mt-0.5">
                {ads.length} iklan akan di-{config.verb}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              'p-1.5 rounded-md hover:bg-surface-muted transition-colors shrink-0',
              submitting && 'opacity-50 cursor-not-allowed'
            )}
            title="Tutup"
          >
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          <p className="text-[12px] text-text-muted leading-relaxed">
            {config.description}
          </p>

          {/* Preview list */}
          <div className="bg-surface-muted/40 rounded-lg p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Iklan yang akan di-{config.verb}:
            </p>
            <ul className="flex flex-col gap-1.5">
              {previewAds.map((ad) => (
                <li
                  key={ad.id}
                  className="flex items-center gap-2 text-[12px] text-text"
                >
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-ads shrink-0" />
                  <span className="truncate flex-1 font-semibold">
                    {ad.title ?? '(no title)'}
                  </span>
                  <span className="text-[10px] text-text-muted shrink-0 truncate max-w-[120px]">
                    {ad.advertiser_name}
                  </span>
                </li>
              ))}
              {remainingCount > 0 && (
                <li className="text-[11px] text-text-muted italic pl-3.5 mt-1">
                  +{remainingCount} iklan lainnya
                </li>
              )}
            </ul>
          </div>

          {/* Reason textarea (soft_delete only) */}
          {config.requiresReason && (
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="bulk-reason"
                className="text-[11px] font-bold uppercase tracking-wider text-text"
              >
                Alasan <span className="text-status-critical">*</span>
              </label>
              <textarea
                id="bulk-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={submitting}
                rows={3}
                placeholder="Min 5 karakter. Applied untuk semua iklan di batch ini."
                className={cn(
                  'w-full px-3 py-2 rounded-lg',
                  'bg-surface border border-border',
                  'text-[12px] text-text placeholder:text-text-subtle',
                  'focus:outline-none focus:border-balapor/50 focus:ring-2 focus:ring-balapor/20',
                  'resize-none transition-all',
                  submitting && 'opacity-50 cursor-not-allowed'
                )}
              />
              <p className="text-[10px] text-text-muted">
                {reason.trim().length}/5 min · Tersimpan di audit log per iklan
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-status-critical/8 border border-status-critical/30">
              <AlertTriangle size={14} className="text-status-critical shrink-0" />
              <span className="text-[11px] font-semibold text-status-critical">
                {error}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              'px-4 py-1.5 rounded-md',
              'bg-surface border border-border text-text',
              'text-[11px] font-bold uppercase tracking-wide',
              'hover:bg-surface-muted transition-colors',
              submitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className={cn(
              'px-4 py-1.5 rounded-md text-white',
              'text-[11px] font-bold uppercase tracking-wide',
              'transition-colors shadow-sm',
              config.confirmClass,
              submitting && 'opacity-50 cursor-not-allowed'
            )}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Memproses...
              </span>
            ) : (
              config.confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

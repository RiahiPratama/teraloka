'use client';

/**
 * TeraLoka — DeleteAdModal
 * Mission 8 Sub-Phase 8-C-2
 * ------------------------------------------------------------
 * Soft delete modal — replace window.prompt yang ugly.
 *
 * Features:
 *   - 5 preset reasons (radio-style pills) + custom reason text
 *   - Mandatory reason min 5 chars (validate inline)
 *   - Escape key untuk cancel
 *   - Click backdrop untuk cancel
 *   - Loading state saat submit
 *   - Warning copy: soft delete = bisa di-restore
 *
 * Pattern mirror BALAPOR delete-report-modal.tsx (Tailwind utility).
 *
 * History:
 *   - 16 Mei 2026: NEW (Sub-Phase 8-C-2)
 */

import { useState, useEffect, useRef } from 'react';
import { Trash2, X, AlertTriangle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeleteAdModalProps {
  /** Ad object yang akan dihapus (untuk display title) */
  ad: {
    id:    string;
    title: string | null;
    advertiser_name: string;
  } | null;
  /** Callback saat user confirm — return Promise supaya bisa show loading */
  onConfirm: (adId: string, reason: string) => Promise<void>;
  /** Callback saat user cancel atau close */
  onClose: () => void;
}

// 5 preset reasons untuk soft delete
const PRESET_REASONS = [
  { value: 'request_advertiser', label: 'Request dari advertiser' },
  { value: 'duplicate_listing',  label: 'Duplikat iklan / data salah' },
  { value: 'quality_issues',     label: 'Kualitas konten / gambar buruk' },
  { value: 'contract_ended',     label: 'Kontrak selesai / refund' },
  { value: 'custom',             label: 'Alasan lain (tulis sendiri)' },
];

export default function DeleteAdModal({ ad, onConfirm, onClose }: DeleteAdModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('request_advertiser');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const customInputRef = useRef<HTMLTextAreaElement>(null);

  // Escape key handler
  useEffect(() => {
    if (!ad) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ad, loading, onClose]);

  // Auto-focus custom input saat "custom" dipilih
  useEffect(() => {
    if (selectedReason === 'custom' && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [selectedReason]);

  // Reset state saat modal close/open
  useEffect(() => {
    if (ad) {
      setSelectedReason('request_advertiser');
      setCustomReason('');
      setError(null);
      setLoading(false);
    }
  }, [ad]);

  if (!ad) return null;

  // Compute final reason text
  const finalReason =
    selectedReason === 'custom'
      ? customReason.trim()
      : PRESET_REASONS.find((r) => r.value === selectedReason)?.label ?? '';

  const isValid = finalReason.length >= 5;

  const handleSubmit = async () => {
    if (!isValid) {
      setError('Alasan minimal 5 karakter');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onConfirm(ad.id, finalReason);
      // Parent akan close modal via setState
    } catch (err: any) {
      setError(err?.message ?? 'Gagal menghapus iklan');
      setLoading(false);
    }
  };

  const adTitle = ad.title ?? '(no title)';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-balapor/12 text-balapor shrink-0">
              <Trash2 size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-text leading-tight">
                Hapus Iklan ke Sampah?
              </h2>
              <p className="text-[11px] text-text-muted mt-1 line-clamp-2">
                <span className="font-semibold text-text">{adTitle}</span>
                {' · '}
                {ad.advertiser_name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="text-text-muted hover:text-text p-1 rounded-md hover:bg-surface-muted transition-colors shrink-0 disabled:opacity-50"
            title="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="p-5 flex flex-col gap-4">
          {/* Info banner */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-info/8 border border-status-info/20">
            <AlertTriangle size={14} className="text-status-info shrink-0 mt-0.5" />
            <p className="text-[11px] text-status-info leading-relaxed">
              <strong>Soft delete</strong> — iklan dipindah ke Sampah dengan jejak audit.
              Bisa dipulihkan kapan saja via Restore.
            </p>
          </div>

          {/* Preset reasons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Alasan Hapus <span className="text-status-critical">*</span>
            </label>
            <div className="flex flex-col gap-1.5">
              {PRESET_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                    selectedReason === r.value
                      ? 'bg-balapor/8 border-balapor/40'
                      : 'bg-surface border-border hover:bg-surface-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="delete-reason"
                    value={r.value}
                    checked={selectedReason === r.value}
                    onChange={() => setSelectedReason(r.value)}
                    disabled={loading}
                    className="accent-balapor"
                  />
                  <span
                    className={cn(
                      'text-[12px]',
                      selectedReason === r.value
                        ? 'font-semibold text-text'
                        : 'text-text-muted'
                    )}
                  >
                    {r.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom reason textarea (visible kalau 'custom' dipilih) */}
          {selectedReason === 'custom' && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
                Tulis alasan
              </label>
              <textarea
                ref={customInputRef}
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                disabled={loading}
                rows={3}
                placeholder="Min 5 karakter — dicatat di audit log."
                className={cn(
                  'w-full px-3 py-2 rounded-lg resize-none',
                  'bg-surface border border-border',
                  'text-[12px] text-text placeholder:text-text-subtle',
                  'focus:outline-none focus:border-balapor/50 focus:ring-2 focus:ring-balapor/20',
                  'transition-all',
                  'disabled:opacity-50'
                )}
              />
              <p className="text-[10px] text-text-muted mt-1">
                {customReason.length} karakter
              </p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-status-critical/8 border border-status-critical/30">
              <AlertTriangle size={12} className="text-status-critical shrink-0" />
              <p className="text-[11px] text-status-critical font-semibold">{error}</p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-end gap-2 p-5 border-t border-border bg-surface-muted/30">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className={cn(
              'px-4 py-2 rounded-lg text-[12px] font-bold',
              'bg-surface border border-border text-text-muted',
              'hover:bg-surface-muted hover:text-text transition-colors',
              'disabled:opacity-50'
            )}
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!isValid || loading}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[12px] font-bold text-white',
              'bg-balapor hover:bg-balapor-strong transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            {loading ? 'Menghapus...' : 'Hapus ke Sampah'}
          </button>
        </div>
      </div>
    </div>
  );
}

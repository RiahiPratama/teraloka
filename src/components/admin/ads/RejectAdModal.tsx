'use client';

/**
 * TeraLoka — RejectAdModal
 * Mission 8 Sub-Phase 8-C-2
 * ------------------------------------------------------------
 * Reject modal — replace window.prompt yang ugly.
 *
 * Features:
 *   - 5 preset reasons termasuk KPU compliance-aware
 *   - Mandatory reason min 5 chars
 *   - Warning copy: REJECT = terminal (gak bisa undo, harus soft-delete archive)
 *   - Escape + backdrop close
 *
 * Berbeda dengan DeleteAdModal:
 *   - Visual warning lebih agresif (red theme dominant)
 *   - Confirmation phrasing "PERMANENT" instead of "soft"
 *   - Defaults ke "KPU non-compliance" karena itu paling sering
 *
 * Pattern mirror BALAPOR reject-report-modal.tsx.
 *
 * History:
 *   - 16 Mei 2026: NEW (Sub-Phase 8-C-2)
 */

import { useState, useEffect, useRef } from 'react';
import { ShieldX, X, AlertOctagon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RejectAdModalProps {
  ad: {
    id:    string;
    title: string | null;
    advertiser_name: string;
    advertiser_type: string;
  } | null;
  onConfirm: (adId: string, reason: string) => Promise<void>;
  onClose:   () => void;
}

// 5 preset reasons — KPU compliance dominan untuk politisi
const PRESET_REASONS = [
  { value: 'kpu_non_compliance', label: 'Tidak comply regulasi KPU (politisi)', emoji: '🏛️' },
  { value: 'misleading_content', label: 'Konten menyesatkan / hoax',            emoji: '⚠️' },
  { value: 'image_quality',      label: 'Kualitas gambar / resolusi buruk',     emoji: '🖼️' },
  { value: 'wrong_category',     label: 'Kategori advertiser salah',            emoji: '📂' },
  { value: 'custom',             label: 'Alasan lain (tulis sendiri)',          emoji: '✏️' },
];

export default function RejectAdModal({ ad, onConfirm, onClose }: RejectAdModalProps) {
  // Default: kalau advertiser politisi → preselect KPU. Else → custom.
  const defaultReason =
    ad?.advertiser_type === 'politisi' ? 'kpu_non_compliance' : 'misleading_content';

  const [selectedReason, setSelectedReason] = useState<string>(defaultReason);
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

  // Auto-focus custom input
  useEffect(() => {
    if (selectedReason === 'custom' && customInputRef.current) {
      customInputRef.current.focus();
    }
  }, [selectedReason]);

  // Reset state saat modal open
  useEffect(() => {
    if (ad) {
      setSelectedReason(
        ad.advertiser_type === 'politisi' ? 'kpu_non_compliance' : 'misleading_content'
      );
      setCustomReason('');
      setError(null);
      setLoading(false);
    }
  }, [ad]);

  if (!ad) return null;

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
    } catch (err: any) {
      setError(err?.message ?? 'Gagal reject iklan');
      setLoading(false);
    }
  };

  const adTitle = ad.title ?? '(no title)';
  const isPolitisi = ad.advertiser_type === 'politisi';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className="w-full max-w-md bg-surface border border-status-critical/30 rounded-2xl shadow-2xl animate-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-border bg-status-critical/5">
          <div className="flex items-start gap-3 min-w-0">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-status-critical/12 text-status-critical shrink-0">
              <ShieldX size={18} />
            </div>
            <div className="min-w-0">
              <h2 className="text-[15px] font-extrabold text-status-critical leading-tight">
                Tolak Iklan?
              </h2>
              <p className="text-[11px] text-text-muted mt-1 line-clamp-2">
                <span className="font-semibold text-text">{adTitle}</span>
                {' · '}
                {ad.advertiser_name}
                {isPolitisi && (
                  <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-status-warning/12 text-status-warning">
                    🏛️ Politisi
                  </span>
                )}
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
          {/* Warning banner — terminal action */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-status-critical/8 border border-status-critical/30">
            <AlertOctagon size={14} className="text-status-critical shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold text-status-critical leading-relaxed">
                Aksi PERMANENT — iklan masuk status rejected.
              </p>
              <p className="text-[10px] text-status-critical/80 mt-1 leading-relaxed">
                Tidak bisa di-undo via /status. Untuk arsip, gunakan Hapus (soft delete).
              </p>
            </div>
          </div>

          {/* Preset reasons */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-2">
              Alasan Reject <span className="text-status-critical">*</span>
            </label>
            <div className="flex flex-col gap-1.5">
              {PRESET_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-colors',
                    selectedReason === r.value
                      ? 'bg-status-critical/8 border-status-critical/40'
                      : 'bg-surface border-border hover:bg-surface-muted'
                  )}
                >
                  <input
                    type="radio"
                    name="reject-reason"
                    value={r.value}
                    checked={selectedReason === r.value}
                    onChange={() => setSelectedReason(r.value)}
                    disabled={loading}
                    className="accent-status-critical"
                  />
                  <span aria-hidden className="text-[14px]">
                    {r.emoji}
                  </span>
                  <span
                    className={cn(
                      'text-[12px] flex-1',
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

          {/* Custom textarea */}
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
                placeholder="Min 5 karakter — alasan jelas, dicatat di audit log."
                className={cn(
                  'w-full px-3 py-2 rounded-lg resize-none',
                  'bg-surface border border-border',
                  'text-[12px] text-text placeholder:text-text-subtle',
                  'focus:outline-none focus:border-status-critical/50 focus:ring-2 focus:ring-status-critical/20',
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
              <AlertOctagon size={12} className="text-status-critical shrink-0" />
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
              'bg-status-critical hover:bg-status-critical/90 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldX size={14} />}
            {loading ? 'Memproses...' : 'Tolak Iklan'}
          </button>
        </div>
      </div>
    </div>
  );
}

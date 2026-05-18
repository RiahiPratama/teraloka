'use client';

/**
 * TeraLoka — AdvertiserSuspendModal
 * SESI 5A BATCH 2A (18 Mei 2026)
 * ------------------------------------------------------------
 * Mini modal — date picker untuk suspend advertiser.
 *
 * Behavior:
 *   - Default: 30 hari dari sekarang
 *   - Quick presets: 7 hari / 14 hari / 30 hari / 90 hari / custom
 *   - Date input (suspended_until) — TIME 23:59:59 of selected date
 *   - Confirm → emit suspended_until ISO string to parent
 *
 * Schema note: tidak ada kolom `suspended_reason` di DB → reason
 * hanya display purpose di confirm dialog parent (Pattern Y3 — display only).
 */

import { useState, useMemo } from 'react';
import { X, Pause, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Advertiser } from './AdvertiserPanel';

interface AdvertiserSuspendModalProps {
  advertiser: Advertiser;
  onConfirm:  (suspended_until_iso: string) => void;
  onClose:    () => void;
}

const PRESETS = [
  { label: '7 hari',  days: 7 },
  { label: '14 hari', days: 14 },
  { label: '30 hari', days: 30 },
  { label: '90 hari', days: 90 },
];

export default function AdvertiserSuspendModal({ advertiser: adv, onConfirm, onClose }: AdvertiserSuspendModalProps) {
  // Default: +30 days from now
  const defaultDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
  }, []);

  const [selectedDate, setSelectedDate] = useState(defaultDate);
  const [submitting, setSubmitting] = useState(false);

  const minDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // minimal besok
    return d.toISOString().slice(0, 10);
  }, []);

  const maxDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1); // max 1 tahun
    return d.toISOString().slice(0, 10);
  }, []);

  const handlePreset = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  const handleSubmit = () => {
    // Convert YYYY-MM-DD → ISO with time 23:59:59 local
    const date = new Date(selectedDate + 'T23:59:59');
    if (isNaN(date.getTime())) return;
    setSubmitting(true);
    onConfirm(date.toISOString());
  };

  const computeDaysFromNow = (): number => {
    const target = new Date(selectedDate + 'T23:59:59');
    const now = new Date();
    const diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={!submitting ? onClose : undefined}
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-border bg-status-warning/8">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Pause size={14} className="text-status-warning" />
              <h2 className="text-[14px] font-extrabold text-text">Suspend Advertiser</h2>
            </div>
            <p className="text-[11px] text-text-muted mt-1 truncate">
              {adv.business_name} <span className="font-mono text-text-subtle">({adv.display_id})</span>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-md hover:bg-surface-muted text-text-muted hover:text-text transition-colors shrink-0 disabled:opacity-50"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-[12px] text-text-muted leading-relaxed">
            Advertiser yang di-suspend tidak bisa create iklan baru sampai tanggal yang dipilih.
            Status akan tetap <strong>suspended</strong> sampai admin manual unsuspend.
          </p>

          {/* Quick Presets */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Durasi Cepat
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((preset) => {
                const presetDate = new Date();
                presetDate.setDate(presetDate.getDate() + preset.days);
                const presetISO = presetDate.toISOString().slice(0, 10);
                const isActive = selectedDate === presetISO;
                return (
                  <button
                    key={preset.days}
                    type="button"
                    onClick={() => handlePreset(preset.days)}
                    disabled={submitting}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wide transition-colors',
                      isActive
                        ? 'bg-status-warning text-white'
                        : 'bg-surface-muted text-text hover:bg-surface-muted/80',
                      submitting && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5">
              Suspended sampai
            </p>
            <div className="relative">
              <Calendar size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                min={minDate}
                max={maxDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                disabled={submitting}
                className="w-full pl-8 pr-3 py-2 rounded-md bg-surface-muted border border-border text-[13px] text-text font-semibold focus:outline-none focus:border-status-warning/50 focus:ring-2 focus:ring-status-warning/20 disabled:opacity-50"
              />
            </div>
            <p className="text-[10px] text-text-muted mt-1">
              ≈ {computeDaysFromNow()} hari dari sekarang
            </p>
          </div>

          {/* Confirmation Summary */}
          <div className="px-3 py-2.5 rounded-lg bg-status-warning/8 border border-status-warning/30">
            <p className="text-[11px] font-bold text-status-warning mb-1">⚠️ Konfirmasi</p>
            <p className="text-[11px] text-text leading-relaxed">
              <strong>{adv.business_name}</strong> akan di-suspend sampai{' '}
              <strong className="text-status-warning">
                {new Date(selectedDate + 'T23:59:59').toLocaleDateString('id-ID', {
                  weekday: 'long',
                  day:     'numeric',
                  month:   'long',
                  year:    'numeric',
                })}
              </strong>.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-muted/20">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-1.5 rounded-md bg-surface-muted text-text text-[11px] font-bold uppercase tracking-wide hover:bg-surface-muted/80 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || !selectedDate}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-md bg-status-warning text-white text-[11px] font-bold uppercase tracking-wide hover:bg-status-warning/90 transition-colors disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 size={11} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Pause size={11} />
                Suspend Sekarang
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

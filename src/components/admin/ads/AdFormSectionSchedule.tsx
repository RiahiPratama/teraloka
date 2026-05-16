'use client';

/**
 * TeraLoka — AdFormSectionSchedule
 * Mission 8 Sub-Phase 8-B β (Batch 2)
 * ------------------------------------------------------------
 * Section 4 form: Jadwal Tayang.
 *
 * Fields:
 *   - starts_at (datetime-local input, required)
 *   - ends_at   (datetime-local input, required)
 *   - status    (read-only display badge, edit mode only)
 *
 * Validation:
 *   - ends_at > starts_at (enforced di Provider + backend)
 *   - starts_at boleh past untuk backdate
 *
 * Status display:
 *   - Create mode: hide section (status auto-set by advertiser_type)
 *   - Edit mode: show current status badge dengan label + warna
 */

import { useState } from 'react';
import { ChevronDown, ChevronUp, Check, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdForm } from './AdFormProvider';

// Map status → badge color + label (mirror AdsTableRow pattern)
const STATUS_DISPLAY: Record<string, { label: string; color: string; bg: string }> = {
  pending_payment: { label: 'Pending Payment', color: 'text-status-warning', bg: 'bg-status-warning/12' },
  pending_review:  { label: 'Review',          color: 'text-status-warning', bg: 'bg-status-warning/12' },
  active:          { label: 'Active',          color: 'text-status-healthy', bg: 'bg-status-healthy/12' },
  paused:          { label: 'Paused',          color: 'text-status-info',    bg: 'bg-status-info/12'    },
  rejected:        { label: 'Rejected',        color: 'text-status-critical',bg: 'bg-status-critical/12'},
  expired:         { label: 'Expired',         color: 'text-text-muted',     bg: 'bg-surface-muted'     },
  deleted:         { label: 'Deleted',         color: 'text-status-critical',bg: 'bg-status-critical/12'},
};

// Convert ISO string → datetime-local format (YYYY-MM-DDTHH:mm)
function isoToDatetimeLocal(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  // Adjust to local timezone
  const offset = d.getTimezoneOffset() * 60000;
  const local = new Date(d.getTime() - offset);
  return local.toISOString().slice(0, 16);
}

// Convert datetime-local → ISO UTC string
function datetimeLocalToIso(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  if (isNaN(d.getTime())) return '';
  return d.toISOString();
}

// Calculate duration in days
function calcDurationDays(startsAt: string, endsAt: string): number | null {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();
  if (isNaN(start) || isNaN(end) || end <= start) return null;
  return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
}

export default function AdFormSectionSchedule() {
  const { state, setField, errorFor, isEditMode } = useAdForm();
  const [expanded, setExpanded] = useState(true);

  const startsError = errorFor('starts_at');
  const endsError = errorFor('ends_at');

  const durationDays = calcDurationDays(state.starts_at, state.ends_at);
  const isComplete = !!state.starts_at && !!state.ends_at && durationDays !== null;

  // Edit mode: fetch current status via Provider state (not yet exposed — TODO Batch 2.5)
  // For now, status display = derived from advertiser_type (Decision 6)
  const expectedStatus: string =
    state.advertiser_type === 'umum' || state.advertiser_type === 'komersial'
      ? 'active'
      : 'pending_review';

  return (
    <section className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-3 p-4 hover:bg-surface-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-analytics/12 text-analytics shrink-0">
            <Calendar size={16} />
          </div>
          <div className="min-w-0 text-left">
            <h3 className="text-[13px] font-bold text-text uppercase tracking-wider">
              4. Jadwal Tayang
            </h3>
            <p className="text-[11px] text-text-muted mt-0.5">
              Kapan iklan mulai dan berakhir tayang
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isComplete && (
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-status-healthy/12 text-status-healthy">
              <Check size={12} />
            </span>
          )}
          {expanded ? (
            <ChevronUp size={16} className="text-text-muted" />
          ) : (
            <ChevronDown size={16} className="text-text-muted" />
          )}
        </div>
      </button>

      {/* Body */}
      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-4 border-t border-border">
          {/* Info banner */}
          <div className="pt-4 flex items-start gap-2 p-2.5 rounded-lg bg-status-info/8 border border-status-info/30">
            <Info size={12} className="text-status-info shrink-0 mt-0.5" />
            <p className="text-[10px] text-status-info leading-relaxed">
              Iklan otomatis berhenti tayang setelah <strong>tanggal akhir</strong>.
              Status berubah ke <strong>Expired</strong> via cron daily.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* starts_at */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                Tanggal Mulai <span className="text-status-critical">*</span>
              </label>
              <input
                type="datetime-local"
                value={isoToDatetimeLocal(state.starts_at)}
                onChange={(e) => setField('starts_at', datetimeLocalToIso(e.target.value))}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-surface border text-[12px] text-text font-mono',
                  'focus:outline-none focus:ring-2 focus:ring-analytics/20 transition-all',
                  startsError
                    ? 'border-status-critical/40 focus:border-status-critical/60'
                    : 'border-border focus:border-analytics/50'
                )}
              />
              {startsError && (
                <p className="text-[10px] text-status-critical mt-1">{startsError}</p>
              )}
            </div>

            {/* ends_at */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wide text-text-muted mb-1.5">
                Tanggal Akhir <span className="text-status-critical">*</span>
              </label>
              <input
                type="datetime-local"
                value={isoToDatetimeLocal(state.ends_at)}
                onChange={(e) => setField('ends_at', datetimeLocalToIso(e.target.value))}
                className={cn(
                  'w-full px-3 py-2 rounded-lg bg-surface border text-[12px] text-text font-mono',
                  'focus:outline-none focus:ring-2 focus:ring-analytics/20 transition-all',
                  endsError
                    ? 'border-status-critical/40 focus:border-status-critical/60'
                    : 'border-border focus:border-analytics/50'
                )}
              />
              {endsError && (
                <p className="text-[10px] text-status-critical mt-1">{endsError}</p>
              )}
            </div>
          </div>

          {/* Duration preview */}
          {durationDays !== null && (
            <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-muted/40 border border-border">
              <span className="text-[11px] text-text-muted">Durasi tayang</span>
              <span className="text-[12px] font-bold text-text tabular-nums">
                {durationDays} hari
              </span>
            </div>
          )}

          {/* Quick presets */}
          <div>
            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1.5">
              Quick set durasi (dari hari ini):
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[7, 14, 30, 60, 90].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => {
                    const start = new Date().toISOString();
                    const end = new Date(Date.now() + days * 86400000).toISOString();
                    setField('starts_at', start);
                    setField('ends_at', end);
                  }}
                  className="px-2.5 py-1 rounded text-[11px] font-semibold bg-surface border border-border text-text-muted hover:bg-analytics/8 hover:text-analytics hover:border-analytics/40 transition-colors"
                >
                  {days} hari
                </button>
              ))}
            </div>
          </div>

          {/* Status display */}
          {!isEditMode && (
            <div className="rounded-lg border border-border bg-surface-muted/40 p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-text-muted">
                  Status setelah simpan
                </p>
                <span
                  className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide',
                    STATUS_DISPLAY[expectedStatus]?.bg,
                    STATUS_DISPLAY[expectedStatus]?.color
                  )}
                >
                  {STATUS_DISPLAY[expectedStatus]?.label ?? expectedStatus}
                </span>
              </div>
              <p className="text-[10px] text-text-subtle leading-relaxed">
                {expectedStatus === 'active'
                  ? '✓ Iklan langsung tayang. Bisa di-pause kapan saja via Command Center.'
                  : '⏳ Iklan masuk antrian review. KPU/legitimacy compliance check sebelum tayang.'}
              </p>
            </div>
          )}

          {/* Edit mode: status read-only note */}
          {isEditMode && (
            <div className="flex items-start gap-2 p-2.5 rounded-lg bg-status-warning/8 border border-status-warning/30">
              <Info size={12} className="text-status-warning shrink-0 mt-0.5" />
              <p className="text-[10px] text-status-warning leading-relaxed">
                Status iklan <strong>tidak bisa diubah</strong> dari form. Untuk transition
                status (Pause / Resume / Reject), gunakan action button di Command Center.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

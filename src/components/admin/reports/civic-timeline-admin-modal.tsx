'use client';

/**
 * TeraLoka — CivicTimelineAdminModal
 * Sub-Sprint 1C-C-11 — Admin readonly view of citizen civic feedback timeline
 * ------------------------------------------------------------
 * Mirror dari CivicFeedbackTimelineModal pelapor, tapi:
 *   - Endpoint: /admin/balapor/:id/civic-timeline (super_admin only)
 *   - Readonly (no submit/edit buttons)
 *   - Admin styling tokens (bg-surface, text-text)
 *   - Subtitle context: "Riwayat tindak lanjut dari pelapor"
 *
 * Power-flip strategy: admin lihat ground-truth dari pelapor untuk
 * leverage moderation decision + curate BAKABAR "Suara Warga MalUt".
 *
 * Data flow:
 *   1. Mount → useEffect fetch GET /admin/balapor/:id/civic-timeline
 *   2. Loading state: skeleton 3 entry
 *   3. Data ready: render timeline newest first
 *   4. Click photo thumbnail → open lightbox via onPhotoClick callback
 *   5. ESC / backdrop click → close
 */

import { useEffect, useState } from 'react';
import { X, Clock, RefreshCw, AlertCircle, ImageIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { Button } from '@/components/ui/button';
import { FOLLOW_UP_CONFIG, type FollowUpStatus } from '@/types/reports';

// ─── Types ──────────────────────────────────────────────────────

interface FollowUp {
  id: string;
  report_id: string;
  status: FollowUpStatus;
  note: string | null;
  photos: string[] | null;
  updated_by: string | null;
  created_at: string;
}

interface CivicTimelineResponse {
  data: FollowUp[];
  count: number;
  report_id: string;
}

export interface CivicTimelineAdminModalProps {
  /** Report yang civic timeline-nya mau di-display (modal visible kalau != null) */
  report: {
    id: string;
    title: string;
    display_id?: string | null;
    follow_up_current_status?: FollowUpStatus | null;
  } | null;
  /** Callback close modal */
  onClose: () => void;
  /** Optional: kalau admin click photo thumbnail → trigger lightbox */
  onPhotoClick?: (photos: string[], initialIndex: number, contextTitle: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'baru saja';
  if (diffMin < 60) return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay < 7) return `${diffDay} hari lalu`;
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`;
  return `${Math.floor(diffDay / 30)} bulan lalu`;
}

function formatAbsoluteDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export function CivicTimelineAdminModal({
  report,
  onClose,
  onPhotoClick,
}: CivicTimelineAdminModalProps) {
  const api = useApi();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  // Fetch on open
  useEffect(() => {
    if (!report || !api.token) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    api
      .get<CivicTimelineResponse>(`/admin/balapor/${report.id}/civic-timeline`, {
        signal: controller.signal,
      })
      .then((res) => {
        setFollowUps(res.data);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof ApiError ? err.message : 'Gagal load timeline');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [report, api, refreshNonce]);

  // ESC to close
  useEffect(() => {
    if (!report) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [report, onClose]);

  if (!report) return null;

  const currentConfig = report.follow_up_current_status
    ? FOLLOW_UP_CONFIG[report.follow_up_current_status]
    : null;

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="civic-timeline-title"
    >
      <div
        className="bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-border bg-balapor/8">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-balapor/15 flex items-center justify-center shrink-0">
              <Clock size={20} className="text-balapor" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="civic-timeline-title" className="text-base font-bold text-text">
                Riwayat Civic Feedback
              </h2>
              <p className="text-xs text-text-muted mt-0.5 truncate">
                <span className="font-mono">{report.display_id || '#—'}</span>
                {' · '}
                <span>{report.title}</span>
              </p>
              {currentConfig && (
                <span
                  className={cn(
                    'mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full',
                    'text-[10px] font-bold uppercase tracking-wide border',
                    currentConfig.badgeBg,
                    currentConfig.badgeText,
                    currentConfig.badgeBorder
                  )}
                >
                  <span aria-hidden="true">{currentConfig.emoji}</span>
                  {currentConfig.label}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setRefreshNonce((n) => n + 1)}
              disabled={loading}
              className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors disabled:opacity-50"
              aria-label="Refresh"
              title="Refresh"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-text-muted hover:text-text hover:bg-surface-muted transition-colors"
              aria-label="Tutup"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* Loading state */}
          {loading && followUps.length === 0 && (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="shrink-0 w-3 h-3 rounded-full bg-surface-muted mt-1" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-surface-muted rounded w-1/3" />
                    <div className="h-2 bg-surface-muted rounded w-1/4" />
                    <div className="h-12 bg-surface-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="bg-status-critical/8 border border-status-critical/20 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-status-critical shrink-0" />
                <span className="text-sm text-text">{error}</span>
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && followUps.length === 0 && (
            <div className="text-center py-8">
              <div className="inline-flex h-12 w-12 rounded-full bg-surface-muted items-center justify-center mb-3">
                <Clock size={24} className="text-text-muted" />
              </div>
              <h3 className="text-sm font-bold text-text mb-1">
                Belum ada civic feedback
              </h3>
              <p className="text-xs text-text-muted max-w-sm mx-auto">
                Pelapor belum submit update tindak lanjut. Civic feedback hanya
                tersedia untuk laporan status verified atau published.
              </p>
            </div>
          )}

          {/* Timeline list */}
          {followUps.length > 0 && (
            <div className="space-y-1">
              {followUps.map((entry, idx) => (
                <TimelineEntry
                  key={entry.id}
                  entry={entry}
                  isLast={idx === followUps.length - 1}
                  onPhotoClick={onPhotoClick}
                  reportTitle={report.title}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-surface-muted/30 flex items-center justify-between">
          <span className="text-[11px] text-text-muted">
            {followUps.length > 0 && `${followUps.length} entries · readonly view`}
          </span>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Timeline Entry Sub-Component ────────────────────────────────

function TimelineEntry({
  entry,
  isLast,
  onPhotoClick,
  reportTitle,
}: {
  entry: FollowUp;
  isLast: boolean;
  onPhotoClick?: (photos: string[], initialIndex: number, contextTitle: string) => void;
  reportTitle: string;
}) {
  const cfg = FOLLOW_UP_CONFIG[entry.status];
  const photos = entry.photos ?? [];

  return (
    <div className="flex gap-3 relative pb-4">
      {/* Bullet dot + connector line */}
      <div className="shrink-0 flex flex-col items-center">
        <div
          className={cn(
            'w-3 h-3 rounded-full ring-4 ring-surface relative z-10 mt-1',
            cfg.badgeBg,
            cfg.badgeBorder,
            'border'
          )}
          style={{ background: cfg.hex }}
        />
        {!isLast && <div className="w-0.5 flex-1 bg-border mt-1" />}
      </div>

      {/* Entry content */}
      <div className="flex-1 min-w-0 pb-2">
        {/* Status header */}
        <div className="flex items-center gap-1.5 mb-1">
          <span aria-hidden="true">{cfg.emoji}</span>
          <p className={cn('text-sm font-semibold', cfg.badgeText)}>{cfg.label}</p>
        </div>

        {/* Timestamp */}
        <p
          className="text-xs text-text-muted mb-2 cursor-help"
          title={formatAbsoluteDate(entry.created_at)}
        >
          {formatRelativeTime(entry.created_at)}
        </p>

        {/* Note */}
        {entry.note && (
          <div className="bg-surface-muted/50 rounded-lg p-2.5 mb-2 border border-border">
            <p className="text-xs text-text leading-relaxed whitespace-pre-wrap italic">
              "{entry.note}"
            </p>
          </div>
        )}

        {/* Photos grid */}
        {photos.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {photos.slice(0, 3).map((url, i) => (
              <button
                key={`${url}-${i}`}
                type="button"
                onClick={() => onPhotoClick?.(photos, i, `${reportTitle} · ${cfg.label}`)}
                className="block w-16 h-16 rounded-lg overflow-hidden border border-border hover:opacity-80 transition-opacity"
                aria-label={`Foto bukti ${i + 1}`}
                title={`Klik untuk lihat foto bukti ${i + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
            {photos.length > 3 && (
              <button
                type="button"
                onClick={() => onPhotoClick?.(photos, 3, `${reportTitle} · ${cfg.label}`)}
                className="w-16 h-16 rounded-lg flex items-center justify-center bg-surface-muted/50 border border-border hover:bg-surface-muted transition-colors"
              >
                <span className="text-xs font-bold text-text-muted">
                  +{photos.length - 3}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Photo count metadata */}
        {photos.length > 0 && (
          <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
            <ImageIcon size={10} />
            {photos.length} foto bukti
          </p>
        )}
      </div>
    </div>
  );
}

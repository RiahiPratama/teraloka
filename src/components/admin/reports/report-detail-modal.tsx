'use client';

/**
 * TeraLoka — ReportDetailModal
 * Sub-Sprint 1C-C-13 TD-061-A Fix (Bridge Sprint Day 1)
 * ------------------------------------------------------------
 * Modal detail laporan yang pop di atas PelaporDetailDrawer.
 *
 * Trigger:
 *   - Click row laporan di drawer history list (PelaporDetailDrawer)
 *   - Drawer TETAP kebuka di kanan, modal pop di tengah → preserve konteks pelapor
 *
 * Architecture:
 *   - z-[60] (drawer panel z-50, lightbox z-[1000])
 *   - Read-only (Phase 3 — admin actions tetap di drawer atau Live tab)
 *   - Fetch via GET /admin/balapor/reports/:id (existing endpoint)
 *   - Foto click → spawn PhotoLightbox (z-[1000]) di atas modal
 *
 * Stacking:
 *   z-40   Drawer backdrop
 *   z-50   Drawer panel
 *   z-[60] ReportDetailModal (THIS)
 *   z-[1000] PhotoLightbox (spawn dari sini)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  X,
  MapPin,
  Calendar,
  Tag,
  AlertTriangle,
  ImageIcon,
  FileText,
  Loader2,
  Hash,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { timeAgo } from '@/types/reports';
import { PhotoLightbox } from './photo-lightbox';

/* ════════════════════════════════════════════════════════════════
   Types — Self-contained shape (subset Report from API)
   ════════════════════════════════════════════════════════════════ */

interface ReportDetail {
  id: string;
  display_id: string | null;
  title: string;
  body: string | null;
  category: string | null;
  status: string;
  priority: string | null;
  location: string | null;
  location_name: string | null;
  location_label?: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at?: string | null;
  reporter_name?: string | null;
  follow_up_current_status?: string | null;
  follow_up_current_note?: string | null;
  follow_up_count?: number;
}

interface ReportDetailModalProps {
  /** Report ID untuk fetch. null = modal closed */
  reportId: string | null;
  onClose: () => void;
  onToast: (message: string, ok: boolean) => void;
}

/* ════════════════════════════════════════════════════════════════
   Status + Priority Visual Config
   ════════════════════════════════════════════════════════════════ */

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: '🟡 Pending', color: 'text-status-warning bg-status-warning/10 border-status-warning/30' },
  reviewing: { label: '🔍 Reviewing', color: 'text-balapor bg-balapor/10 border-balapor/30' },
  verified: { label: '✅ Verified', color: 'text-status-healthy bg-status-healthy/10 border-status-healthy/30' },
  published: { label: '📰 Published', color: 'text-balapor bg-balapor/10 border-balapor/30' },
  stalemate: { label: '⚠️ Stalemate', color: 'text-status-warning bg-status-warning/10 border-status-warning/30' },
  stale: { label: '⏸️ Stale', color: 'text-text-muted bg-surface-muted border-border' },
  resolved: { label: '🎉 Resolved', color: 'text-status-healthy bg-status-healthy/10 border-status-healthy/30' },
  rejected: { label: '❌ Rejected', color: 'text-status-critical bg-status-critical/10 border-status-critical/30' },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: '🔴 Urgent', color: 'text-status-critical bg-status-critical/10' },
  high: { label: '🟠 High', color: 'text-status-warning bg-status-warning/10' },
  normal: { label: '🟢 Normal', color: 'text-text-muted bg-surface-muted' },
};

const FOLLOWUP_CONFIG: Record<string, { label: string; color: string }> = {
  belum_ditangani: { label: '⏳ Belum ditangani', color: 'text-status-warning bg-status-warning/10 border-status-warning/30' },
  sedang_ditangani: { label: '🔧 Sedang ditangani', color: 'text-balapor bg-balapor/10 border-balapor/30' },
  sudah_selesai: { label: '✅ Sudah selesai', color: 'text-status-healthy bg-status-healthy/10 border-status-healthy/30' },
  tidak_jelas: { label: '❓ Tidak jelas', color: 'text-text-muted bg-surface-muted border-border' },
};

/* ════════════════════════════════════════════════════════════════
   Component
   ════════════════════════════════════════════════════════════════ */

export function ReportDetailModal({
  reportId,
  onClose,
  onToast,
}: ReportDetailModalProps) {
  const api = useApi();
  const [detail, setDetail] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Photo lightbox state (nested modal)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  /* ── Fetch detail saat reportId berubah ── */
  useEffect(() => {
    if (!reportId || !api.token) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDetail(null);

    api
      .get<ReportDetail>(`/admin/balapor/reports/${reportId}`, {
        signal: controller.signal,
      })
      .then((data) => setDetail(data))
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message);
          onToast(err.message, false);
        } else if (err.name !== 'AbortError') {
          setError('Gagal load detail laporan');
          onToast('Gagal load detail laporan', false);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [reportId, api, onToast]);

  /* ── Reset state saat modal close ── */
  useEffect(() => {
    if (!reportId) {
      setDetail(null);
      setError(null);
      setLightboxIndex(null);
    }
  }, [reportId]);

  /* ── ESC to close (only if lightbox not active) ── */
  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && lightboxIndex === null) {
        onClose();
      }
    },
    [onClose, lightboxIndex],
  );

  useEffect(() => {
    if (!reportId) return;
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [reportId, handleEsc]);

  if (!reportId) return null;

  const statusConfig = detail ? STATUS_CONFIG[detail.status] : null;
  const priorityConfig =
    detail?.priority && PRIORITY_CONFIG[detail.priority]
      ? PRIORITY_CONFIG[detail.priority]
      : null;
  const followupConfig =
    detail?.follow_up_current_status && FOLLOWUP_CONFIG[detail.follow_up_current_status]
      ? FOLLOWUP_CONFIG[detail.follow_up_current_status]
      : null;

  const locationDisplay =
    detail?.location_name ||
    detail?.location_label ||
    detail?.location ||
    'Lokasi tidak tercatat';

  const photos = detail?.photos ?? [];

  return (
    <>
      {/* ── Backdrop + Modal ── */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
        role="dialog"
        aria-modal="true"
        aria-label="Detail laporan"
      >
        <div
          className={cn(
            'relative w-full max-w-3xl max-h-[90vh]',
            'bg-surface border border-border rounded-2xl shadow-2xl',
            'flex flex-col overflow-hidden',
          )}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ─── Header ─── */}
          <header className="shrink-0 px-5 py-4 border-b border-border bg-surface-muted/40 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-lg bg-balapor/10 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-balapor" />
              </div>
              <div className="min-w-0 flex-1">
                {detail?.display_id && (
                  <div className="flex items-center gap-1.5 mb-1">
                    <Hash size={10} className="text-text-muted" />
                    <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      {detail.display_id}
                    </span>
                  </div>
                )}
                <h2 className="text-base font-bold text-text leading-tight">
                  {loading
                    ? 'Memuat detail laporan...'
                    : detail?.title || 'Detail laporan'}
                </h2>
                {detail && (
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {statusConfig && (
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide border',
                          statusConfig.color,
                        )}
                      >
                        {statusConfig.label}
                      </span>
                    )}
                    {priorityConfig && (
                      <span
                        className={cn(
                          'inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide',
                          priorityConfig.color,
                        )}
                      >
                        {priorityConfig.label}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-muted transition-colors shrink-0"
              aria-label="Tutup"
              title="Tutup (ESC)"
            >
              <X size={18} />
            </button>
          </header>

          {/* ─── Body (scrollable) ─── */}
          <div className="flex-1 overflow-y-auto">
            {/* Loading state */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Loader2 size={28} className="text-balapor animate-spin" />
                <p className="text-sm text-text-muted">Memuat detail laporan...</p>
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center py-16 gap-3 px-6 text-center">
                <AlertTriangle size={28} className="text-status-critical" />
                <p className="text-sm font-semibold text-status-critical">{error}</p>
                <p className="text-xs text-text-muted">
                  Coba tutup modal dan klik ulang dari drawer.
                </p>
              </div>
            )}

            {/* Detail content */}
            {detail && !loading && !error && (
              <div className="p-5 space-y-5">
                {/* Meta row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <MetaItem
                    icon={<MapPin size={12} />}
                    label="Lokasi"
                    value={locationDisplay}
                  />
                  <MetaItem
                    icon={<Tag size={12} />}
                    label="Kategori"
                    value={
                      <span className="capitalize">
                        {detail.category || 'lainnya'}
                      </span>
                    }
                  />
                  <MetaItem
                    icon={<Calendar size={12} />}
                    label="Dibuat"
                    value={timeAgo(detail.created_at)}
                  />
                  {detail.reporter_name && (
                    <MetaItem
                      icon={<FileText size={12} />}
                      label="Pelapor"
                      value={detail.reporter_name}
                    />
                  )}
                </div>

                {/* Body text */}
                {detail.body && (
                  <section className="space-y-2">
                    <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Isi Laporan
                    </h3>
                    <div className="bg-surface-muted/30 border border-border rounded-lg p-4">
                      <p className="text-sm text-text whitespace-pre-wrap leading-relaxed">
                        {detail.body}
                      </p>
                    </div>
                  </section>
                )}

                {/* Photos grid */}
                {photos.length > 0 && (
                  <section className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={11} />
                        Foto Bukti ({photos.length})
                      </h3>
                      <span className="text-[10px] text-text-muted">
                        Klik foto untuk perbesar
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {photos.map((url, i) => (
                        <button
                          key={`${url}-${i}`}
                          type="button"
                          onClick={() => setLightboxIndex(i)}
                          className={cn(
                            'aspect-square rounded-lg overflow-hidden border border-border',
                            'hover:border-balapor hover:shadow-md transition-all',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-balapor/30',
                          )}
                          aria-label={`Foto ${i + 1}`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Foto bukti ${i + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  </section>
                )}

                {/* Civic feedback summary */}
                {(followupConfig || detail.follow_up_count) && (
                  <section className="space-y-2">
                    <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Status Tindak Lanjut Pelapor
                    </h3>
                    <div className="bg-surface-muted/30 border border-border rounded-lg p-4 space-y-2">
                      {followupConfig && (
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'inline-block px-2 py-1 rounded-full text-[11px] font-bold border',
                              followupConfig.color,
                            )}
                          >
                            {followupConfig.label}
                          </span>
                          {(detail.follow_up_count ?? 0) > 0 && (
                            <span className="text-[10px] text-text-muted">
                              {detail.follow_up_count} update
                            </span>
                          )}
                        </div>
                      )}
                      {detail.follow_up_current_note && (
                        <p className="text-xs text-text-secondary leading-relaxed italic">
                          &ldquo;{detail.follow_up_current_note}&rdquo;
                        </p>
                      )}
                    </div>
                  </section>
                )}

                {/* Empty civic feedback notice */}
                {!followupConfig && !(detail.follow_up_count ?? 0) && (
                  <section className="space-y-2">
                    <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider">
                      Status Tindak Lanjut Pelapor
                    </h3>
                    <div className="bg-surface-muted/30 border border-border rounded-lg p-4">
                      <p className="text-xs text-text-muted italic">
                        Belum ada update dari pelapor.
                      </p>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>

          {/* ─── Footer (read-only notice) ─── */}
          <footer className="shrink-0 px-5 py-3 border-t border-border bg-surface-muted/40">
            <p className="text-[10px] text-text-muted text-center">
              Read-only view · Untuk action moderation, gunakan tab Live Incidents
            </p>
          </footer>
        </div>
      </div>

      {/* ── Photo Lightbox (nested, z-[1000]) ── */}
      {lightboxIndex !== null && photos.length > 0 && (
        <PhotoLightbox
          photos={photos}
          initialIndex={lightboxIndex}
          reportTitle={detail?.title}
          reportDisplayId={detail?.display_id ?? null}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: MetaItem
   ════════════════════════════════════════════════════════════════ */

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="h-6 w-6 rounded-md bg-surface-muted flex items-center justify-center text-text-muted shrink-0 mt-0.5">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-0.5">
          {label}
        </div>
        <div className="text-xs text-text font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

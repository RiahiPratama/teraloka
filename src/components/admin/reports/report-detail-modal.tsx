'use client';

/**
 * TeraLoka — ReportDetailModal
 * Sub-Sprint 1C-C-13 TD-061-A Fix (Bridge Sprint Day 1)
 * Updated: 10 Mei 2026 — Day 6 B2 Photo EXIF Display
 * Updated: 10 Mei 2026 — Day 8 B3 Photo Hash Duplicate Display
 * ------------------------------------------------------------
 * Modal detail laporan yang pop di atas PelaporDetailDrawer.
 *
 * Trigger:
 *   - Click row laporan di drawer history list (PelaporDetailDrawer)
 *   - Drawer TETAP kebuka di kanan, modal pop di tengah → preserve konteks pelapor
 *
 * Architecture:
 *   - z-[60] (drawer panel z-50, lightbox z-[1000])
 *   - Read-only metadata + photos
 *   - Fetch via GET /admin/balapor/:id (mounted di balapor.ts parent router)
 *   - Foto click → spawn PhotoLightbox (z-[1000]) di atas modal
 *
 * Stacking:
 *   z-40   Drawer backdrop
 *   z-50   Drawer panel
 *   z-[60] ReportDetailModal (THIS)
 *   z-[1000] PhotoLightbox (spawn dari sini)
 *
 * Day 6 — Photo EXIF Validation Display:
 *   - Auto-fetch EXIF records parallel dengan detail report
 *   - Severity indicator (none/info/warning/critical) + emoji + warna
 *   - Collapsible per-foto detail (camera, GPS, timestamp, flags)
 *   - Tombol "Re-validasi" untuk trigger ulang (super_admin + admin_content)
 *
 * Day 8 — Photo Hash Duplicate Detection Display:
 *   - Auto-fetch pHash records parallel dengan detail + EXIF
 *   - Banner: "Tidak ada duplikat" (hijau) atau "Ditemukan N duplikat" (orange)
 *   - Per-foto card: collapsible kalau ada duplicates, static kalau unik
 *   - Per-match row: display_id, title, hamming distance + label, age
 *   - Tombol "Re-validasi" untuk trigger ulang compute pHash
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
  ShieldCheck,
  ShieldAlert,
  Camera,
  MapPinned,
  Clock,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info as InfoIcon,
  Search,
  Copy,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ApiError, useApi } from '@/lib/api/client';
import { timeAgo } from '@/types/reports';
import { PhotoLightbox } from './photo-lightbox';

/* ════════════════════════════════════════════════════════════════
   Types
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

type ExifSeverity = 'none' | 'info' | 'warning' | 'critical';

interface PhotoExifRecord {
  id: string;
  report_id: string;
  photo_url: string;
  photo_index: number;
  has_exif: boolean;
  camera_make: string | null;
  camera_model: string | null;
  date_taken: string | null;
  gps_latitude: number | null;
  gps_longitude: number | null;
  flag_no_exif: boolean;
  flag_gps_mismatch: boolean;
  gps_distance_meters: number | null;
  flag_timestamp_old: boolean;
  timestamp_age_days: number | null;
  severity: ExifSeverity;
  validated_at: string;
  validation_error: string | null;
}

interface RevalidateExifResponse {
  count: number;
  severities: Record<ExifSeverity, number>;
}

// ─── Day 8 — pHash types ──────────────────────────────────────

interface DuplicateMatch {
  report_id: string;
  photo_index: number;
  display_id: string | null;
  title: string;
  hamming_dist: number;
  created_at: string;
}

interface PhotoHashRecord {
  id: string;
  report_id: string;
  photo_url: string;
  photo_index: number;
  phash: string | null; // bigint as string (hotfix Day 7)
  computed_at: string;
  computation_error: string | null;
  duplicates_found: number;
  duplicate_matches: DuplicateMatch[];
}

interface RevalidateHashResponse {
  count: number;
}

interface ReportDetailModalProps {
  /** Report ID untuk fetch. null = modal closed */
  reportId: string | null;
  onClose: () => void;
  onToast: (message: string, ok: boolean) => void;
}

/* ════════════════════════════════════════════════════════════════
   Visual Config
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

const SEVERITY_CONFIG: Record<
  ExifSeverity,
  {
    emoji: string;
    label: string;
    badgeClass: string;
    bannerClass: string;
    iconColor: string;
  }
> = {
  none: {
    emoji: '✅',
    label: 'Foto valid',
    badgeClass: 'text-status-healthy bg-status-healthy/10 border-status-healthy/30',
    bannerClass: 'bg-status-healthy/5 border-status-healthy/30',
    iconColor: 'text-status-healthy',
  },
  info: {
    emoji: 'ℹ️',
    label: 'Perlu perhatian',
    badgeClass: 'text-balapor bg-balapor/10 border-balapor/30',
    bannerClass: 'bg-balapor/5 border-balapor/30',
    iconColor: 'text-balapor',
  },
  warning: {
    emoji: '⚠️',
    label: 'Mencurigakan',
    badgeClass: 'text-status-warning bg-status-warning/10 border-status-warning/30',
    bannerClass: 'bg-status-warning/5 border-status-warning/30',
    iconColor: 'text-status-warning',
  },
  critical: {
    emoji: '🚨',
    label: 'Sangat mencurigakan',
    badgeClass: 'text-status-critical bg-status-critical/10 border-status-critical/30',
    bannerClass: 'bg-status-critical/5 border-status-critical/30',
    iconColor: 'text-status-critical',
  },
};

/* ════════════════════════════════════════════════════════════════
   Helpers
   ════════════════════════════════════════════════════════════════ */

const SEVERITY_RANK: Record<ExifSeverity, number> = {
  none: 0,
  info: 1,
  warning: 2,
  critical: 3,
};

function getWorstSeverity(records: PhotoExifRecord[]): ExifSeverity {
  if (records.length === 0) return 'none';
  return records.reduce<ExifSeverity>((worst, rec) => {
    return SEVERITY_RANK[rec.severity] > SEVERITY_RANK[worst] ? rec.severity : worst;
  }, 'none');
}

function formatDistance(meters: number | null): string {
  if (meters === null) return '-';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDateID(iso: string | null): string {
  if (!iso) return '-';
  try {
    return new Date(iso).toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '-';
  }
}

/** Day 8 — Hamming distance to human-readable label */
function hammingLabel(dist: number): string {
  if (dist === 0) return 'identik';
  if (dist <= 3) return 'sangat mirip';
  if (dist <= 6) return 'mirip';
  return 'agak mirip';
}

/** Day 8 — Hamming distance to color class */
function hammingColor(dist: number): string {
  if (dist === 0) return 'text-status-critical bg-status-critical/10 border-status-critical/30';
  if (dist <= 3) return 'text-status-critical bg-status-critical/10 border-status-critical/30';
  if (dist <= 6) return 'text-status-warning bg-status-warning/10 border-status-warning/30';
  return 'text-balapor bg-balapor/10 border-balapor/30';
}

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

  // EXIF validation state (Day 6)
  const [exifRecords, setExifRecords] = useState<PhotoExifRecord[]>([]);
  const [exifLoading, setExifLoading] = useState(false);
  const [exifError, setExifError] = useState<string | null>(null);
  const [revalidating, setRevalidating] = useState(false);
  const [expandedPhoto, setExpandedPhoto] = useState<number | null>(null);

  // Hash duplicate state (Day 8)
  const [hashRecords, setHashRecords] = useState<PhotoHashRecord[]>([]);
  const [hashLoading, setHashLoading] = useState(false);
  const [hashError, setHashError] = useState<string | null>(null);
  const [revalidatingHash, setRevalidatingHash] = useState(false);
  const [expandedHashPhoto, setExpandedHashPhoto] = useState<number | null>(null);

  /* ── Fetch detail saat reportId berubah ── */
  useEffect(() => {
    if (!reportId || !api.token) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setDetail(null);

    api
      .get<ReportDetail>(`/admin/balapor/${reportId}`, {
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

  /* ── Fetch EXIF records (parallel dengan detail) — Day 6 ── */
  useEffect(() => {
    if (!reportId || !api.token) return;
    const controller = new AbortController();
    setExifLoading(true);
    setExifError(null);
    setExifRecords([]);

    api
      .get<PhotoExifRecord[]>(`/admin/balapor/${reportId}/photo-exif`, {
        signal: controller.signal,
      })
      .then((data) => setExifRecords(data ?? []))
      .catch((err) => {
        if (err instanceof ApiError) {
          setExifError(err.message);
        } else if (err.name !== 'AbortError') {
          setExifError('Gagal load validasi foto');
        }
      })
      .finally(() => setExifLoading(false));

    return () => controller.abort();
  }, [reportId, api]);

  /* ── Fetch pHash records (parallel) — Day 8 ── */
  useEffect(() => {
    if (!reportId || !api.token) return;
    const controller = new AbortController();
    setHashLoading(true);
    setHashError(null);
    setHashRecords([]);

    api
      .get<PhotoHashRecord[]>(`/admin/balapor/${reportId}/photo-hash`, {
        signal: controller.signal,
      })
      .then((data) => setHashRecords(data ?? []))
      .catch((err) => {
        if (err instanceof ApiError) {
          setHashError(err.message);
        } else if (err.name !== 'AbortError') {
          setHashError('Gagal load duplikasi foto');
        }
      })
      .finally(() => setHashLoading(false));

    return () => controller.abort();
  }, [reportId, api]);

  /* ── Reset state saat modal close ── */
  useEffect(() => {
    if (!reportId) {
      setDetail(null);
      setError(null);
      setLightboxIndex(null);
      setExifRecords([]);
      setExifError(null);
      setExpandedPhoto(null);
      setHashRecords([]);
      setHashError(null);
      setExpandedHashPhoto(null);
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

  /* ── Re-validate EXIF — Day 6 ── */
  const handleRevalidate = useCallback(async () => {
    if (!reportId || revalidating) return;
    setRevalidating(true);
    try {
      const result = await api.post<RevalidateExifResponse>(
        `/admin/balapor/${reportId}/photo-exif/revalidate`,
      );
      const fresh = await api.get<PhotoExifRecord[]>(
        `/admin/balapor/${reportId}/photo-exif`,
      );
      setExifRecords(fresh ?? []);
      setExifError(null);
      const total = result?.count ?? 0;
      onToast(`Berhasil validasi ${total} foto`, true);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Gagal trigger validasi ulang';
      onToast(msg, false);
    } finally {
      setRevalidating(false);
    }
  }, [reportId, api, onToast, revalidating]);

  /* ── Re-validate Hash — Day 8 ── */
  const handleRevalidateHash = useCallback(async () => {
    if (!reportId || revalidatingHash) return;
    setRevalidatingHash(true);
    try {
      const result = await api.post<RevalidateHashResponse>(
        `/admin/balapor/${reportId}/photo-hash/revalidate`,
      );
      const fresh = await api.get<PhotoHashRecord[]>(
        `/admin/balapor/${reportId}/photo-hash`,
      );
      setHashRecords(fresh ?? []);
      setHashError(null);
      const total = result?.count ?? 0;
      onToast(`Berhasil cek duplikat ${total} foto`, true);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : 'Gagal trigger cek duplikat';
      onToast(msg, false);
    } finally {
      setRevalidatingHash(false);
    }
  }, [reportId, api, onToast, revalidatingHash]);

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

                {/* Photo EXIF Validation — Day 6 */}
                {photos.length > 0 && (
                  <ExifValidationSection
                    records={exifRecords}
                    loading={exifLoading}
                    error={exifError}
                    revalidating={revalidating}
                    expandedPhoto={expandedPhoto}
                    onToggleExpand={(idx) =>
                      setExpandedPhoto(expandedPhoto === idx ? null : idx)
                    }
                    onRevalidate={handleRevalidate}
                  />
                )}

                {/* Photo Hash Duplicate Detection — Day 8 */}
                {photos.length > 0 && (
                  <DuplicateValidationSection
                    records={hashRecords}
                    loading={hashLoading}
                    error={hashError}
                    revalidating={revalidatingHash}
                    expandedPhoto={expandedHashPhoto}
                    onToggleExpand={(idx) =>
                      setExpandedHashPhoto(expandedHashPhoto === idx ? null : idx)
                    }
                    onRevalidate={handleRevalidateHash}
                  />
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

/* ════════════════════════════════════════════════════════════════
   Sub-component: ExifValidationSection (Day 6)
   ════════════════════════════════════════════════════════════════ */

function ExifValidationSection({
  records,
  loading,
  error,
  revalidating,
  expandedPhoto,
  onToggleExpand,
  onRevalidate,
}: {
  records: PhotoExifRecord[];
  loading: boolean;
  error: string | null;
  revalidating: boolean;
  expandedPhoto: number | null;
  onToggleExpand: (index: number) => void;
  onRevalidate: () => void;
}) {
  const worstSeverity = getWorstSeverity(records);
  const worstConfig = SEVERITY_CONFIG[worstSeverity];
  const flaggedCount = records.filter((r) => r.severity !== 'none').length;

  return (
    <section className="space-y-2">
      {/* Header dengan tombol re-validasi */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Search size={11} />
          Validasi Foto (Anti-Fake)
        </h3>
        <button
          type="button"
          onClick={onRevalidate}
          disabled={revalidating}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
            'text-[10px] font-bold uppercase tracking-wide',
            'border border-balapor/40 bg-balapor/10 text-balapor hover:bg-balapor/20 hover:border-balapor/60',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
          )}
          title={
            records.length === 0
              ? 'Validasi foto sekarang'
              : 'Validasi ulang semua foto'
          }
        >
          {revalidating ? (
            <>
              <Loader2 size={10} className="animate-spin" />
              Memvalidasi...
            </>
          ) : (
            <>
              <RefreshCw size={10} />
              {records.length === 0 ? 'Validasi Sekarang' : 'Re-validasi'}
            </>
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-surface-muted/30 border border-border rounded-lg p-4 flex items-center gap-2">
          <Loader2 size={14} className="text-balapor animate-spin" />
          <p className="text-xs text-text-muted">Memuat validasi foto...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-status-critical/5 border border-status-critical/30 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle size={14} className="text-status-critical" />
          <p className="text-xs text-status-critical">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && records.length === 0 && (
        <div className="bg-surface-muted/30 border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-text-muted italic mb-1">
            Foto belum di-validasi.
          </p>
          <p className="text-[10px] text-text-muted">
            Klik tombol &ldquo;Validasi Sekarang&rdquo; di atas untuk cek metadata foto.
          </p>
        </div>
      )}

      {/* Records present */}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-2">
          {/* Summary banner — worst severity color */}
          <div
            className={cn(
              'border rounded-lg p-3 flex items-start gap-3',
              worstConfig.bannerClass,
            )}
          >
            <div className="shrink-0 mt-0.5">
              {worstSeverity === 'none' ? (
                <ShieldCheck size={18} className={worstConfig.iconColor} />
              ) : (
                <ShieldAlert size={18} className={worstConfig.iconColor} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn('text-xs font-bold', worstConfig.iconColor)}>
                {worstConfig.emoji} {worstConfig.label}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                {flaggedCount > 0
                  ? `${flaggedCount} dari ${records.length} foto punya tanda mencurigakan. Klik foto untuk detail.`
                  : `Semua ${records.length} foto valid. Tidak ada anomaly terdeteksi.`}
              </p>
            </div>
          </div>

          {/* Per-photo collapsible cards */}
          <div className="space-y-1.5">
            {records.map((rec) => (
              <PhotoExifCard
                key={rec.id}
                record={rec}
                expanded={expandedPhoto === rec.photo_index}
                onToggle={() => onToggleExpand(rec.photo_index)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: PhotoExifCard (Day 6)
   ════════════════════════════════════════════════════════════════ */

function PhotoExifCard({
  record,
  expanded,
  onToggle,
}: {
  record: PhotoExifRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const config = SEVERITY_CONFIG[record.severity];
  const flagsText: string[] = [];
  if (record.flag_no_exif) flagsText.push('Tanpa metadata');
  if (record.flag_gps_mismatch) flagsText.push('GPS jauh');
  if (record.flag_timestamp_old) flagsText.push('Foto lama');
  const summaryText = flagsText.length > 0 ? flagsText.join(' · ') : 'Foto valid';

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* Collapsed header — always visible */}
      <button
        type="button"
        onClick={onToggle}
        className={cn(
          'w-full px-3 py-2.5 flex items-center gap-3',
          'hover:bg-surface-muted/40 transition-colors',
          'text-left',
        )}
        aria-expanded={expanded}
      >
        {/* Thumbnail */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={record.photo_url}
          alt={`Foto ${record.photo_index + 1}`}
          className="h-10 w-10 rounded object-cover shrink-0 border border-border"
          loading="lazy"
        />

        {/* Label + summary */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-xs font-bold text-text">
              Foto {record.photo_index + 1}
            </span>
            <span
              className={cn(
                'inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border',
                config.badgeClass,
              )}
            >
              {config.emoji} {config.label}
            </span>
          </div>
          <p className="text-[11px] text-text-muted truncate">{summaryText}</p>
        </div>

        {/* Chevron */}
        <div className="shrink-0 text-text-muted">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded body — metadata table + flags */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border bg-surface-muted/20 space-y-2.5">
          {/* Validation error notice (kalau parsing gagal) */}
          {record.validation_error && (
            <div className="bg-status-critical/5 border border-status-critical/30 rounded p-2 flex items-start gap-2">
              <AlertTriangle
                size={12}
                className="text-status-critical shrink-0 mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-status-critical">
                  Parsing gagal
                </p>
                <p className="text-[10px] text-text-muted truncate">
                  {record.validation_error}
                </p>
              </div>
            </div>
          )}

          {/* Active flags */}
          {(record.flag_no_exif ||
            record.flag_gps_mismatch ||
            record.flag_timestamp_old) && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Tanda Mencurigakan
              </div>
              <ul className="space-y-1">
                {record.flag_no_exif && (
                  <FlagRow
                    icon={<InfoIcon size={11} />}
                    label="Tidak ada metadata foto"
                    detail="Kemungkinan foto edit/screenshot/download dari internet."
                  />
                )}
                {record.flag_gps_mismatch && (
                  <FlagRow
                    icon={<MapPinned size={11} />}
                    label={`GPS foto jauh dari laporan: ${formatDistance(
                      record.gps_distance_meters,
                    )}`}
                    detail="Threshold: > 10 km."
                  />
                )}
                {record.flag_timestamp_old && (
                  <FlagRow
                    icon={<Clock size={11} />}
                    label={`Foto diambil ${record.timestamp_age_days} hari sebelum laporan`}
                    detail="Threshold: > 7 hari."
                  />
                )}
              </ul>
            </div>
          )}

          {/* Metadata table */}
          {record.has_exif && (
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                Metadata Foto
              </div>
              <dl className="space-y-1 text-[11px]">
                <MetaRow
                  icon={<Camera size={11} />}
                  label="Kamera"
                  value={
                    record.camera_make || record.camera_model
                      ? [record.camera_make, record.camera_model]
                          .filter(Boolean)
                          .join(' ')
                      : '-'
                  }
                />
                <MetaRow
                  icon={<Clock size={11} />}
                  label="Diambil"
                  value={formatDateID(record.date_taken)}
                />
                <MetaRow
                  icon={<MapPinned size={11} />}
                  label="GPS Foto"
                  value={
                    record.gps_latitude !== null && record.gps_longitude !== null
                      ? `${record.gps_latitude.toFixed(6)}, ${record.gps_longitude.toFixed(6)}`
                      : '-'
                  }
                />
              </dl>
            </div>
          )}

          {/* Validated at */}
          <p className="text-[9px] text-text-muted italic pt-1 border-t border-border">
            Divalidasi: {formatDateID(record.validated_at)}
          </p>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: DuplicateValidationSection (Day 8)
   ════════════════════════════════════════════════════════════════
   Section "Duplikasi Foto" — display pHash + duplicate matches.
   - Loading: spinner
   - Error: pesan
   - Empty (records.length === 0): empty state + tombol "Cek Duplikat Sekarang"
   - Records: summary banner + per-foto card (collapsible kalau ada matches)
   ════════════════════════════════════════════════════════════════ */

function DuplicateValidationSection({
  records,
  loading,
  error,
  revalidating,
  expandedPhoto,
  onToggleExpand,
  onRevalidate,
}: {
  records: PhotoHashRecord[];
  loading: boolean;
  error: string | null;
  revalidating: boolean;
  expandedPhoto: number | null;
  onToggleExpand: (index: number) => void;
  onRevalidate: () => void;
}) {
  const totalDuplicates = records.reduce(
    (sum, r) => sum + r.duplicates_found,
    0,
  );
  const photosWithDuplicates = records.filter((r) => r.duplicates_found > 0).length;
  const computeErrors = records.filter((r) => r.computation_error !== null).length;

  // Banner severity:
  //   - records.length === 0 → tidak tampil banner (empty state instead)
  //   - totalDuplicates === 0 → green "Tidak ada duplikat"
  //   - totalDuplicates > 0 → orange "Ditemukan N duplikat"
  const hasDuplicates = totalDuplicates > 0;

  return (
    <section className="space-y-2">
      {/* Header dengan tombol re-validasi */}
      <div className="flex items-center justify-between">
        <h3 className="text-[11px] font-bold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Copy size={11} />
          Duplikasi Foto
        </h3>
        <button
          type="button"
          onClick={onRevalidate}
          disabled={revalidating}
          className={cn(
            'inline-flex items-center gap-1.5 px-2 py-1 rounded-md',
            'text-[10px] font-bold uppercase tracking-wide',
            'border border-balapor/40 bg-balapor/10 text-balapor hover:bg-balapor/20 hover:border-balapor/60',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'transition-colors',
          )}
          title={
            records.length === 0
              ? 'Cek duplikat foto sekarang'
              : 'Cek duplikat ulang'
          }
        >
          {revalidating ? (
            <>
              <Loader2 size={10} className="animate-spin" />
              Memeriksa...
            </>
          ) : (
            <>
              <RefreshCw size={10} />
              {records.length === 0 ? 'Cek Duplikat Sekarang' : 'Re-validasi'}
            </>
          )}
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bg-surface-muted/30 border border-border rounded-lg p-4 flex items-center gap-2">
          <Loader2 size={14} className="text-balapor animate-spin" />
          <p className="text-xs text-text-muted">Memuat data duplikasi...</p>
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div className="bg-status-critical/5 border border-status-critical/30 rounded-lg p-4 flex items-center gap-2">
          <AlertTriangle size={14} className="text-status-critical" />
          <p className="text-xs text-status-critical">{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && records.length === 0 && (
        <div className="bg-surface-muted/30 border border-border rounded-lg p-4 text-center">
          <p className="text-xs text-text-muted italic mb-1">
            Foto belum dicek duplikat.
          </p>
          <p className="text-[10px] text-text-muted">
            Klik tombol &ldquo;Cek Duplikat Sekarang&rdquo; untuk cari foto serupa di laporan lain.
          </p>
        </div>
      )}

      {/* Records present */}
      {!loading && !error && records.length > 0 && (
        <div className="space-y-2">
          {/* Summary banner */}
          <div
            className={cn(
              'border rounded-lg p-3 flex items-start gap-3',
              hasDuplicates
                ? 'bg-status-warning/5 border-status-warning/30'
                : 'bg-status-healthy/5 border-status-healthy/30',
            )}
          >
            <div className="shrink-0 mt-0.5">
              {hasDuplicates ? (
                <ShieldAlert size={18} className="text-status-warning" />
              ) : (
                <ShieldCheck size={18} className="text-status-healthy" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-xs font-bold',
                  hasDuplicates ? 'text-status-warning' : 'text-status-healthy',
                )}
              >
                {hasDuplicates
                  ? `⚠️ Ditemukan ${totalDuplicates} foto serupa di laporan lain`
                  : '✅ Tidak ada duplikat ditemukan'}
              </p>
              <p className="text-[11px] text-text-muted mt-0.5 leading-relaxed">
                {hasDuplicates
                  ? `${photosWithDuplicates} dari ${records.length} foto punya kembar dalam 30 hari terakhir. Klik foto untuk detail.`
                  : `Semua ${records.length} foto unik dibanding laporan lain dalam 30 hari terakhir.`}
              </p>
              {computeErrors > 0 && (
                <p className="text-[10px] text-status-critical mt-1">
                  {computeErrors} foto gagal di-hash — coba re-validasi.
                </p>
              )}
            </div>
          </div>

          {/* Per-photo cards */}
          <div className="space-y-1.5">
            {records.map((rec) => (
              <PhotoHashCard
                key={rec.id}
                record={rec}
                expanded={expandedPhoto === rec.photo_index}
                onToggle={() => onToggleExpand(rec.photo_index)}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: PhotoHashCard (Day 8)
   ════════════════════════════════════════════════════════════════
   - Kalau duplicates_found === 0 → static row (no expand)
   - Kalau duplicates_found > 0 → collapsible with match list
   - Kalau computation_error → error display
   ════════════════════════════════════════════════════════════════ */

function PhotoHashCard({
  record,
  expanded,
  onToggle,
}: {
  record: PhotoHashRecord;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasError = record.computation_error !== null;
  const hasDuplicates = record.duplicates_found > 0;
  const isClickable = hasDuplicates;

  // Badge config
  let badgeText: string;
  let badgeClass: string;
  let badgeEmoji: string;

  if (hasError) {
    badgeText = 'Error';
    badgeClass = 'text-status-critical bg-status-critical/10 border-status-critical/30';
    badgeEmoji = '❌';
  } else if (hasDuplicates) {
    badgeText = `${record.duplicates_found} duplikat`;
    badgeClass = 'text-status-warning bg-status-warning/10 border-status-warning/30';
    badgeEmoji = '⚠️';
  } else {
    badgeText = 'Unik';
    badgeClass = 'text-status-healthy bg-status-healthy/10 border-status-healthy/30';
    badgeEmoji = '✅';
  }

  // Summary line
  let summaryText: string;
  if (hasError) {
    summaryText = record.computation_error ?? 'Hash compute gagal';
  } else if (hasDuplicates) {
    const firstMatch = record.duplicate_matches[0];
    if (record.duplicate_matches.length === 1) {
      summaryText = `${firstMatch.display_id ?? 'BL-?'} · ${hammingLabel(firstMatch.hamming_dist)}`;
    } else {
      summaryText = `${firstMatch.display_id ?? 'BL-?'} + ${record.duplicate_matches.length - 1} lagi`;
    }
  } else {
    summaryText = 'Tidak ada foto serupa';
  }

  return (
    <div className="border border-border rounded-lg overflow-hidden bg-surface">
      {/* Header (clickable kalau ada duplicates) */}
      {isClickable ? (
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            'w-full px-3 py-2.5 flex items-center gap-3',
            'hover:bg-surface-muted/40 transition-colors',
            'text-left',
          )}
          aria-expanded={expanded}
        >
          <PhotoHashCardHeader
            record={record}
            badgeText={badgeText}
            badgeClass={badgeClass}
            badgeEmoji={badgeEmoji}
            summaryText={summaryText}
            showChevron
            expanded={expanded}
          />
        </button>
      ) : (
        <div className="px-3 py-2.5 flex items-center gap-3">
          <PhotoHashCardHeader
            record={record}
            badgeText={badgeText}
            badgeClass={badgeClass}
            badgeEmoji={badgeEmoji}
            summaryText={summaryText}
            showChevron={false}
            expanded={false}
          />
        </div>
      )}

      {/* Expanded body — match list */}
      {expanded && hasDuplicates && (
        <div className="px-3 pb-3 pt-1 border-t border-border bg-surface-muted/20 space-y-2">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
            Foto Serupa Ditemukan ({record.duplicate_matches.length})
          </div>
          <ul className="space-y-1.5">
            {record.duplicate_matches.map((match, i) => (
              <DuplicateMatchRow key={`${match.report_id}-${match.photo_index}-${i}`} match={match} />
            ))}
          </ul>
          <p className="text-[9px] text-text-muted italic pt-1 border-t border-border">
            Dihitung: {formatDateID(record.computed_at)}
          </p>
        </div>
      )}
    </div>
  );
}

function PhotoHashCardHeader({
  record,
  badgeText,
  badgeClass,
  badgeEmoji,
  summaryText,
  showChevron,
  expanded,
}: {
  record: PhotoHashRecord;
  badgeText: string;
  badgeClass: string;
  badgeEmoji: string;
  summaryText: string;
  showChevron: boolean;
  expanded: boolean;
}) {
  return (
    <>
      {/* Thumbnail */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={record.photo_url}
        alt={`Foto ${record.photo_index + 1}`}
        className="h-10 w-10 rounded object-cover shrink-0 border border-border"
        loading="lazy"
      />

      {/* Label + summary */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-bold text-text">
            Foto {record.photo_index + 1}
          </span>
          <span
            className={cn(
              'inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border',
              badgeClass,
            )}
          >
            {badgeEmoji} {badgeText}
          </span>
        </div>
        <p className="text-[11px] text-text-muted truncate">{summaryText}</p>
      </div>

      {/* Chevron (only kalau clickable) */}
      {showChevron && (
        <div className="shrink-0 text-text-muted">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      )}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: DuplicateMatchRow (Day 8)
   ════════════════════════════════════════════════════════════════ */

function DuplicateMatchRow({ match }: { match: DuplicateMatch }) {
  const distColorClass = hammingColor(match.hamming_dist);

  return (
    <li className="bg-surface border border-border rounded p-2.5 flex items-start gap-2.5">
      <div className="h-7 w-7 rounded-md bg-balapor/10 flex items-center justify-center shrink-0 mt-0.5">
        <FileText size={12} className="text-balapor" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider font-bold">
            {match.display_id ?? 'BL-?'}
          </span>
          <span
            className={cn(
              'inline-block px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wide border',
              distColorClass,
            )}
            title={`Hamming distance: ${match.hamming_dist} bits berbeda dari 64 total`}
          >
            {hammingLabel(match.hamming_dist)}
          </span>
          <span className="text-[10px] text-text-muted">
            · Foto {match.photo_index + 1}
          </span>
        </div>
        <p className="text-[11px] text-text font-medium truncate" title={match.title}>
          {match.title}
        </p>
        <p className="text-[10px] text-text-muted mt-0.5">
          {timeAgo(match.created_at)}
        </p>
      </div>
    </li>
  );
}

/* ════════════════════════════════════════════════════════════════
   Sub-component: FlagRow + MetaRow (Day 6)
   ════════════════════════════════════════════════════════════════ */

function FlagRow({
  icon,
  label,
  detail,
}: {
  icon: React.ReactNode;
  label: string;
  detail: string;
}) {
  return (
    <li className="flex items-start gap-1.5">
      <span className="text-status-warning shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-semibold text-text">{label}</p>
        <p className="text-[10px] text-text-muted">{detail}</p>
      </div>
    </li>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-text-muted shrink-0">{icon}</span>
      <dt className="text-text-muted shrink-0 w-16">{label}</dt>
      <dd className="text-text font-medium truncate flex-1 min-w-0" title={value}>
        {value}
      </dd>
    </div>
  );
}

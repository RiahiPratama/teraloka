'use client';

// ════════════════════════════════════════════════════════════════
// CIVIC FEEDBACK TIMELINE MODAL — Sub-Sprint 1C-B.4
// ────────────────────────────────────────────────────────────────
// Display full history follow-up untuk laporan tertentu.
// Pelapor bisa lihat semua update yang pernah disubmit.
//
// Layout:
//   - Mobile: bottom sheet (slide-up dari bawah)
//   - Desktop: center modal dengan backdrop
//
// Data flow:
//   1. Mount → useEffect fetch GET /balapor/reports/me/:id/follow-ups
//   2. Loading state: skeleton 3 entry
//   3. Data ready: render timeline newest first
//   4. Click photo thumbnail → open full size di tab baru
//
// Timeline UI:
//   - Bullet dot + vertical connector line
//   - Status icon + label + relative timestamp
//   - Note (kalau ada)
//   - Photo thumbnails grid (kalau ada)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { X, RefreshCw, AlertTriangle, Wrench, CheckCircle2, HelpCircle, Inbox, type LucideIcon } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

// ─── Types ──────────────────────────────────────────────────────

type FollowUpStatus =
  | 'belum_ditangani'
  | 'sedang_ditangani'
  | 'sudah_selesai'
  | 'tidak_jelas';

interface FollowUp {
  id: string;
  report_id: string;
  status: FollowUpStatus;
  note: string | null;
  photos: string[] | null;
  updated_by: string | null;
  created_at: string;
}

interface CivicFeedbackTimelineModalProps {
  reportId: string;
  reportDisplayId: string | null;
  reportTitle: string;
  onClose: () => void;
}

// ─── Status display config ──────────────────────────────────────

const FOLLOW_UP_STATUS_CONFIG: Record<FollowUpStatus, {
  Icon: LucideIcon;
  iconColor: string;
  label: string;
  dotColor: string;
  textColor: string;
}> = {
  belum_ditangani: {
    Icon: AlertTriangle,
    iconColor: '#d97706',
    label: 'Belum ditangani',
    dotColor: 'bg-amber-400',
    textColor: 'text-amber-700',
  },
  sedang_ditangani: {
    Icon: Wrench,
    iconColor: '#2563eb',
    label: 'Sedang ditangani',
    dotColor: 'bg-blue-400',
    textColor: 'text-blue-700',
  },
  sudah_selesai: {
    Icon: CheckCircle2,
    iconColor: '#16a34a',
    label: 'Sudah selesai',
    dotColor: 'bg-green-400',
    textColor: 'text-green-700',
  },
  tidak_jelas: {
    Icon: HelpCircle,
    iconColor: '#6b7280',
    label: 'Tidak jelas',
    dotColor: 'bg-gray-400',
    textColor: 'text-gray-700',
  },
};

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
  const date = new Date(dateStr);
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function CivicFeedbackTimelineModal({
  reportId,
  reportDisplayId,
  reportTitle,
  onClose,
}: CivicFeedbackTimelineModalProps) {
  const { token } = useAuth();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lock body scroll + handle Escape
  useEffect(() => {
    document.body.style.overflow = 'hidden';

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  // Fetch timeline saat mount
  useEffect(() => {
    fetchTimeline();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  async function fetchTimeline() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_URL}/balapor/reports/me/${reportId}/follow-ups`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) {
        throw new Error('Gagal memuat riwayat');
      }

      const json = await res.json();
      setFollowUps(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end md:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timeline-modal-title"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal panel */}
      <div className="relative bg-white w-full md:max-w-lg md:rounded-2xl rounded-t-2xl shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-4 border-b border-gray-100 shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <h2
              id="timeline-modal-title"
              className="text-base font-bold text-gray-900"
            >
              Riwayat Tindak Lanjut
            </h2>
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              <span className="font-mono mr-1">{reportDisplayId || '#—'}</span>
              · {reportTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 shrink-0"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <TimelineSkeleton />
          ) : error ? (
            <ErrorState message={error} onRetry={fetchTimeline} />
          ) : followUps.length === 0 ? (
            <EmptyState />
          ) : (
            <Timeline followUps={followUps} />
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex gap-3 animate-pulse">
          <div className="w-3 h-3 bg-gray-200 rounded-full mt-1.5 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-32" />
            <div className="h-3 bg-gray-100 rounded w-20" />
            <div className="h-12 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="text-center py-8 px-4">
      <AlertTriangle className="w-10 h-10 mx-auto text-amber-400 mb-3" />
      <p className="text-sm text-gray-700 font-medium mb-2">Gagal memuat riwayat</p>
      <p className="text-xs text-gray-500 mb-4">{message}</p>
      <button
        onClick={onRetry}
        className="inline-flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Coba Lagi
      </button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-8 px-4">
      <Inbox className="w-10 h-10 mx-auto text-gray-300 mb-3" />
      <p className="text-sm text-gray-700 font-medium mb-1">Belum ada riwayat</p>
      <p className="text-xs text-gray-500">
        Submit update status terlebih dulu untuk lihat riwayat di sini.
      </p>
    </div>
  );
}

function Timeline({ followUps }: { followUps: FollowUp[] }) {
  return (
    <div className="space-y-0">
      {followUps.map((fu, idx) => {
        const cfg = FOLLOW_UP_STATUS_CONFIG[fu.status];
        const isLast = idx === followUps.length - 1;

        return (
          <TimelineEntry
            key={fu.id}
            followUp={fu}
            cfg={cfg}
            isLast={isLast}
          />
        );
      })}
    </div>
  );
}

function TimelineEntry({
  followUp,
  cfg,
  isLast,
}: {
  followUp: FollowUp;
  cfg: typeof FOLLOW_UP_STATUS_CONFIG[FollowUpStatus];
  isLast: boolean;
}) {
  const photoCount = followUp.photos?.length ?? 0;
  const StatusIcon = cfg.Icon;

  return (
    <div className="flex gap-3 relative pb-5">
      {/* Bullet dot + connector line */}
      <div className="shrink-0 flex flex-col items-center">
        <div className={`w-3 h-3 rounded-full ${cfg.dotColor} ring-4 ring-white relative z-10 mt-1`} />
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gray-200 mt-1" />
        )}
      </div>

      {/* Entry content */}
      <div className="flex-1 min-w-0 pb-2">
        {/* Status header */}
        <div className="flex items-center gap-1.5 mb-1">
          <StatusIcon className="w-4 h-4 shrink-0" style={{ color: cfg.iconColor }} />
          <p className={`text-sm font-semibold ${cfg.textColor}`}>
            {cfg.label}
          </p>
        </div>

        {/* Timestamp */}
        <p
          className="text-xs text-gray-500 mb-2"
          title={formatAbsoluteDate(followUp.created_at)}
        >
          {formatRelativeTime(followUp.created_at)}
        </p>

        {/* Note */}
        {followUp.note && (
          <div className="bg-gray-50 rounded-lg p-2.5 mb-2">
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              "{followUp.note}"
            </p>
          </div>
        )}

        {/* Photos grid */}
        {photoCount > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {followUp.photos!.slice(0, 3).map((url, i) => (
              <a
                key={i}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-16 h-16 rounded-lg overflow-hidden border border-gray-200 hover:opacity-80 transition-opacity"
                aria-label={`Foto bukti ${i + 1}`}
              >
                <img
                  src={url}
                  alt=""
                  loading="lazy"
                  className="w-full h-full object-cover"
                />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

// ════════════════════════════════════════════════════════════════
// CIVIC FEEDBACK SECTION — Sub-Sprint 1C-B.3 + 1C-B.4
// ────────────────────────────────────────────────────────────────
// Filosofi: TeraLoka = independent civic platform.
//   - Citizen lapor → TeraLoka verify → Citizen track real-world
//   - Pelapor monitor kondisi nyata di lokasi, bukan klaim instansi
//   - BAKABAR editor pakai data ini untuk pattern detection
//
// Visibility:
//   - Tampil HANYA untuk status 'verified' atau 'published'
//   - Status 'pending'/'reviewing'/'rejected' = TIDAK tampil
//
// 2 State Variant:
//   1. Empty state — belum ada follow-up (1 CTA "Update Status")
//   2. Active state — ada follow-up (display last + 2 button: Update + Riwayat)
//
// History:
//   - 7 Mei 2026 (Sub-Sprint 1C-B.3): Section + Update modal
//   - 7 Mei 2026 (Sub-Sprint 1C-B.4): Tambah Timeline modal (Lihat Riwayat)
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import CivicFeedbackModal from './CivicFeedbackModal';
import CivicFeedbackTimelineModal from './CivicFeedbackTimelineModal';

// ─── Types ──────────────────────────────────────────────────────

type FollowUpStatus =
  | 'belum_ditangani'
  | 'sedang_ditangani'
  | 'sudah_selesai'
  | 'tidak_jelas';

interface CivicFeedbackSectionProps {
  reportId: string;
  reportDisplayId: string | null;
  reportTitle: string;
  followUpCurrentStatus: FollowUpStatus | null;
  followUpUpdatedAt: string | null;
  onSubmitSuccess: (newStatus: FollowUpStatus, updatedAt: string) => void;
}

// ─── Status display config ──────────────────────────────────────

const FOLLOW_UP_STATUS_CONFIG: Record<FollowUpStatus, {
  icon: string;
  label: string;
  color: string;
  bg: string;
  border: string;
}> = {
  belum_ditangani: {
    icon: '⚠️',
    label: 'Belum ditangani',
    color: 'text-amber-700',
    bg: 'bg-amber-50',
    border: 'border-amber-200',
  },
  sedang_ditangani: {
    icon: '🔧',
    label: 'Sedang ditangani',
    color: 'text-blue-700',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  sudah_selesai: {
    icon: '✅',
    label: 'Sudah selesai',
    color: 'text-green-700',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  tidak_jelas: {
    icon: '❓',
    label: 'Tidak jelas',
    color: 'text-gray-700',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
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

// ════════════════════════════════════════════════════════════════
// COMPONENT
// ════════════════════════════════════════════════════════════════

export default function CivicFeedbackSection({
  reportId,
  reportDisplayId,
  reportTitle,
  followUpCurrentStatus,
  followUpUpdatedAt,
  onSubmitSuccess,
}: CivicFeedbackSectionProps) {
  const [updateModalOpen, setUpdateModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);

  const hasFollowUp = followUpCurrentStatus !== null && followUpUpdatedAt !== null;

  return (
    <>
      <div className="mt-3 bg-gradient-to-br from-red-50/50 to-orange-50/50 border border-red-100 rounded-lg p-3">
        <div className="flex items-start gap-2 mb-2">
          <span className="text-base shrink-0">🤝</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900">Bantu Pantau</p>
            <p className="text-xs text-gray-600 leading-relaxed">
              {hasFollowUp
                ? 'Status terkini dari pelapor langsung di lokasi'
                : 'Kondisi sudah berubah? Bantu warga lain dengan update kondisi nyata.'}
            </p>
          </div>
        </div>

        {/* Active state — display last follow-up */}
        {hasFollowUp && followUpCurrentStatus && (
          <div
            className={`${FOLLOW_UP_STATUS_CONFIG[followUpCurrentStatus].bg} ${FOLLOW_UP_STATUS_CONFIG[followUpCurrentStatus].border} border rounded-lg p-2.5 mb-2.5`}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm shrink-0">
                {FOLLOW_UP_STATUS_CONFIG[followUpCurrentStatus].icon}
              </span>
              <p
                className={`text-xs font-semibold ${FOLLOW_UP_STATUS_CONFIG[followUpCurrentStatus].color} flex-1`}
              >
                {FOLLOW_UP_STATUS_CONFIG[followUpCurrentStatus].label}
              </p>
              {followUpUpdatedAt && (
                <span className="text-xs text-gray-500">
                  {formatRelativeTime(followUpUpdatedAt)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* CTA buttons — 1 button (empty) atau 2 button (active) */}
        {hasFollowUp ? (
          <div className="flex gap-2">
            <button
              onClick={() => setUpdateModalOpen(true)}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Perbarui
            </button>
            <button
              onClick={() => setTimelineModalOpen(true)}
              className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Lihat Riwayat
            </button>
          </div>
        ) : (
          <button
            onClick={() => setUpdateModalOpen(true)}
            className="w-full bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-3 py-2 rounded-lg transition-colors flex items-center justify-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            Update Status
          </button>
        )}
      </div>

      {/* Update Modal */}
      {updateModalOpen && (
        <CivicFeedbackModal
          reportId={reportId}
          reportDisplayId={reportDisplayId}
          reportTitle={reportTitle}
          currentStatus={followUpCurrentStatus}
          onClose={() => setUpdateModalOpen(false)}
          onSubmitSuccess={(newStatus, updatedAt) => {
            onSubmitSuccess(newStatus, updatedAt);
            setUpdateModalOpen(false);
          }}
        />
      )}

      {/* Timeline Modal */}
      {timelineModalOpen && (
        <CivicFeedbackTimelineModal
          reportId={reportId}
          reportDisplayId={reportDisplayId}
          reportTitle={reportTitle}
          onClose={() => setTimelineModalOpen(false)}
        />
      )}
    </>
  );
}

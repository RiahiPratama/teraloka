'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import CivicFeedbackSection from '@/components/balapor/CivicFeedbackSection'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

// ════════════════════════════════════════════════════════════════
// TYPES — Match backend response shape (Sub-Sprint 1C-C-1 Phase 4)
// ════════════════════════════════════════════════════════════════

interface LinkedArticle {
  id: string
  title: string
  slug: string
  status: string
}

type FollowUpStatus =
  | 'belum_ditangani'
  | 'sedang_ditangani'
  | 'sudah_selesai'
  | 'tidak_jelas'

// 8 lifecycle states (computed di backend per Sub-Sprint 1C-C-1)
type LifecycleState =
  | 'pending'
  | 'reviewing'
  | 'verified'
  | 'published'
  | 'stalemate'
  | 'stale'
  | 'resolved'
  | 'rejected'

interface Report {
  id: string
  display_id: string | null
  title: string
  body: string
  status: 'pending' | 'reviewing' | 'verified' | 'rejected' | 'published'
  // NEW: lifecycle_state computed di backend (Sub-Sprint 1C-C-1)
  lifecycle_state: LifecycleState
  category: string
  anonymity_level: string
  pseudonym: string | null
  location: string | null
  location_id: string | null
  location_name: string | null
  location_type: string | null
  latitude: number | null
  longitude: number | null
  photos: string[] | null
  created_at: string
  priority: 'urgent' | 'high' | 'normal' | null
  notification_opt_in: boolean
  linked_article_id: string | null
  linked_article: LinkedArticle | null
  rejection_reason: string | null
  assigned_instansi: string | null
  follow_up_current_status: FollowUpStatus | null
  follow_up_updated_at: string | null
}

interface StatusCounts {
  all: number
  pending: number
  reviewing: number
  verified: number
  published: number
  rejected: number
}

type TabKey = 'all' | 'menunggu' | 'diverifikasi' | 'berita' | 'ditolak'

type CategoryFilter =
  | 'all'
  | 'keamanan'
  | 'infrastruktur'
  | 'lingkungan'
  | 'layanan_publik'
  | 'kesehatan'
  | 'pendidikan'
  | 'transportasi'
  | 'lainnya'

// ════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════

const URL_LAPOR = '/balapor/buat-laporan'

// Tab filter berdasarkan status (DB raw field), lifecycle_state hanya untuk display copy.
// Stalemate/stale/resolved adalah derivative dari verified/published — tetap masuk tab respective.
const TAB_TO_STATUSES: Record<TabKey, Report['status'][]> = {
  all: ['pending', 'reviewing', 'verified', 'published', 'rejected'],
  menunggu: ['pending', 'reviewing'],
  diverifikasi: ['verified'],
  berita: ['published'],
  ditolak: ['rejected'],
}

const TAB_LABELS: Record<TabKey, string> = {
  all: 'Semua',
  menunggu: 'Menunggu',
  diverifikasi: 'Diverifikasi',
  berita: 'Berita',
  ditolak: 'Ditolak',
}

const CATEGORY_OPTIONS: { key: CategoryFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Semua kategori', icon: '📋' },
  { key: 'infrastruktur', label: 'Infrastruktur', icon: '🔧' },
  { key: 'lingkungan', label: 'Lingkungan', icon: '🌳' },
  { key: 'keamanan', label: 'Keamanan', icon: '🛡️' },
  { key: 'layanan_publik', label: 'Layanan Publik', icon: '🏛️' },
  { key: 'kesehatan', label: 'Kesehatan', icon: '🏥' },
  { key: 'pendidikan', label: 'Pendidikan', icon: '📚' },
  { key: 'transportasi', label: 'Transportasi', icon: '🚌' },
  { key: 'lainnya', label: 'Lainnya', icon: '📌' },
]

// ─── STATUS_CONFIG keyed by LifecycleState (8 states, honest copy Rule 25) ──
// Update Sub-Sprint 1C-C-1 Phase 4 (8 Mei 2026):
//   - Strategi power-flip: TeraLoka TIDAK forward ke instansi
//   - Verified = end state sah (gak harus naik BAKABAR)
//   - 3 lifecycle baru: stalemate, stale, resolved
//   - Copy framing: "tercatat resmi", "dipantau publik", BUKAN "menunggu instansi"
const STATUS_CONFIG: Record<LifecycleState, {
  bg: string
  border: string
  icon: string
  title: string
  description: string
}> = {
  pending: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    icon: '🟡',
    title: 'Menunggu Tinjauan',
    description: 'Laporan diterima, tim akan tinjau dalam 1-3 hari kerja',
  },
  reviewing: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    icon: '🔍',
    title: 'Sedang Ditinjau',
    description: 'Tim moderasi sedang memeriksa detail laporan',
  },
  verified: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    icon: '✅',
    title: 'Terverifikasi',
    description: 'Laporan terbukti valid dan tercatat resmi sebagai data publik TeraLoka.',
  },
  published: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    icon: '📰',
    title: 'Jadi Berita BAKABAR',
    description: 'Laporanmu menginspirasi artikel berita publik. Sedang dipantau netizen Malut.',
  },
  stalemate: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    icon: '⚠️',
    title: 'Belum Ada Progress',
    description: 'Update dari pelapor menyatakan kondisi belum membaik. Tim mempertimbangkan langkah lanjutan.',
  },
  stale: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    icon: '⏸️',
    title: 'Tunggu Konfirmasi',
    description: 'Sudah lama tanpa update lapangan. Apakah kondisi sudah berubah? Bantu update.',
  },
  resolved: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    icon: '🎉',
    title: 'Selesai',
    description: 'Sudah teratasi! Terima kasih atas kontribusi kamu untuk Maluku Utara.',
  },
  rejected: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    icon: '❌',
    title: 'Tidak Dapat Diproses',
    description: '',
  },
}

const CATEGORY_ICONS: Record<string, string> = {
  infrastruktur: '🔧',
  lingkungan: '🌳',
  keamanan: '🛡️',
  layanan_publik: '🏛️',
  kesehatan: '🏥',
  pendidikan: '📚',
  transportasi: '🚌',
  lainnya: '📌',
}

// Lifecycle states yang punya civic feedback section visible
// (verified, published, plus derivatives stalemate/stale/resolved)
const CIVIC_FEEDBACK_VISIBLE_STATES: LifecycleState[] = [
  'verified', 'published', 'stalemate', 'stale', 'resolved'
]

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHour = Math.floor(diffMs / 3600000)
  const diffDay = Math.floor(diffMs / 86400000)

  if (diffMin < 1) return 'baru saja'
  if (diffMin < 60) return `${diffMin} menit lalu`
  if (diffHour < 24) return `${diffHour} jam lalu`
  if (diffDay < 7) return `${diffDay} hari lalu`
  if (diffDay < 30) return `${Math.floor(diffDay / 7)} minggu lalu`
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} bulan lalu`
  return `${Math.floor(diffDay / 365)} tahun lalu`
}

function computeTabCount(counts: StatusCounts, tab: TabKey): number {
  if (tab === 'all') return counts.all
  if (tab === 'menunggu') return counts.pending + counts.reviewing
  if (tab === 'diverifikasi') return counts.verified
  if (tab === 'berita') return counts.published
  if (tab === 'ditolak') return counts.rejected
  return 0
}

function formatCategory(category: string): string {
  return category
    .split('_')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Fallback resolver: kalau backend gak return lifecycle_state (older API),
// derive dari status raw. Defensive untuk graceful degradation.
function resolveLifecycleState(report: Report): LifecycleState {
  if (report.lifecycle_state) return report.lifecycle_state
  // Fallback: map status → lifecycle naive
  return report.status as LifecycleState
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════

function MyReportsContent() {
  const { user, token } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [counts, setCounts] = useState<StatusCounts>({
    all: 0, pending: 0, reviewing: 0, verified: 0, published: 0, rejected: 0,
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (user && token) fetchReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token, page])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/balapor/reports/me?page=${page}&limit=20`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Gagal fetch')
      const json = await res.json()

      const fetchedReports: Report[] = json.data || []
      const meta = json.meta || {}
      const pagination = meta.pagination || {}
      const fetchedCounts: StatusCounts = meta.counts || {
        all: 0, pending: 0, reviewing: 0, verified: 0, published: 0, rejected: 0,
      }

      setReports(fetchedReports)
      setCounts(fetchedCounts)
      setTotalPages(Math.ceil((pagination.total || 0) / 20) || 1)
    } catch (err) {
      console.error('[MyReports] fetch error:', err)
      setReports([])
      setCounts({ all: 0, pending: 0, reviewing: 0, verified: 0, published: 0, rejected: 0 })
    } finally {
      setLoading(false)
    }
  }

  async function toggleNotification(reportId: string, currentOptIn: boolean) {
    setTogglingId(reportId)
    try {
      const res = await fetch(`${API_URL}/balapor/reports/me/${reportId}/notification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notification_opt_in: !currentOptIn }),
      })
      if (res.ok) {
        setReports(prev =>
          prev.map(r => (r.id === reportId ? { ...r, notification_opt_in: !currentOptIn } : r))
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  // Sub-Step 3.3: Optimistic update setelah submit civic feedback
  function handleFollowUpUpdate(
    reportId: string,
    newStatus: FollowUpStatus,
    updatedAt: string
  ) {
    setReports(prev =>
      prev.map(r =>
        r.id === reportId
          ? {
            ...r,
            follow_up_current_status: newStatus,
            follow_up_updated_at: updatedAt,
          }
          : r
      )
    )
  }

  const filteredReports = useMemo(() => {
    const allowedStatuses = TAB_TO_STATUSES[activeTab]
    const queryLower = searchQuery.trim().toLowerCase()

    return reports.filter(r => {
      if (!allowedStatuses.includes(r.status)) return false
      if (categoryFilter !== 'all' && r.category !== categoryFilter) return false

      if (queryLower) {
        const hayStack = [
          r.title?.toLowerCase() ?? '',
          r.body?.toLowerCase() ?? '',
          r.display_id?.toLowerCase() ?? '',
        ].join(' ')
        if (!hayStack.includes(queryLower)) return false
      }

      return true
    })
  }, [reports, activeTab, searchQuery, categoryFilter])

  const isFilterActive = searchQuery.trim() !== '' || categoryFilter !== 'all'

  function resetFilters() {
    setSearchQuery('')
    setCategoryFilter('all')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header (NON-sticky) */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href="/"
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Kembali ke beranda"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">Laporan Saya</h1>
            <p className="text-xs text-gray-500">Pantau status laporan BALAPOR kamu</p>
          </div>
          <Link
            href={URL_LAPOR}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
          >
            <span>+</span> Lapor
          </Link>
        </div>

        {/* Search bar */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari judul, isi laporan, atau ID..."
              className="w-full pl-10 pr-4 py-2 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-3xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {(Object.keys(TAB_LABELS) as TabKey[]).map(tab => {
            const count = computeTabCount(counts, tab)
            const isActive = activeTab === tab
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors flex items-center gap-1.5 ${isActive
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                <span>{TAB_LABELS[tab]}</span>
                <span className={`text-xs ${isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'} px-1.5 py-0.5 rounded-full font-semibold`}>
                  {count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Category filter */}
        <div className="max-w-3xl mx-auto px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORY_OPTIONS.map(opt => {
            const isActive = categoryFilter === opt.key
            return (
              <button
                key={opt.key}
                onClick={() => setCategoryFilter(opt.key)}
                className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${isActive
                    ? 'bg-green-100 text-green-800 ring-1 ring-green-300'
                    : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <span>{opt.icon}</span>
                <span>{opt.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/3 mb-3" />
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-1/2 mb-3" />
                <div className="h-12 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <EmptyState
            tab={activeTab}
            totalAll={counts.all}
            isFilterActive={isFilterActive}
            onResetFilter={resetFilters}
          />
        ) : (
          <>
            {filteredReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                togglingId={togglingId}
                onToggleNotification={toggleNotification}
                onFollowUpUpdate={handleFollowUpUpdate}
              />
            ))}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Sebelumnya
                </button>
                <span className="px-3 py-2 text-sm text-gray-500 font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Berikutnya →
                </button>
              </div>
            )}

            <TrustBanner />
          </>
        )}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ════════════════════════════════════════════════════════════════

function EmptyState({
  tab,
  totalAll,
  isFilterActive,
  onResetFilter,
}: {
  tab: TabKey
  totalAll: number
  isFilterActive: boolean
  onResetFilter: () => void
}) {
  if (isFilterActive) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-gray-700 font-semibold mb-2">Tidak ada hasil yang cocok</p>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          Coba ubah kata kunci pencarian atau pilih kategori lain
        </p>
        <button
          onClick={onResetFilter}
          className="inline-block bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Reset Filter
        </button>
      </div>
    )
  }

  if (totalAll === 0) {
    return (
      <div className="text-center py-16 px-4">
        <div className="text-5xl mb-4">📋</div>
        <p className="text-gray-700 font-semibold mb-2">Belum ada laporan</p>
        <p className="text-sm text-gray-500 mb-6 max-w-xs mx-auto">
          Suaramu penting. Laporkan masalah di sekitarmu untuk membantu wilayah Maluku Utara jadi lebih baik.
        </p>
        <Link
          href={URL_LAPOR}
          className="inline-block bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
        >
          Buat Laporan Pertama
        </Link>
      </div>
    )
  }

  const messages: Record<TabKey, { icon: string; text: string }> = {
    all: { icon: '📋', text: 'Belum ada laporan' },
    menunggu: { icon: '⏳', text: 'Tidak ada laporan yang sedang menunggu tinjauan' },
    diverifikasi: { icon: '✅', text: 'Belum ada laporan yang terverifikasi' },
    berita: { icon: '📰', text: 'Belum ada laporan yang jadi berita BAKABAR' },
    ditolak: { icon: '❌', text: 'Tidak ada laporan yang ditolak' },
  }
  const msg = messages[tab]

  return (
    <div className="text-center py-12 px-4">
      <div className="text-4xl mb-3">{msg.icon}</div>
      <p className="text-gray-600 text-sm">{msg.text}</p>
    </div>
  )
}

function ReportCard({
  report,
  togglingId,
  onToggleNotification,
  onFollowUpUpdate,
}: {
  report: Report
  togglingId: string | null
  onToggleNotification: (id: string, currentOptIn: boolean) => void
  onFollowUpUpdate: (id: string, newStatus: FollowUpStatus, updatedAt: string) => void
}) {
  // Use lifecycle_state untuk pilih config (computed di backend, fallback ke status)
  const lifecycle = resolveLifecycleState(report)
  const cfg = STATUS_CONFIG[lifecycle]
  const categoryIcon = CATEGORY_ICONS[report.category] || '📌'
  const photoCount = report.photos?.length ?? 0

  // Civic Feedback section visible untuk verified/published + derivatives (stalemate/stale/resolved)
  const canShowCivicFeedback = CIVIC_FEEDBACK_VISIBLE_STATES.includes(lifecycle)

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-sm transition-shadow">
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono text-gray-500 font-medium">
            {report.display_id || '#—'}
          </span>
          <span className="text-xs text-gray-400">
            {formatRelativeTime(report.created_at)}
          </span>
        </div>

        <div className="flex gap-3 mb-3">
          {photoCount > 0 && (
            <div className="relative shrink-0">
              <img
                src={report.photos![0]}
                alt=""
                loading="lazy"
                className="w-20 h-20 rounded-lg object-cover bg-gray-100"
              />
              {photoCount > 1 && (
                <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-medium">
                  📷{photoCount}
                </span>
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 line-clamp-2 mb-1">{report.title}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <span>{categoryIcon}</span>
                <span>{formatCategory(report.category)}</span>
              </span>
              {report.location_name && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-0.5">
                    <span>📍</span>
                    <span className="truncate">{report.location_name}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <StatusBox report={report} cfg={cfg} />

        {report.status === 'published' && report.linked_article && (
          <LinkedArticleBox article={report.linked_article} />
        )}

        {/* Sub-Step 3.3: Civic Feedback Section */}
        {canShowCivicFeedback && (
          <CivicFeedbackSection
            reportId={report.id}
            reportDisplayId={report.display_id}
            reportTitle={report.title}
            followUpCurrentStatus={report.follow_up_current_status}
            followUpUpdatedAt={report.follow_up_updated_at}
            onSubmitSuccess={(newStatus, updatedAt) => {
              onFollowUpUpdate(report.id, newStatus, updatedAt)
            }}
          />
        )}

        {/* Notification toggle */}
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-gray-700">Notifikasi WA</p>
            <p className="text-xs text-gray-400">
              {report.notification_opt_in
                ? 'Aktif — kamu akan dapat update via WA'
                : 'Nonaktif — update hanya di halaman ini'}
            </p>
          </div>
          <button
            onClick={() => onToggleNotification(report.id, report.notification_opt_in)}
            disabled={togglingId === report.id}
            aria-label={`Toggle notifikasi WA untuk laporan ${report.display_id}`}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${report.notification_opt_in ? 'bg-green-500' : 'bg-gray-300'
              } ${togglingId === report.id ? 'opacity-50' : ''}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${report.notification_opt_in ? 'translate-x-5' : 'translate-x-0'
                }`}
            />
          </button>
        </div>
      </div>
    </div>
  )
}

function StatusBox({
  report,
  cfg,
}: {
  report: Report
  cfg: typeof STATUS_CONFIG[LifecycleState]
}) {
  // Untuk rejected, prefer rejection_reason kalau ada
  const description =
    report.lifecycle_state === 'rejected' && report.rejection_reason
      ? report.rejection_reason
      : cfg.description

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <span className="text-base shrink-0">{cfg.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 mb-0.5">{cfg.title}</p>
          <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
        </div>
      </div>
    </div>
  )
}

function LinkedArticleBox({ article }: { article: LinkedArticle }) {
  if (article.status !== 'published') {
    return null
  }

  return (
    <div className="mt-3 bg-purple-50 border border-purple-200 rounded-lg p-3">
      <p className="text-xs text-purple-700 font-medium mb-1.5">📰 Sudah jadi artikel:</p>
      <Link
        href={`/bakabar/${article.slug}`}
        className="text-sm text-purple-900 font-semibold hover:underline line-clamp-2"
      >
        {article.title}
      </Link>
      <Link
        href={`/bakabar/${article.slug}`}
        className="inline-block mt-1.5 text-xs text-purple-700 hover:text-purple-900 font-medium"
      >
        Baca artikel di BAKABAR →
      </Link>
    </div>
  )
}

function TrustBanner() {
  return (
    <div className="mt-6 bg-gradient-to-br from-red-50 to-orange-50 border border-red-100 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <span className="text-2xl shrink-0">🛡️</span>
        <div>
          <p className="font-bold text-gray-900 mb-1">Transparan & Akuntabel</p>
          <p className="text-xs text-gray-700 leading-relaxed">
            Suaramu, cerita kita. TeraLoka mencatat setiap laporan secara resmi dan independen.
            Laporan terverifikasi berpeluang menjadi berita BAKABAR untuk mendorong perhatian publik.
          </p>
        </div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PAGE EXPORT
// ════════════════════════════════════════════════════════════════

export default function MyReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500" />
        </div>
      }
    >
      <MyReportsContent />
    </Suspense>
  )
}

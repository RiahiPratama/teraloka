'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import CivicFeedbackSection from '@/components/balapor/CivicFeedbackSection'
import {
  LayoutGrid, Wrench, Trees, Shield, Landmark, HeartPulse, GraduationCap, Bus, Tag,
  Clock, Search, BadgeCheck, Newspaper, AlertTriangle, PauseCircle, PartyPopper, XCircle,
  MapPin, Images, Plus, ChevronLeft, ShieldCheck, Inbox, SearchX, ImageOff,
  type LucideIcon,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

// Cap fetch — laporan milik user sendiri (skala kecil). Citizen wajar punya 5–50.
// Kalau >200 (nyaris mustahil), sisanya gak ke-load (acceptable trade-off).
const FETCH_LIMIT = 200

// Client-side pagination atas hasil filter (bukan paginasi server).
// Bikin badge/list/search/kategori konsisten — fix mismatch paginasi-server+filter-client.
const PAGE_SIZE = 8

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

// RULE 34 (ICON-001): data-structure icons = Lucide React, BUKAN emoji.
const CATEGORY_OPTIONS: { key: CategoryFilter; label: string; Icon: LucideIcon }[] = [
  { key: 'all', label: 'Semua kategori', Icon: LayoutGrid },
  { key: 'infrastruktur', label: 'Infrastruktur', Icon: Wrench },
  { key: 'lingkungan', label: 'Lingkungan', Icon: Trees },
  { key: 'keamanan', label: 'Keamanan', Icon: Shield },
  { key: 'layanan_publik', label: 'Layanan Publik', Icon: Landmark },
  { key: 'kesehatan', label: 'Kesehatan', Icon: HeartPulse },
  { key: 'pendidikan', label: 'Pendidikan', Icon: GraduationCap },
  { key: 'transportasi', label: 'Transportasi', Icon: Bus },
  { key: 'lainnya', label: 'Lainnya', Icon: Tag },
]

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  infrastruktur: Wrench,
  lingkungan: Trees,
  keamanan: Shield,
  layanan_publik: Landmark,
  kesehatan: HeartPulse,
  pendidikan: GraduationCap,
  transportasi: Bus,
  lainnya: Tag,
}

// ─── STATUS_CONFIG keyed by LifecycleState (8 states, honest copy Rule 25) ──
// Update Sub-Sprint 1C-C-1 Phase 4 (8 Mei 2026):
//   - Strategi power-flip: TeraLoka TIDAK forward ke instansi
//   - Verified = end state sah (gak harus naik BAKABAR)
//   - 3 lifecycle baru: stalemate, stale, resolved
//   - Copy framing: "tercatat resmi", "dipantau publik", BUKAN "menunggu instansi"
const STATUS_CONFIG: Record<LifecycleState, {
  bg: string
  border: string
  Icon: LucideIcon
  iconColor: string
  title: string
  description: string
}> = {
  pending: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    Icon: Clock,
    iconColor: '#d97706',
    title: 'Menunggu Tinjauan',
    description: 'Laporan diterima, tim akan tinjau dalam 1-3 hari kerja',
  },
  reviewing: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    Icon: Search,
    iconColor: '#2563eb',
    title: 'Sedang Ditinjau',
    description: 'Tim moderasi sedang memeriksa detail laporan',
  },
  verified: {
    bg: 'bg-green-50',
    border: 'border-green-200',
    Icon: BadgeCheck,
    iconColor: '#16a34a',
    title: 'Terverifikasi',
    description: 'Laporan terbukti valid dan tercatat resmi sebagai data publik TeraLoka.',
  },
  published: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    Icon: Newspaper,
    iconColor: '#9333ea',
    title: 'Jadi Berita BAKABAR',
    description: 'Laporanmu menginspirasi artikel berita publik. Sedang dipantau netizen Malut.',
  },
  stalemate: {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    Icon: AlertTriangle,
    iconColor: '#ea580c',
    title: 'Belum Ada Progress',
    description: 'Update dari pelapor menyatakan kondisi belum membaik. Tim mempertimbangkan langkah lanjutan.',
  },
  stale: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    Icon: PauseCircle,
    iconColor: '#6b7280',
    title: 'Tunggu Konfirmasi',
    description: 'Sudah lama tanpa update lapangan. Apakah kondisi sudah berubah? Bantu update.',
  },
  resolved: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    Icon: PartyPopper,
    iconColor: '#059669',
    title: 'Selesai',
    description: 'Sudah teratasi! Terima kasih atas kontribusi kamu untuk Maluku Utara.',
  },
  rejected: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    Icon: XCircle,
    iconColor: '#e11d48',
    title: 'Tidak Dapat Diproses',
    description: '',
  },
}

// Fallback config kalau backend kirim lifecycle_state yang gak dikenal (defensive — anti crash).
const FALLBACK_CONFIG = STATUS_CONFIG.pending

// Lifecycle states yang punya civic feedback section visible
// (verified, published, plus derivatives stalemate/stale/resolved)
const CIVIC_FEEDBACK_VISIBLE_STATES: LifecycleState[] = [
  'verified', 'published', 'stalemate', 'stale', 'resolved',
]

// Per-tab empty state icon (Lucide)
const TAB_EMPTY_ICON: Record<TabKey, LucideIcon> = {
  all: Inbox,
  menunggu: Clock,
  diverifikasi: BadgeCheck,
  berita: Newspaper,
  ditolak: XCircle,
}

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

// Fallback resolver: kalau backend gak return lifecycle_state (older API / endpoint
// /reports/me masih 1C-B.3), derive dari status raw. Defensive untuk graceful degradation.
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

  // Client-side pagination (atas hasil filter)
  const [clientPage, setClientPage] = useState(1)

  const [activeTab, setActiveTab] = useState<TabKey>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [toggleErrorId, setToggleErrorId] = useState<string | null>(null)

  // Fetch SEKALI (semua laporan user) — bukan per-halaman.
  // AuthGuard udah jamin user login sebelum komponen ini render; token bisa telat
  // sepersekian detik, jadi dep [token] biar refetch pas token ready.
  useEffect(() => {
    if (user && token) fetchAllReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, token])

  // Reset ke halaman client 1 tiap kali filter berubah (anti out-of-range).
  useEffect(() => {
    setClientPage(1)
  }, [activeTab, searchQuery, categoryFilter])

  async function fetchAllReports() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/balapor/reports/me?page=1&limit=${FETCH_LIMIT}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error('Gagal fetch')
      const json = await res.json()

      const fetchedReports: Report[] = json.data || []
      const meta = json.meta || {}
      const fetchedCounts: StatusCounts = meta.counts || {
        all: 0, pending: 0, reviewing: 0, verified: 0, published: 0, rejected: 0,
      }

      setReports(fetchedReports)
      setCounts(fetchedCounts)
    } catch (err) {
      console.error('[MyReports] fetch error:', err)
      setReports([])
      setCounts({ all: 0, pending: 0, reviewing: 0, verified: 0, published: 0, rejected: 0 })
    } finally {
      setLoading(false)
    }
  }

  // Optimistic update + revert-on-error (sebelumnya: gagal diam-diam tanpa feedback).
  async function toggleNotification(reportId: string, currentOptIn: boolean) {
    const next = !currentOptIn
    setTogglingId(reportId)
    setToggleErrorId(null)

    // Optimistic
    setReports(prev =>
      prev.map(r => (r.id === reportId ? { ...r, notification_opt_in: next } : r))
    )

    try {
      const res = await fetch(`${API_URL}/balapor/reports/me/${reportId}/notification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notification_opt_in: next }),
      })
      if (!res.ok) throw new Error('toggle failed')
    } catch (err) {
      // Revert + tandai error
      setReports(prev =>
        prev.map(r => (r.id === reportId ? { ...r, notification_opt_in: currentOptIn } : r))
      )
      setToggleErrorId(reportId)
      setTimeout(() => setToggleErrorId(prev => (prev === reportId ? null : prev)), 4000)
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

  // Filter full di client (semua laporan udah ke-fetch).
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

  // Client pagination atas filteredReports
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / PAGE_SIZE))
  const safePage = Math.min(clientPage, totalPages)
  const pagedReports = useMemo(
    () => filteredReports.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [filteredReports, safePage]
  )

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
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900">Laporan Saya</h1>
            <p className="text-xs text-gray-500">Pantau status laporan BALAPOR kamu</p>
          </div>
          <Link
            href={URL_LAPOR}
            className="bg-red-500 hover:bg-red-600 active:bg-red-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 shrink-0"
          >
            <Plus className="w-4 h-4" /> Lapor
          </Link>
        </div>

        {/* Search bar */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari judul, isi laporan, atau ID..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border-0 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
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
            const OptIcon = opt.Icon
            return (
              <button
                key={opt.key}
                onClick={() => setCategoryFilter(opt.key)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${isActive
                  ? 'bg-green-100 text-green-800 ring-1 ring-green-300'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
              >
                <OptIcon className="w-3.5 h-3.5" />
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
            {pagedReports.map(report => (
              <ReportCard
                key={report.id}
                report={report}
                togglingId={togglingId}
                toggleErrorId={toggleErrorId}
                onToggleNotification={toggleNotification}
                onFollowUpUpdate={handleFollowUpUpdate}
              />
            ))}

            {/* Pagination (client-side) */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 pt-4">
                <button
                  onClick={() => setClientPage(p => Math.max(1, p - 1))}
                  disabled={safePage === 1}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Sebelumnya
                </button>
                <span className="px-3 py-2 text-sm text-gray-500 font-medium">
                  {safePage} / {totalPages}
                </span>
                <button
                  onClick={() => setClientPage(p => Math.min(totalPages, p + 1))}
                  disabled={safePage === totalPages}
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
        <SearchX className="w-12 h-12 mx-auto text-gray-300 mb-4" />
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
        <Inbox className="w-12 h-12 mx-auto text-gray-300 mb-4" />
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

  const messages: Record<TabKey, string> = {
    all: 'Belum ada laporan',
    menunggu: 'Tidak ada laporan yang sedang menunggu tinjauan',
    diverifikasi: 'Belum ada laporan yang terverifikasi',
    berita: 'Belum ada laporan yang jadi berita BAKABAR',
    ditolak: 'Tidak ada laporan yang ditolak',
  }
  const EmptyIcon = TAB_EMPTY_ICON[tab]

  return (
    <div className="text-center py-12 px-4">
      <EmptyIcon className="w-10 h-10 mx-auto text-gray-300 mb-3" />
      <p className="text-gray-600 text-sm">{messages[tab]}</p>
    </div>
  )
}

// Foto dengan fallback onError (signed URL bisa expired / Object not found — TD-OPS-001).
function ReportPhoto({ src, count }: { src: string; count: number }) {
  const [errored, setErrored] = useState(false)

  if (errored) {
    return (
      <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
        <ImageOff className="w-6 h-6 text-gray-300" />
      </div>
    )
  }

  return (
    <div className="relative shrink-0">
      <img
        src={src}
        alt=""
        loading="lazy"
        onError={() => setErrored(true)}
        className="w-20 h-20 rounded-lg object-cover bg-gray-100"
      />
      {count > 1 && (
        <span className="absolute bottom-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5">
          <Images className="w-3 h-3" />{count}
        </span>
      )}
    </div>
  )
}

function ReportCard({
  report,
  togglingId,
  toggleErrorId,
  onToggleNotification,
  onFollowUpUpdate,
}: {
  report: Report
  togglingId: string | null
  toggleErrorId: string | null
  onToggleNotification: (id: string, currentOptIn: boolean) => void
  onFollowUpUpdate: (id: string, newStatus: FollowUpStatus, updatedAt: string) => void
}) {
  // Use lifecycle_state untuk pilih config (computed di backend, fallback ke status,
  // fallback lagi ke FALLBACK_CONFIG kalau state gak dikenal — anti crash).
  const lifecycle = resolveLifecycleState(report)
  const cfg = STATUS_CONFIG[lifecycle] ?? FALLBACK_CONFIG
  const CategoryIcon = CATEGORY_ICONS[report.category] ?? Tag
  const photoCount = report.photos?.length ?? 0

  // Civic Feedback section visible untuk verified/published + derivatives (stalemate/stale/resolved)
  const canShowCivicFeedback = CIVIC_FEEDBACK_VISIBLE_STATES.includes(lifecycle)
  const toggleFailed = toggleErrorId === report.id

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
            <ReportPhoto src={report.photos![0]} count={photoCount} />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 line-clamp-2 mb-1">{report.title}</p>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="inline-flex items-center gap-1">
                <CategoryIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{formatCategory(report.category)}</span>
              </span>
              {report.location_name && (
                <>
                  <span className="text-gray-300">·</span>
                  <span className="inline-flex items-center gap-1 min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
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
            {toggleFailed && (
              <p className="text-xs text-rose-500 mt-0.5">Gagal mengubah, coba lagi.</p>
            )}
          </div>
          <button
            onClick={() => onToggleNotification(report.id, report.notification_opt_in)}
            disabled={togglingId === report.id}
            role="switch"
            aria-checked={report.notification_opt_in}
            aria-label={`Toggle notifikasi WA untuk laporan ${report.display_id ?? ''}`}
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

  const CfgIcon = cfg.Icon

  return (
    <div className={`${cfg.bg} ${cfg.border} border rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <CfgIcon className="w-4 h-4 shrink-0 mt-0.5" style={{ color: cfg.iconColor }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-gray-900 mb-0.5">{cfg.title}</p>
          {description && (
            <p className="text-xs text-gray-700 leading-relaxed">{description}</p>
          )}
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
      <p className="text-xs text-purple-700 font-medium mb-1.5 inline-flex items-center gap-1">
        <Newspaper className="w-3.5 h-3.5" /> Sudah jadi artikel:
      </p>
      <Link
        href={`/bakabar/${article.slug}`}
        className="block text-sm text-purple-900 font-semibold hover:underline line-clamp-2"
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
        <ShieldCheck className="w-6 h-6 shrink-0 text-red-500" />
        <div>
          <p className="font-bold text-gray-900 mb-1">Transparan &amp; Akuntabel</p>
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

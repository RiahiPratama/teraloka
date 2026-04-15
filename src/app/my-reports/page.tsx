'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

interface Report {
  id: string
  title: string
  category: string
  location?: string
  status: string
  status_label: string
  notification_opt_in: boolean
  created_at: string
  article?: {
    id: string
    title: string
    slug: string
    status: string
    published_at?: string
  } | null
}

const STATUS_CONFIG: Record<string, { color: string; icon: string; desc: string }> = {
  pending: {
    color: 'bg-yellow-100 text-yellow-800',
    icon: '⏳',
    desc: 'Laporan kamu sudah diterima, menunggu review tim'
  },
  screened: {
    color: 'bg-blue-100 text-blue-800',
    icon: '🔍',
    desc: 'Tim sedang meninjau laporan kamu'
  },
  approved: {
    color: 'bg-green-100 text-green-800',
    icon: '✅',
    desc: 'Laporan terverifikasi, akan diproses menjadi artikel'
  },
  rejected: {
    color: 'bg-red-100 text-red-800',
    icon: '❌',
    desc: 'Laporan tidak dapat diproses saat ini'
  },
  converted: {
    color: 'bg-purple-100 text-purple-800',
    icon: '📰',
    desc: 'Laporan sudah menjadi artikel berita'
  }
}

function MyReportsContent() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/my-reports')
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user && token) fetchReports()
  }, [user, token, page])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/content/reports/mine?page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) throw new Error('Gagal fetch')
      const data = await res.json()
      setReports(data.reports || [])
      setTotalPages(data.pagination?.total_pages || 1)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  async function toggleNotification(reportId: string, currentOptIn: boolean) {
    setTogglingId(reportId)
    try {
      const res = await fetch(`${API_URL}/content/reports/mine/${reportId}/notification`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ notification_opt_in: !currentOptIn })
      })
      if (res.ok) {
        setReports(prev =>
          prev.map(r => r.id === reportId ? { ...r, notification_opt_in: !currentOptIn } : r)
        )
      }
    } finally {
      setTogglingId(null)
    }
  }

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Laporan Saya</h1>
            <p className="text-xs text-gray-500">Pantau status laporan BALAPOR kamu</p>
          </div>
          <Link
            href="/reports"
            className="ml-auto bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            + Lapor
          </Link>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-600 font-medium">Belum ada laporan</p>
            <p className="text-sm text-gray-400 mt-1">Laporan yang kamu kirim akan muncul di sini</p>
            <Link
              href="/reports"
              className="mt-4 inline-block bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-medium"
            >
              Buat Laporan Pertama
            </Link>
          </div>
        ) : (
          <>
            {reports.map(report => {
              const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.pending
              return (
                <div key={report.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                  {/* Status bar */}
                  <div className={`px-4 py-2 flex items-center gap-2 text-sm font-medium ${cfg.color}`}>
                    <span>{cfg.icon}</span>
                    <span>{report.status_label}</span>
                    <span className="ml-auto text-xs font-normal opacity-70">{cfg.desc}</span>
                  </div>

                  <div className="p-4">
                    <p className="font-semibold text-gray-900 line-clamp-2">{report.title}</p>

                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {report.category}
                      </span>
                      {report.location && (
                        <span className="text-xs text-gray-400">📍 {report.location}</span>
                      )}
                      <span className="text-xs text-gray-400 ml-auto">
                        {new Date(report.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric', month: 'long', year: 'numeric'
                        })}
                      </span>
                    </div>

                    {/* Artikel terkait */}
                    {report.article && (
                      <div className="mt-3 bg-green-50 rounded-lg p-3">
                        <p className="text-xs text-green-700 font-medium mb-1">📰 Sudah jadi artikel:</p>
                        {report.article.status === 'published' ? (
                          <Link
                            href={`/news/${report.article.slug}`}
                            className="text-sm text-green-800 font-semibold hover:underline line-clamp-1"
                          >
                            {report.article.title} →
                          </Link>
                        ) : (
                          <p className="text-sm text-green-700 opacity-70">
                            {report.article.title} <span className="text-xs">(sedang direview editor)</span>
                          </p>
                        )}
                      </div>
                    )}

                    {/* Notifikasi toggle */}
                    <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-gray-700">Notifikasi WA</p>
                        <p className="text-xs text-gray-400">
                          {report.notification_opt_in
                            ? 'Aktif — kamu akan dapat update via WA'
                            : 'Nonaktif — update hanya di halaman ini'}
                        </p>
                      </div>
                      <button
                        onClick={() => toggleNotification(report.id, report.notification_opt_in)}
                        disabled={togglingId === report.id}
                        className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                          report.notification_opt_in ? 'bg-green-500' : 'bg-gray-300'
                        } ${togglingId === report.id ? 'opacity-50' : ''}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                            report.notification_opt_in ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
                >
                  ← Sebelumnya
                </button>
                <span className="px-4 py-2 text-sm text-gray-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40"
                >
                  Berikutnya →
                </button>
              </div>
            )}

            {/* Privacy notice */}
            <div className="bg-blue-50 rounded-xl p-4 text-xs text-blue-700">
              <p className="font-medium mb-1">🔒 Privasi terlindungi</p>
              <p>Nomor WA kamu tidak pernah dipublikasikan. Notifikasi WA hanya dikirim jika kamu aktifkan toggle di atas. Data laporan kamu hanya diakses tim redaksi untuk kepentingan verifikasi.</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function MyReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>}>
      <MyReportsContent />
    </Suspense>
  )
}

'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

type ReportStatus = 'all' | 'pending' | 'screened' | 'approved' | 'rejected' | 'converted'

interface Report {
  id: string
  title: string
  content: string
  category: string
  location?: string
  photo_urls?: string[]
  status: string
  notification_opt_in?: boolean
  created_at: string
  reporter?: { id: string; name: string; phone: string }
  'content.articles'?: Array<{ id: string; title: string; slug: string; status: string }>
}

const STATUS_TABS: { key: ReportStatus; label: string }[] = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'screened', label: 'Screened' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'converted', label: 'Converted' }
]

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  screened: 'bg-blue-100 text-blue-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  converted: 'bg-purple-100 text-purple-700'
}

function AdminReportsContent() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState<ReportStatus>('all')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [noteInput, setNoteInput] = useState('')
  const [identityData, setIdentityData] = useState<any>(null)
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const isSuperAdmin = user?.role === 'super_admin'

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.push('/login')
      else if (!['super_admin', 'admin_content'].includes(user.role)) router.push('/admin')
    }
  }, [user, isLoading])

  useEffect(() => {
    if (user && token) fetchReports()
  }, [user, token, activeStatus, page])

  async function fetchReports() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/reports?status=${activeStatus}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setReports(data.reports || [])
      setTotalPages(data.pagination?.total_pages || 1)
    } catch {
      setReports([])
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(reportId: string, action: 'screen' | 'approve' | 'reject' | 'convert') {
    if (action === 'reject' && !noteInput.trim()) {
      alert('Alasan penolakan wajib diisi')
      return
    }
    setActionLoading(reportId + action)
    try {
      const endpoint = action === 'convert'
        ? `${API_URL}/admin/reports/${reportId}/convert`
        : `${API_URL}/admin/reports/${reportId}/${action}`

      const res = await fetch(endpoint, {
        method: action === 'convert' ? 'POST' : 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note: noteInput || undefined })
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Gagal melakukan aksi')
        return
      }
      alert(data.message)
      setSelectedReport(null)
      setNoteInput('')
      fetchReports()
    } finally {
      setActionLoading(null)
    }
  }

  async function handleViewIdentity(reportId: string) {
    if (!isSuperAdmin) return
    setActionLoading(reportId + 'identity')
    try {
      const res = await fetch(`${API_URL}/admin/reports/${reportId}/identity`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (!res.ok) {
        alert(data.error)
        return
      }
      setIdentityData(data)
      setShowIdentityModal(true)
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold text-gray-900">BALAPOR — Laporan Warga</h1>
              <p className="text-xs text-gray-400">
                {isSuperAdmin ? 'Super Admin — akses penuh' : 'Admin Konten — tanpa identitas pelapor'}
              </p>
            </div>
          </div>
          {/* Status tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveStatus(tab.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeStatus === tab.key
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-24" />
            ))}
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">📭</div>
            <p>Tidak ada laporan dengan status ini</p>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map(report => {
              const article = report['content.articles']?.[0]
              return (
                <div key={report.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[report.status] || 'bg-gray-100 text-gray-600'}`}>
                          {report.status}
                        </span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full capitalize">
                          {report.category}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 line-clamp-2">{report.title}</p>
                      {report.location && (
                        <p className="text-xs text-gray-400 mt-0.5">📍 {report.location}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(report.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {article && (
                        <div className="mt-2 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-lg inline-block">
                          📰 Artikel: {article.title} ({article.status})
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="shrink-0 text-sm text-green-700 font-medium hover:underline"
                    >
                      Detail →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-6">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40">← Sebelumnya</button>
            <span className="px-4 py-2 text-sm text-gray-500">{page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              className="px-4 py-2 rounded-lg border text-sm disabled:opacity-40">Berikutnya →</button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-start justify-between mb-4">
                <h2 className="font-bold text-gray-900 text-lg flex-1 pr-3">{selectedReport.title}</h2>
                <button onClick={() => { setSelectedReport(null); setNoteInput('') }}
                  className="text-gray-400 hover:text-gray-600 text-xl">×</button>
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[selectedReport.status]}`}>
                    {selectedReport.status}
                  </span>
                  <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs capitalize">
                    {selectedReport.category}
                  </span>
                </div>

                {selectedReport.location && (
                  <p className="text-gray-600">📍 {selectedReport.location}</p>
                )}

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedReport.content}</p>
                </div>

                {selectedReport.photo_urls && selectedReport.photo_urls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {selectedReport.photo_urls.map((url, i) => (
                      <img key={i} src={url} alt={`Foto ${i + 1}`}
                        className="h-24 w-24 rounded-lg object-cover shrink-0 cursor-pointer"
                        onClick={() => window.open(url, '_blank')} />
                    ))}
                  </div>
                )}

                {/* Identitas — hanya super_admin */}
                {isSuperAdmin && (
                  <div className="border border-orange-200 bg-orange-50 rounded-lg p-3">
                    <p className="text-xs text-orange-700 font-medium mb-2">
                      🔐 Identitas Pelapor — Super Admin Only
                    </p>
                    <button
                      onClick={() => handleViewIdentity(selectedReport.id)}
                      disabled={!!actionLoading}
                      className="text-sm bg-orange-600 text-white px-3 py-1.5 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      {actionLoading === selectedReport.id + 'identity' ? 'Loading...' : '🔓 Buka Identitas (audit log)'}
                    </button>
                  </div>
                )}

                {/* Note input untuk aksi */}
                <div>
                  <label className="text-xs font-medium text-gray-600">Catatan (opsional untuk screen/approve, wajib untuk reject):</label>
                  <textarea
                    value={noteInput}
                    onChange={e => setNoteInput(e.target.value)}
                    className="w-full mt-1 border rounded-lg p-2 text-sm resize-none"
                    rows={2}
                    placeholder="Tambahkan catatan..."
                  />
                </div>

                {/* Action buttons berdasarkan status & role */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  {selectedReport.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleAction(selectedReport.id, 'screen')}
                        disabled={!!actionLoading}
                        className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === selectedReport.id + 'screen' ? 'Loading...' : '🔍 Screen'}
                      </button>
                      <button
                        onClick={() => handleAction(selectedReport.id, 'approve')}
                        disabled={!!actionLoading}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === selectedReport.id + 'approve' ? 'Loading...' : '✅ Approve'}
                      </button>
                    </>
                  )}
                  {selectedReport.status === 'screened' && (
                    <button
                      onClick={() => handleAction(selectedReport.id, 'approve')}
                      disabled={!!actionLoading}
                      className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === selectedReport.id + 'approve' ? 'Loading...' : '✅ Approve'}
                    </button>
                  )}
                  {selectedReport.status === 'approved' && !selectedReport['content.articles']?.length && (
                    <button
                      onClick={() => handleAction(selectedReport.id, 'convert')}
                      disabled={!!actionLoading}
                      className="flex-1 bg-purple-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === selectedReport.id + 'convert' ? 'AI sedang bekerja...' : '📰 Jadikan Artikel (AI)'}
                    </button>
                  )}
                  {!['rejected', 'converted'].includes(selectedReport.status) && (
                    <button
                      onClick={() => handleAction(selectedReport.id, 'reject')}
                      disabled={!!actionLoading}
                      className="px-4 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {actionLoading === selectedReport.id + 'reject' ? 'Loading...' : '❌ Tolak'}
                    </button>
                  )}
                  {selectedReport['content.articles']?.[0] && (
                    <Link
                      href={`/admin/content/${selectedReport['content.articles'][0].id}/edit`}
                      className="flex-1 text-center bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium"
                    >
                      ✏️ Edit Artikel
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Identity Modal */}
      {showIdentityModal && identityData && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-orange-800">🔐 Identitas Pelapor</h3>
              <button onClick={() => { setShowIdentityModal(false); setIdentityData(null) }}
                className="text-gray-400">×</button>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 space-y-2 text-sm">
              <div>
                <p className="text-xs text-orange-600 font-medium">Nama</p>
                <p className="text-gray-900 font-semibold">{identityData.reporter?.name || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-orange-600 font-medium">Nomor WA</p>
                <p className="text-gray-900 font-semibold">{identityData.reporter?.phone || '—'}</p>
              </div>
              <div>
                <p className="text-xs text-orange-600 font-medium">Bergabung</p>
                <p className="text-gray-700">
                  {identityData.reporter?.created_at
                    ? new Date(identityData.reporter.created_at).toLocaleDateString('id-ID')
                    : '—'}
                </p>
              </div>
            </div>
            <div className="mt-3 bg-yellow-50 rounded-lg p-3 text-xs text-yellow-700">
              ⚠️ Akses ini tercatat dalam audit log. Gunakan hanya untuk keperluan verifikasi yang sah.
            </div>
            <button onClick={() => { setShowIdentityModal(false); setIdentityData(null) }}
              className="w-full mt-3 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium">
              Tutup
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminReportsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>}>
      <AdminReportsContent />
    </Suspense>
  )
}

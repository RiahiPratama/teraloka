'use client'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

interface Campaign {
  id: string
  title: string
  slug: string
  description: string
  target_amount: number
  current_amount: number
  status: string
  category: string
  deadline?: string
  created_at: string
  organizer?: { id: string; name: string; phone: string }
  komunitas_partner?: boolean
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  expired: 'bg-gray-100 text-gray-500'
}

const STATUS_TABS = [
  { key: 'all', label: 'Semua' },
  { key: 'pending', label: 'Pending' },
  { key: 'active', label: 'Aktif' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'completed', label: 'Selesai' }
]

function AdminFundingContent() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [activeStatus, setActiveStatus] = useState('all')
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [detailData, setDetailData] = useState<any>(null)
  const [noteInput, setNoteInput] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    if (!isLoading) {
      if (!user) router.push('/login')
      else if (!['super_admin', 'admin_funding'].includes(user.role)) router.push('/admin')
    }
  }, [user, isLoading])

  useEffect(() => {
    if (user && token) fetchCampaigns()
  }, [user, token, activeStatus, page])

  async function fetchCampaigns() {
    setLoading(true)
    try {
      const res = await fetch(`${API_URL}/admin/funding?status=${activeStatus}&page=${page}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setCampaigns(data.campaigns || [])
      setTotalPages(data.pagination?.total_pages || 1)
    } catch {
      setCampaigns([])
    } finally {
      setLoading(false)
    }
  }

  async function fetchDetail(id: string) {
    try {
      const res = await fetch(`${API_URL}/admin/funding/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setDetailData(data)
    } catch {}
  }

  async function handleAction(id: string, action: 'approve' | 'reject') {
    if (action === 'reject' && !noteInput.trim()) {
      alert('Alasan penolakan wajib diisi')
      return
    }
    setActionLoading(id + action)
    try {
      const res = await fetch(`${API_URL}/admin/funding/${id}/${action}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ note: noteInput || undefined })
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error); return }
      alert(data.message)
      setSelectedCampaign(null)
      setDetailData(null)
      setNoteInput('')
      fetchCampaigns()
    } finally {
      setActionLoading(null)
    }
  }

  function formatRp(amount: number) {
    return `Rp ${amount.toLocaleString('id-ID')}`
  }

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <h1 className="text-lg font-bold text-gray-900 mb-2">BASUMBANG — Kelola Kampanye</h1>
          <div className="flex gap-1 overflow-x-auto pb-1">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => { setActiveStatus(tab.key); setPage(1) }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeStatus === tab.key ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
            {[1, 2, 3].map(i => <div key={i} className="bg-white rounded-xl p-4 animate-pulse h-28" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">💚</div>
            <p>Tidak ada kampanye dengan status ini</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {campaigns.map(campaign => {
              const progress = campaign.target_amount > 0
                ? Math.min(100, Math.round((campaign.current_amount / campaign.target_amount) * 100))
                : 0
              return (
                <div key={campaign.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[campaign.status] || 'bg-gray-100 text-gray-500'}`}>
                          {campaign.status}
                        </span>
                        {campaign.komunitas_partner && (
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Partner</span>
                        )}
                      </div>
                      <p className="font-semibold text-gray-900 line-clamp-2">{campaign.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        oleh {campaign.organizer?.name || '—'} •{' '}
                        {new Date(campaign.created_at).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>{formatRp(campaign.current_amount)}</span>
                      <span>Target: {formatRp(campaign.target_amount)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 text-right">{progress}% tercapai</p>
                  </div>

                  <button
                    onClick={async () => {
                      setSelectedCampaign(campaign)
                      await fetchDetail(campaign.id)
                    }}
                    className="w-full text-sm text-center bg-gray-50 hover:bg-gray-100 text-gray-700 py-1.5 rounded-lg transition-colors"
                  >
                    Lihat Detail & Aksi →
                  </button>
                </div>
              )
            })}
          </div>
        )}

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
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-bold text-gray-900 text-lg flex-1 pr-3">{selectedCampaign.title}</h2>
                <button onClick={() => { setSelectedCampaign(null); setDetailData(null); setNoteInput('') }}
                  className="text-gray-400 text-xl">×</button>
              </div>

              <div className="space-y-4 text-sm">
                {/* Info organizer */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Penggalang Dana</p>
                  <p className="font-semibold">{selectedCampaign.organizer?.name}</p>
                  <p className="text-gray-500">{selectedCampaign.organizer?.phone}</p>
                </div>

                {/* Deskripsi */}
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Deskripsi</p>
                  <p className="text-gray-700 leading-relaxed">{selectedCampaign.description}</p>
                </div>

                {/* Donatur list */}
                {detailData?.donations?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">
                      Donatur ({detailData.stats?.total_donations || 0}) —
                      Verified: {detailData.stats?.verified_donations || 0}
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {detailData.donations.map((d: any) => (
                        <div key={d.id} className="flex justify-between items-center py-1 border-b border-gray-50">
                          <span className="text-gray-700">{d.donor_name}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Rp {d.amount.toLocaleString('id-ID')}</span>
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              d.payment_status === 'verified' ? 'bg-green-100 text-green-700' :
                              d.payment_status === 'rejected' ? 'bg-red-100 text-red-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>{d.payment_status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Aksi */}
                {selectedCampaign.status === 'pending' && (
                  <>
                    <div>
                      <label className="text-xs font-medium text-gray-600">
                        Catatan (opsional untuk approve, wajib untuk reject):
                      </label>
                      <textarea
                        value={noteInput}
                        onChange={e => setNoteInput(e.target.value)}
                        className="w-full mt-1 border rounded-lg p-2 text-sm resize-none"
                        rows={2}
                        placeholder="Tambahkan catatan..."
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(selectedCampaign.id, 'approve')}
                        disabled={!!actionLoading}
                        className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === selectedCampaign.id + 'approve' ? 'Loading...' : '✅ Approve Kampanye'}
                      </button>
                      <button
                        onClick={() => handleAction(selectedCampaign.id, 'reject')}
                        disabled={!!actionLoading}
                        className="px-4 bg-red-100 text-red-700 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                      >
                        {actionLoading === selectedCampaign.id + 'reject' ? 'Loading...' : '❌ Tolak'}
                      </button>
                    </div>
                  </>
                )}

                {selectedCampaign.status === 'active' && (
                  <div className="bg-green-50 rounded-lg p-3 text-sm text-green-700 text-center">
                    ✅ Kampanye ini sudah aktif dan bisa dilihat publik
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminFundingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>}>
      <AdminFundingContent />
    </Suspense>
  )
}

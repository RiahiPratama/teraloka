'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
  bank_name?: string
  bank_account?: string
  bank_holder?: string
  photo_url?: string
  komunitas_partner?: boolean
  created_at: string
  organizer?: { name: string }
}

function FundraisingDetailContent() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const [campaign, setCampaign] = useState<Campaign | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form donasi
  const [donorName, setDonorName] = useState('')
  const [amount, setAmount] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [donorNote, setDonorNote] = useState('')
  const [donating, setDonating] = useState(false)
  const [donationSuccess, setDonationSuccess] = useState<any>(null)

  const NOMINAL_PRESETS = [50000, 100000, 250000, 500000]
  const FEE_OPTIONS = [0, 2000, 5000, 10000]
  const [selectedFee, setSelectedFee] = useState(2000)

  useEffect(() => {
    if (slug) fetchCampaign()
  }, [slug])

  async function fetchCampaign() {
    try {
      const res = await fetch(`${API_URL}/funding/campaigns/${slug}`)
      if (!res.ok) { setNotFound(true); return }
      const data = await res.json()
      setCampaign(data.campaign)
    } catch {
      setNotFound(true)
    } finally {
      setLoading(false)
    }
  }

  async function handleDonate(e: React.FormEvent) {
    e.preventDefault()
    const numAmount = Number(amount)
    if (!donorName && !isAnonymous) { alert('Nama donatur wajib diisi atau pilih anonim'); return }
    if (!numAmount || numAmount < 10000) { alert('Minimal donasi Rp 10.000'); return }

    setDonating(true)
    try {
      const res = await fetch(`${API_URL}/funding/donate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaign_id: campaign!.id,
          donor_name: isAnonymous ? 'Anonim' : donorName,
          is_anonymous: isAnonymous,
          amount: numAmount,
          platform_fee: selectedFee,
          note: donorNote || undefined
        })
      })
      const data = await res.json()
      if (!res.ok) { alert(data.error || 'Gagal memproses donasi'); return }
      setDonationSuccess({ ...data, amount: numAmount, fee: selectedFee })
    } catch {
      alert('Gagal terhubung ke server')
    } finally {
      setDonating(false)
    }
  }

  function formatRp(n: number) {
    return `Rp ${n.toLocaleString('id-ID')}`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>
  )

  if (notFound || !campaign) return (
    <div className="min-h-screen flex items-center justify-center text-center p-4">
      <div>
        <div className="text-5xl mb-4">💚</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Kampanye tidak ditemukan</h2>
        <Link href="/fundraising" className="text-green-600 hover:underline">← Lihat semua kampanye</Link>
      </div>
    </div>
  )

  const progress = campaign.target_amount > 0
    ? Math.min(100, Math.round((campaign.current_amount / campaign.target_amount) * 100))
    : 0

  // Donation success screen
  if (donationSuccess) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center shadow-sm">
        <div className="text-5xl mb-4">🙏</div>
        <h2 className="text-xl font-bold text-gray-900 mb-1">Terima kasih!</h2>
        <p className="text-gray-500 text-sm mb-4">Donasi kamu sudah kami terima dan menunggu konfirmasi transfer.</p>

        <div className="bg-green-50 rounded-xl p-4 text-left space-y-2 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Donasi</span>
            <span className="font-semibold">{formatRp(donationSuccess.amount)}</span>
          </div>
          {donationSuccess.fee > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Kontribusi platform</span>
              <span className="font-semibold">{formatRp(donationSuccess.fee)}</span>
            </div>
          )}
          <div className="pt-2 border-t flex justify-between text-sm font-bold">
            <span>Total transfer</span>
            <span className="text-green-700">{formatRp(donationSuccess.amount + donationSuccess.fee)}</span>
          </div>
        </div>

        {campaign.bank_name && (
          <div className="bg-blue-50 rounded-xl p-4 text-left text-sm mb-4">
            <p className="font-medium text-blue-800 mb-2">Transfer ke rekening ini:</p>
            <p className="text-gray-700">{campaign.bank_name}</p>
            <p className="text-xl font-bold text-gray-900 my-1">{campaign.bank_account}</p>
            <p className="text-gray-600">a.n. {campaign.bank_holder}</p>
          </div>
        )}

        <p className="text-xs text-gray-400 mb-4">Setelah transfer, simpan bukti pembayaran. Tim kami akan memverifikasi dalam 1x24 jam.</p>

        <Link href="/fundraising" className="block w-full bg-green-600 text-white py-2.5 rounded-xl font-medium text-sm">
          Lihat Kampanye Lain
        </Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/fundraising" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <p className="text-sm font-medium text-gray-700 line-clamp-1">{campaign.title}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        {/* Foto */}
        {campaign.photo_url && (
          <img src={campaign.photo_url} alt={campaign.title}
            className="w-full h-52 object-cover rounded-2xl" />
        )}

        {/* Info utama */}
        <div className="bg-white rounded-2xl p-5">
          <div className="flex gap-2 mb-2">
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full capitalize">
              {campaign.category}
            </span>
            {campaign.komunitas_partner && (
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Partner Komunitas</span>
            )}
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">{campaign.title}</h1>
          <p className="text-sm text-gray-500 mb-4">oleh {campaign.organizer?.name || '—'}</p>

          {/* Progress */}
          <div className="mb-1">
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="font-bold text-green-700">{formatRp(campaign.current_amount)}</span>
            <span className="text-gray-400">dari {formatRp(campaign.target_amount)}</span>
          </div>
          <p className="text-xs text-gray-400">{progress}% tercapai{campaign.deadline && ` • Berakhir ${new Date(campaign.deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`}</p>
        </div>

        {/* Deskripsi */}
        <div className="bg-white rounded-2xl p-5">
          <h2 className="font-bold text-gray-800 mb-3">Tentang Kampanye</h2>
          <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{campaign.description}</p>
        </div>

        {/* Form donasi */}
        {campaign.status === 'active' && (
          <div className="bg-white rounded-2xl p-5">
            <h2 className="font-bold text-gray-800 mb-4">💚 Donasi Sekarang</h2>
            <form onSubmit={handleDonate} className="space-y-4">
              {/* Nominal presets */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Pilih Nominal</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {NOMINAL_PRESETS.map(n => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setAmount(String(n))}
                      className={`py-2 rounded-xl text-sm font-medium border transition-colors ${
                        amount === String(n)
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:border-green-400'
                      }`}
                    >
                      {formatRp(n)}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  placeholder="Atau masukkan nominal lain (min. Rp 10.000)"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400"
                />
              </div>

              {/* Nama donatur */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Nama Donatur</label>
                <input
                  type="text"
                  value={donorName}
                  onChange={e => setDonorName(e.target.value)}
                  placeholder="Nama kamu"
                  disabled={isAnonymous}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-green-400 disabled:bg-gray-50 disabled:text-gray-400"
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={e => setIsAnonymous(e.target.checked)}
                    className="rounded"
                  />
                  Donasi sebagai Anonim
                </label>
              </div>

              {/* Pesan */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Pesan (opsional)</label>
                <textarea
                  value={donorNote}
                  onChange={e => setDonorNote(e.target.value)}
                  placeholder="Pesan dukungan..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:border-green-400"
                  rows={2}
                />
              </div>

              {/* Kontribusi platform */}
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">
                  Kontribusi untuk TeraLoka (opsional)
                </label>
                <div className="flex gap-2">
                  {FEE_OPTIONS.map(fee => (
                    <button
                      key={fee}
                      type="button"
                      onClick={() => setSelectedFee(fee)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedFee === fee
                          ? 'bg-green-600 text-white border-green-600'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}
                    >
                      {fee === 0 ? 'Tidak' : formatRp(fee)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Summary */}
              {amount && Number(amount) >= 10000 && (
                <div className="bg-green-50 rounded-xl p-3 text-sm">
                  <div className="flex justify-between mb-1">
                    <span className="text-gray-600">Donasi</span>
                    <span className="font-medium">{formatRp(Number(amount))}</span>
                  </div>
                  {selectedFee > 0 && (
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-600">Kontribusi platform</span>
                      <span className="font-medium">{formatRp(selectedFee)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold pt-1 border-t border-green-200">
                    <span>Total transfer</span>
                    <span className="text-green-700">{formatRp(Number(amount) + selectedFee)}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={donating}
                className="w-full bg-green-600 text-white py-3 rounded-xl font-semibold text-sm hover:bg-green-700 transition-colors disabled:opacity-60"
              >
                {donating ? 'Memproses...' : '💚 Donasi Sekarang'}
              </button>

              <p className="text-xs text-gray-400 text-center">
                Donasi via transfer bank langsung ke rekening penggalang dana.
                Dana 100% tersalurkan.
              </p>
            </form>
          </div>
        )}

        {campaign.status !== 'active' && (
          <div className="bg-gray-100 rounded-2xl p-4 text-center text-gray-500 text-sm">
            {campaign.status === 'completed' ? '✅ Kampanye ini sudah selesai' :
             campaign.status === 'expired' ? '⏰ Kampanye ini sudah berakhir' :
             '🔍 Kampanye ini belum aktif'}
          </div>
        )}
      </div>
    </div>
  )
}

export default function FundraisingDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600" />
    </div>}>
      <FundraisingDetailContent />
    </Suspense>
  )
}

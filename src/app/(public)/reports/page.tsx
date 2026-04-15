'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, Suspense } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL!

const CATEGORIES = [
  { key: 'infrastruktur', label: '🏗️ Infrastruktur', requirePhoto: true, desc: 'Jalan rusak, jembatan, drainase, fasilitas umum' },
  { key: 'lingkungan', label: '🌿 Lingkungan', requirePhoto: true, desc: 'Sampah liar, pencemaran, penebangan liar' },
  { key: 'keamanan', label: '🚨 Keamanan', requirePhoto: false, desc: 'Kejahatan, gangguan ketertiban, kondisi berbahaya' },
  { key: 'sosial', label: '👥 Sosial', requirePhoto: false, desc: 'Masalah sosial, konflik komunitas, layanan publik' },
  { key: 'ekonomi', label: '💰 Ekonomi', requirePhoto: false, desc: 'Harga tidak wajar, penipuan, UMKM bermasalah' },
  { key: 'lainnya', label: '📋 Lainnya', requirePhoto: false, desc: 'Laporan yang tidak masuk kategori di atas' }
]

function BalaporFormContent() {
  const { user, token, isLoading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(1) // 1: form, 2: preview, 3: sukses
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [location, setLocation] = useState('')
  const [content, setContent] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([])
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([])
  const [uploadingPhotos, setUploadingPhotos] = useState(false)
  const [notificationOptIn, setNotificationOptIn] = useState(false)
  const [submittedId, setSubmittedId] = useState('')

  const selectedCategory = CATEGORIES.find(c => c.key === category)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login?redirect=/reports')
    }
  }, [user, isLoading, router])

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || [])
    if (files.length + photoFiles.length > 5) {
      alert('Maksimal 5 foto')
      return
    }
    const newFiles = [...photoFiles, ...files]
    setPhotoFiles(newFiles)
    const previews = newFiles.map(f => URL.createObjectURL(f))
    setPhotoPreviews(previews)
  }

  function removePhoto(index: number) {
    const newFiles = photoFiles.filter((_, i) => i !== index)
    const newPreviews = photoPreviews.filter((_, i) => i !== index)
    setPhotoFiles(newFiles)
    setPhotoPreviews(newPreviews)
  }

  async function uploadPhotos(): Promise<string[]> {
    if (photoFiles.length === 0) return []
    setUploadingPhotos(true)
    const urls: string[] = []
    try {
      for (const file of photoFiles) {
        const formData = new FormData()
        formData.append('file', file)
        const res = await fetch(`${API_URL}/upload/reports`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData
        })
        if (res.ok) {
          const data = await res.json()
          urls.push(data.url)
        }
      }
    } finally {
      setUploadingPhotos(false)
    }
    return urls
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      // Upload foto dulu
      const photoUrls = await uploadPhotos()

      const res = await fetch(`${API_URL}/content/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          content,
          category,
          location: location || undefined,
          photo_urls: photoUrls,
          notification_opt_in: notificationOptIn
        })
      })

      const data = await res.json()
      if (!res.ok) {
        alert(data.error || 'Gagal mengirim laporan')
        return
      }

      setSubmittedId(data.report?.id || '')
      setStep(3)
    } catch {
      alert('Gagal terhubung ke server')
    } finally {
      setSubmitting(false)
    }
  }

  function isFormValid() {
    if (!title.trim() || !category || !content.trim()) return false
    if (selectedCategory?.requirePhoto && photoFiles.length === 0) return false
    return true
  }

  if (isLoading || !user) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>
  )

  // Step 3 — Sukses
  if (step === 3) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Laporan Terkirim!</h2>
        <p className="text-sm text-gray-500 mb-4 leading-relaxed">
          Terima kasih sudah melapor. Tim kami akan meninjau laporan kamu dan memverifikasi sebelum dipublikasikan.
        </p>

        <div className="bg-blue-50 rounded-xl p-4 text-left text-sm mb-5">
          <p className="font-medium text-blue-800 mb-2">🔒 Privasimu terlindungi</p>
          <p className="text-blue-700 text-xs leading-relaxed">
            Nomor WA kamu <strong>tidak akan dipublikasikan</strong>. Hanya admin tertentu yang bisa mengakses identitasmu, dan setiap akses dicatat dalam audit log.
          </p>
        </div>

        {notificationOptIn && (
          <div className="bg-green-50 rounded-xl p-3 text-sm text-green-700 mb-4">
            📲 Kamu akan dapat notifikasi WA saat laporan diproses
          </div>
        )}

        <div className="space-y-2">
          <Link href="/my-reports"
            className="block w-full bg-orange-500 text-white py-2.5 rounded-xl font-medium text-sm">
            Pantau Status Laporan →
          </Link>
          <Link href="/"
            className="block w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl font-medium text-sm">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">BALAPOR</h1>
            <p className="text-xs text-gray-400">Laporan Warga Maluku Utara</p>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Privacy notice — di atas form */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <div className="flex gap-3">
            <span className="text-xl">🔒</span>
            <div>
              <p className="font-semibold text-blue-800 text-sm mb-1">Identitasmu dilindungi</p>
              <p className="text-xs text-blue-700 leading-relaxed">
                Nomor WA kamu <strong>tidak akan dipublikasikan</strong>. Laporan yang disetujui akan ditulis ulang oleh tim editor sebelum jadi artikel berita. Identitas hanya bisa diakses oleh Super Admin dengan audit log.
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-5">

          {/* Kategori */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-2">
              Kategori Laporan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setCategory(cat.key)}
                  className={`text-left p-3 rounded-xl border transition-colors ${
                    category === cat.key
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800">{cat.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-tight">{cat.desc}</p>
                  {cat.requirePhoto && (
                    <span className="text-xs text-orange-500 mt-1 block">📷 Foto wajib</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Judul */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">
              Judul Laporan <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Contoh: Jalan rusak parah di depan SDN 5 Ternate"
              maxLength={150}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/150</p>
          </div>

          {/* Lokasi */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">
              Lokasi Kejadian
              <span className="text-xs text-gray-400 font-normal ml-2">
                (semakin detail, semakin mudah ditindaklanjuti)
              </span>
            </label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Contoh: Jl. Sultan Baab RT 03, Kel. Soa-Sio, Ternate Utara"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* Isi laporan */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">
              Isi Laporan <span className="text-red-500">*</span>
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Ceritakan apa yang terjadi, sejak kapan, dampaknya seperti apa, dan harapanmu..."
              rows={5}
              maxLength={2000}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-orange-400"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/2000</p>
          </div>

          {/* Upload foto */}
          <div>
            <label className="text-sm font-semibold text-gray-800 block mb-1.5">
              Foto Bukti
              {selectedCategory?.requirePhoto
                ? <span className="text-red-500 ml-1">* (wajib untuk kategori ini)</span>
                : <span className="text-gray-400 font-normal ml-2">(opsional, maks 5 foto)</span>
              }
            </label>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label htmlFor="photo-upload" className="cursor-pointer">
                <div className="text-2xl mb-1">📷</div>
                <p className="text-sm text-gray-500">Tap untuk upload foto</p>
                <p className="text-xs text-gray-400">JPG, PNG, maks 5MB per foto</p>
              </label>
            </div>

            {photoPreviews.length > 0 && (
              <div className="flex gap-2 mt-3 overflow-x-auto">
                {photoPreviews.map((src, i) => (
                  <div key={i} className="relative shrink-0">
                    <img src={src} alt={`Foto ${i + 1}`}
                      className="w-20 h-20 rounded-xl object-cover" />
                    <button
                      onClick={() => removePhoto(i)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >×</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifikasi opt-in */}
          <div className="border border-gray-100 rounded-xl p-4 bg-gray-50">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => setNotificationOptIn(!notificationOptIn)}
                className={`mt-0.5 relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 ${
                  notificationOptIn ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${
                  notificationOptIn ? 'translate-x-5' : 'translate-x-0'
                }`} />
              </button>
              <div>
                <p className="text-sm font-medium text-gray-800">Notifikasi WA</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  {notificationOptIn
                    ? 'Aktif — kamu akan dapat update via WA saat laporan diproses. Nomor WA kamu akan tercatat di sistem notifikasi kami, namun tidak dipublikasikan.'
                    : 'Nonaktif — status laporan bisa dipantau di halaman "Laporan Saya" tanpa notifikasi WA.'}
                </p>
              </div>
            </div>
          </div>

        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!isFormValid() || submitting || uploadingPhotos}
          className="w-full bg-orange-500 text-white py-3.5 rounded-2xl font-bold text-sm hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting || uploadingPhotos
            ? <span className="flex items-center justify-center gap-2">
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                {uploadingPhotos ? 'Mengupload foto...' : 'Mengirim laporan...'}
              </span>
            : '📢 Kirim Laporan'}
        </button>

        <p className="text-xs text-gray-400 text-center pb-4">
          Dengan mengirim laporan, kamu menyetujui bahwa laporan akan ditinjau tim sebelum dipublikasikan.
        </p>
      </div>
    </div>
  )
}

export default function BalaporPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
    </div>}>
      <BalaporFormContent />
    </Suspense>
  )
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'berita', label: 'Berita' },
  { key: 'viral', label: 'Viral' },
  { key: 'politik', label: 'Politik' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'sosial', label: 'Sosial' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'olahraga', label: 'Olahraga' },
  { key: 'budaya', label: 'Budaya' },
  { key: 'teknologi', label: 'Teknologi' },
];

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'tiktok', label: 'TikTok' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'twitter', label: 'Twitter / X' },
  { key: 'youtube', label: 'YouTube' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'lainnya', label: 'Lainnya' },
];

export default function NewArticlePage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourcePlatform, setSourcePlatform] = useState('');
  const [publishNow, setPublishNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!user || !token) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🔒</p>
          <h2 className="text-lg font-semibold">Akses Ditolak</h2>
          <p className="mt-1 text-sm text-gray-500">Halaman ini hanya untuk admin TeraLoka.</p>
        </div>
      </div>
    );
  }

  if (!['super_admin', 'admin_content'].includes(user.role)) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl mb-3">🚫</p>
          <h2 className="text-lg font-semibold">Bukan Admin</h2>
          <p className="mt-1 text-sm text-gray-500">Kamu tidak punya akses untuk menulis artikel.</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async () => {
    if (!title.trim() || !body.trim() || !category) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch(`${API}/content/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          body,
          category,
          cover_image_url: coverImageUrl || null,
          source_url: sourceUrl || null,
          source_platform: sourcePlatform || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? 'Gagal membuat artikel.');
        return;
      }

      const id = data.data?.id;

      if (publishNow && id) {
        await fetch(`${API}/content/articles/${id}/publish`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      }

      setSubmitted(true);
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            Artikel {publishNow ? 'Dipublish!' : 'Disimpan sebagai Draft!'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {publishNow ? 'Artikel sudah live di BAKABAR.' : 'Artikel tersimpan sebagai draft.'}
          </p>
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => router.push('/news')}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-600"
            >
              Lihat BAKABAR
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setTitle('');
                setBody('');
                setCategory('');
                setCoverImageUrl('');
                setSourceUrl('');
                setSourcePlatform('');
                setPublishNow(false);
              }}
              className="flex-1 rounded-xl bg-[#1B6B4A] py-2.5 text-sm font-semibold text-white"
            >
              Tulis Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));
  const isViral = category === 'viral';

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#1B6B4A]">Tulis Artikel</h1>
          <p className="text-sm text-gray-500">BAKABAR — Berita Maluku Utara</p>
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>{wordCount} kata</p>
          <p>~{readTime} menit baca</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Kategori */}
        <div>
          <label className="text-sm font-medium text-gray-700">Kategori</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === cat.key
                    ? cat.key === 'viral'
                      ? 'bg-orange-500 text-white'
                      : 'bg-[#1B6B4A] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.key === 'viral' ? '🔥 ' : ''}{cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sumber viral — muncul kalau kategori Viral dipilih */}
        {isViral && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 space-y-3">
            <p className="text-xs font-medium text-orange-800">
              🔥 Berita Viral — Tambahkan sumber asli dari media sosial
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700">Platform</label>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {PLATFORMS.map(p => (
                  <button
                    key={p.key}
                    onClick={() => setSourcePlatform(p.key)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      sourcePlatform === p.key
                        ? 'bg-orange-500 text-white'
                        : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Link Postingan Asli</label>
              <input
                type="url"
                value={sourceUrl}
                onChange={e => setSourceUrl(e.target.value)}
                placeholder="https://www.instagram.com/p/..."
                className="mt-1.5 w-full rounded-xl border border-orange-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400"
              />
              <p className="mt-1 text-xs text-orange-600">
                Link ini akan ditampilkan sebagai sumber di bawah artikel
              </p>
            </div>
          </div>
        )}

        {/* Judul */}
        <div>
          <label className="text-sm font-medium text-gray-700">Judul Artikel</label>
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Tulis judul yang informatif dan menarik..."
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
            maxLength={150}
          />
          <p className="mt-1 text-right text-xs text-gray-400">{title.length} / 150</p>
        </div>

        {/* Cover image */}
        <div>
          <label className="text-sm font-medium text-gray-700">
            URL Foto Cover <span className="text-gray-400">(opsional)</span>
          </label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={e => setCoverImageUrl(e.target.value)}
            placeholder="https://..."
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
          />
          {coverImageUrl && (
            <img
              src={coverImageUrl}
              alt="Preview"
              className="mt-2 h-32 w-full rounded-lg object-cover"
              onError={e => (e.currentTarget.style.display = 'none')}
            />
          )}
        </div>

        {/* Body */}
        <div>
          <label className="text-sm font-medium text-gray-700">Isi Artikel</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder={isViral
              ? 'Tulis ringkasan kenapa konten ini viral, konteks, dan reaksi warga Malut...'
              : 'Tulis isi artikel di sini. Gunakan paragraf yang jelas dan informatif...'}
            rows={14}
            className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
          />
        </div>

        {/* Publish option */}
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={publishNow}
              onChange={e => setPublishNow(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1B6B4A]"
            />
            <div>
              <p className="text-sm font-medium text-gray-800">Publish sekarang</p>
              <p className="text-xs text-gray-500">
                Artikel langsung tampil di BAKABAR. Kalau tidak dicentang, tersimpan sebagai draft.
              </p>
            </div>
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => router.back()}
            className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-600"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={!title.trim() || !body.trim() || !category || loading}
            className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            {loading ? 'Menyimpan...' : publishNow ? 'Publish Artikel' : 'Simpan Draft'}
          </button>
        </div>
      </div>
    </div>
  );
}

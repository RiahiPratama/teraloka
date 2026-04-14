'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'berita', label: 'Berita' },
  { key: 'politik', label: 'Politik' },
  { key: 'ekonomi', label: 'Ekonomi' },
  { key: 'sosial', label: 'Sosial' },
  { key: 'transportasi', label: 'Transportasi' },
  { key: 'olahraga', label: 'Olahraga' },
  { key: 'budaya', label: 'Budaya' },
  { key: 'teknologi', label: 'Teknologi' },
];

export default function NewArticlePage() {
  const router = useRouter();
  const { user, token } = useAuth();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [category, setCategory] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [publishNow, setPublishNow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [articleId, setArticleId] = useState('');

  // Guard — hanya admin
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
      // 1. Buat artikel (draft dulu)
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
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error?.message ?? 'Gagal membuat artikel.');
        return;
      }

      const id = data.data?.id;
      setArticleId(id);

      // 2. Publish langsung kalau diminta
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
            {publishNow
              ? 'Artikel sudah live di BAKABAR.'
              : 'Artikel tersimpan sebagai draft. Publish kapan saja dari admin panel.'}
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
                setPublishNow(false);
                setArticleId('');
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

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
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
                    ? 'bg-[#1B6B4A] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

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

        {/* Cover image URL */}
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
          <p className="mt-1 text-xs text-gray-400">
            Upload foto ke sini sementara, nanti kita integrasikan Supabase Storage
          </p>
        </div>

        {/* Body */}
        <div>
          <label className="text-sm font-medium text-gray-700">Isi Artikel</label>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Tulis isi artikel di sini. Gunakan paragraf yang jelas dan informatif..."
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
                Artikel langsung tampil di BAKABAR. Kalau tidak dicentang, artikel tersimpan sebagai draft.
              </p>
            </div>
          </label>
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
        )}

        {/* Submit */}
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

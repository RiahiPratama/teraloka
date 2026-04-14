'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'infrastruktur', label: '🏗️ Infrastruktur' },
  { key: 'layanan_publik', label: '🏛️ Layanan Publik' },
  { key: 'lingkungan', label: '🌿 Lingkungan' },
  { key: 'keamanan', label: '🔒 Keamanan' },
  { key: 'kesehatan', label: '🏥 Kesehatan' },
  { key: 'pendidikan', label: '📚 Pendidikan' },
  { key: 'transportasi', label: '🚤 Transportasi' },
  { key: 'lainnya', label: '📋 Lainnya' },
];

const TOS_ITEMS = [
  'Laporan berisi fakta, bukan opini atau fitnah.',
  'Saya bertanggung jawab atas isi laporan (UU ITE).',
  'TeraLoka berhak menolak/menghapus laporan yang melanggar.',
  'Laporan bisa dijadikan artikel BAKABAR (dengan izin).',
  'Data pribadi dilindungi sesuai tingkat anonimitas.',
  'Takedown request diproses maksimal 1×24 jam.',
];

export default function ReportsPage() {
  const { user, token } = useAuth();

  const [step, setStep] = useState<'form' | 'tos' | 'success'>('form');
  const [anonymity, setAnonymity] = useState<'anonim' | 'pseudonym' | 'nama_terang'>('anonim');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!tosAccepted) return;
    setLoading(true);
    setError('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Kalau user login, kirim token — backend bisa deteksi ID-nya
      // Kalau tidak login, tetap bisa submit (anonim)
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${API}/content/reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          anonymity_level: anonymity,
          title,
          body,
          category,
        }),
      });

      if (res.ok) {
        setStep('success');
      } else {
        const data = await res.json();
        setError(data.error?.message ?? 'Gagal mengirim laporan.');
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-green-50">
            <svg className="h-8 w-8 text-[#1B6B4A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Laporan Terkirim!</h2>
          <p className="mt-1 text-sm text-gray-500">
            Tim moderasi akan meninjau dalam 1×24 jam.
          </p>
          {user && (
            <p className="mt-1 text-xs text-gray-400">
              Terdeteksi sebagai akun: +{user.phone}
            </p>
          )}
          <button
            onClick={() => {
              setStep('form');
              setTitle('');
              setBody('');
              setCategory('');
              setTosAccepted(false);
            }}
            className="mt-4 rounded-lg bg-[#1B6B4A] px-5 py-2 text-sm font-medium text-white"
          >
            Buat Laporan Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#1B6B4A]">BALAPOR</h1>
        <p className="text-sm text-gray-500">Laporkan masalah di sekitarmu</p>
        {user ? (
          <p className="mt-1 text-xs text-[#1B6B4A]">
            Login sebagai +{user.phone} — identitas kamu terdeteksi sistem
          </p>
        ) : (
          <p className="mt-1 text-xs text-gray-400">
            Tidak login — laporan masuk sebagai anonim
          </p>
        )}
      </div>

      {step === 'form' && (
        <div className="space-y-4">
          {/* Anonymity level */}
          <div>
            <label className="text-sm font-medium text-gray-700">Tingkat Identitas</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(['anonim', 'pseudonym', 'nama_terang'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setAnonymity(level)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    anonymity === level
                      ? 'bg-[#1B6B4A] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level === 'anonim' ? '🕵️ Anonim' : level === 'pseudonym' ? '✏️ Nama Samaran' : '👤 Nama Terang'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {anonymity === 'anonim'
                ? 'Identitas tersembunyi dari publik. Sistem tetap mencatat ID internal.'
                : anonymity === 'pseudonym'
                ? 'Nama samaran ditampilkan, bukan nama asli.'
                : 'Nama kamu akan ditampilkan di laporan.'}
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium text-gray-700">Kategori</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-colors ${
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

          {/* Title */}
          <div>
            <label className="text-sm font-medium text-gray-700">Judul Laporan</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Jalan rusak di depan RSUD Ternate"
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#1B6B4A]"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium text-gray-700">Isi Laporan</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Jelaskan masalah dengan detail: lokasi, waktu, dampak yang dirasakan..."
              rows={5}
              className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-[#1B6B4A]"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{body.length} karakter</p>
          </div>

          <button
            onClick={() => setStep('tos')}
            disabled={!title.trim() || !body.trim() || !category}
            className="w-full rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
          >
            Lanjut ke Syarat & Ketentuan →
          </button>
        </div>
      )}

      {step === 'tos' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">Syarat & Ketentuan BALAPOR</h3>
            <ol className="mt-3 space-y-2">
              {TOS_ITEMS.map((item, i) => (
                <li key={i} className="flex gap-2 text-sm text-gray-600">
                  <span className="shrink-0 font-medium text-[#1B6B4A]">{i + 1}.</span>
                  {item}
                </li>
              ))}
            </ol>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#1B6B4A]"
            />
            <span className="text-sm text-gray-700">
              Saya menyetujui syarat & ketentuan di atas dan bertanggung jawab atas isi laporan ini.
            </span>
          </label>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep('form')}
              className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
            >
              ← Kembali
            </button>
            <button
              onClick={handleSubmit}
              disabled={!tosAccepted || loading}
              className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Mengirim...' : 'Kirim Laporan'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

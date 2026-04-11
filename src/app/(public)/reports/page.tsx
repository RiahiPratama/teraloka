'use client';

import { useState } from 'react';

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
  const [step, setStep] = useState<'form' | 'tos' | 'success'>('form');
  const [anonymity, setAnonymity] = useState<'anonim' | 'pseudonym' | 'nama_terang'>('anonim');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);

  const handleSubmit = async () => {
    if (!tosAccepted) return;
    try {
      const res = await fetch('/api/v1/content/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymity_level: anonymity, title, body, category }),
      });
      if (res.ok) setStep('success');
    } catch {
      alert('Gagal mengirim laporan. Coba lagi.');
    }
  };

  if (step === 'success') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center">
          <p className="text-4xl">✅</p>
          <h2 className="mt-3 text-lg font-bold">Laporan Terkirim!</h2>
          <p className="mt-1 text-sm text-gray-500">
            Tim moderasi akan meninjau dalam 1×24 jam.
          </p>
          <button
            onClick={() => { setStep('form'); setTitle(''); setBody(''); setCategory(''); }}
            className="mt-4 rounded-lg bg-[#1B6B4A] px-4 py-2 text-sm text-white"
          >
            Buat Laporan Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <h1 className="text-xl font-bold text-[#1B6B4A]">BALAPOR</h1>
      <p className="text-sm text-gray-500">Laporkan masalah di sekitarmu</p>

      {step === 'form' && (
        <div className="mt-4 space-y-4">
          {/* Anonymity level */}
          <div>
            <label className="text-sm font-medium">Tingkat Identitas</label>
            <div className="mt-1.5 flex gap-2">
              {(['anonim', 'pseudonym', 'nama_terang'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setAnonymity(level)}
                  className={`rounded-lg px-3 py-2 text-xs ${
                    anonymity === level ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'
                  }`}
                >
                  {level === 'anonim' ? '🕵️ Anonim' : level === 'pseudonym' ? '✏️ Nama Samaran' : '👤 Nama Terang'}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setCategory(cat.key)}
                  className={`rounded-lg px-3 py-2 text-left text-xs ${
                    category === cat.key ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm font-medium">Judul Laporan</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Jalan rusak di depan RSUD"
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>

          {/* Body */}
          <div>
            <label className="text-sm font-medium">Isi Laporan</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Jelaskan masalah dengan detail..."
              rows={5}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>

          <button
            onClick={() => setStep('tos')}
            disabled={!title || !body || !category}
            className="w-full rounded-lg bg-[#1B6B4A] py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            Lanjut →
          </button>
        </div>
      )}

      {step === 'tos' && (
        <div className="mt-4 space-y-4">
          <div className="rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold">Syarat & Ketentuan BALAPOR</h3>
            <ol className="mt-2 space-y-2">
              {TOS_ITEMS.map((item, i) => (
                <li key={i} className="text-sm text-gray-600">
                  {i + 1}. {item}
                </li>
              ))}
            </ol>
          </div>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={tosAccepted}
              onChange={(e) => setTosAccepted(e.target.checked)}
              className="mt-1"
            />
            <span className="text-sm">Saya menyetujui syarat & ketentuan di atas</span>
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => setStep('form')}
              className="flex-1 rounded-lg border border-gray-200 py-3 text-sm"
            >
              ← Kembali
            </button>
            <button
              onClick={handleSubmit}
              disabled={!tosAccepted}
              className="flex-1 rounded-lg bg-[#1B6B4A] py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Kirim Laporan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

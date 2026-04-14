'use client';

import { useState, useEffect } from 'react';
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

// Kategori yang wajib foto
const PHOTO_REQUIRED = ['infrastruktur', 'lingkungan'];

const TOS_ITEMS = [
  'Laporan berisi fakta, bukan opini atau fitnah.',
  'Saya bertanggung jawab atas isi laporan (UU ITE).',
  'TeraLoka berhak menolak/menghapus laporan yang melanggar.',
  'Laporan bisa dijadikan artikel BAKABAR (dengan izin).',
  'Data pribadimu bersifat rahasia dan dilindungi oleh hukum.',
  'Takedown request diproses maksimal 1×24 jam.',
];

export default function ReportsPage() {
  const { user, token, requestOtp, verifyOtp } = useAuth();

  type Step = 'form' | 'tos' | 'login' | 'otp' | 'success';
  const [step, setStep] = useState<Step>('form');
  const [anonymity, setAnonymity] = useState<'anonim' | 'pseudonym' | 'nama_terang'>('anonim');
  const [category, setCategory] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Login via WA OTP
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const photoRequired = PHOTO_REQUIRED.includes(category);

  // Kalau user sudah login setelah dari step login, otomatis submit
  useEffect(() => {
    if (user && token && step === 'otp') {
      handleSubmit(token);
    }
  }, [user, token]);

  const handleSubmit = async (authToken?: string) => {
    const tkn = authToken || token;
    if (!tkn) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/content/reports`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tkn}`,
        },
        body: JSON.stringify({
          anonymity_level: anonymity,
          title,
          body,
          category,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('success');
      } else {
        setError(data.error?.message ?? 'Gagal mengirim laporan.');
      }
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleTosNext = () => {
    if (!tosAccepted) return;
    if (user && token) {
      // Sudah login — langsung kirim
      handleSubmit();
    } else {
      // Belum login — minta login dulu
      setStep('login');
    }
  };

  const handleRequestOtp = async () => {
    if (!phone.trim()) return;
    setOtpLoading(true);
    setError('');
    try {
      await requestOtp(phone.trim());
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Gagal kirim OTP.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setOtpLoading(true);
    setError('');
    try {
      await verifyOtp(phone.trim(), otp.trim());
      setStep('otp'); // trigger useEffect untuk auto-submit
    } catch (err: any) {
      setError(err.message || 'OTP salah atau expired.');
    } finally {
      setOtpLoading(false);
    }
  };

  const resetForm = () => {
    setStep('form');
    setTitle(''); setBody(''); setCategory('');
    setTosAccepted(false); setError('');
    setPhone(''); setOtp(''); setOtpSent(false);
  };

  // ── SUCCESS ──────────────────────────────────────────────────────
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
          <p className="mt-1 text-sm text-gray-500">Tim moderasi akan meninjau dalam 1×24 jam.</p>
          <p className="mt-1 text-xs text-gray-400">
            🔒 Identitasmu dilindungi sesuai pilihan anonimitas yang kamu pilih.
          </p>
          <button onClick={resetForm} className="mt-4 rounded-lg bg-[#1B6B4A] px-5 py-2 text-sm font-medium text-white">
            Buat Laporan Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#1B6B4A]">BALAPOR</h1>
        <p className="text-sm text-gray-500">Laporkan masalah di sekitarmu</p>
        {user && (
          <p className="mt-1 text-xs text-[#1B6B4A]">
            ✓ Login sebagai +{user.phone}
          </p>
        )}
      </div>

      {/* ── STEP 1: FORM ── */}
      {step === 'form' && (
        <div className="space-y-4">

          {/* Anonymity */}
          <div>
            <label className="text-sm font-medium text-gray-700">Tingkat Identitas</label>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {(['anonim', 'pseudonym', 'nama_terang'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setAnonymity(level)}
                  className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                    anonymity === level ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {level === 'anonim' ? '🕵️ Anonim' : level === 'pseudonym' ? '✏️ Nama Samaran' : '👤 Nama Terang'}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-gray-400">
              {anonymity === 'anonim'
                ? 'Identitasmu tersembunyi dari publik.'
                : anonymity === 'pseudonym'
                ? 'Nama samaran ditampilkan, bukan nama asli.'
                : 'Namamu akan ditampilkan di laporan.'}
            </p>
            {/* Privacy notice */}
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-green-50 px-3 py-2">
              <span className="text-sm">🔒</span>
              <p className="text-xs text-green-700">
                Apapun pilihanmu, nomor WA kamu tidak pernah ditampilkan ke publik.
              </p>
            </div>
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
                    category === cat.key ? 'bg-[#1B6B4A] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            {photoRequired && category && (
              <div className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2">
                <span className="text-sm">📷</span>
                <p className="text-xs text-amber-700">
                  Kategori ini memerlukan minimal 1 foto sebagai bukti.
                </p>
              </div>
            )}
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

      {/* ── STEP 2: TOS ── */}
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
              onClick={handleTosNext}
              disabled={!tosAccepted || loading}
              className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              {loading ? 'Mengirim...' : user ? 'Kirim Laporan' : 'Lanjut →'}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: LOGIN (belum login) ── */}
      {step === 'login' && (
        <div className="space-y-4">
          {/* Info card */}
          <div className="rounded-xl border border-[#1B6B4A]/20 bg-green-50 p-4 text-center">
            <div className="mb-2 text-3xl">📱</div>
            <h3 className="font-semibold text-gray-900">Satu langkah lagi!</h3>
            <p className="mt-1 text-sm text-gray-600">
              Login via WhatsApp untuk mengirim laporanmu.
              <strong> Data laporan kamu sudah tersimpan, tidak akan hilang.</strong>
            </p>
            <div className="mt-3 flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-left">
              <span className="text-sm">🔒</span>
              <p className="text-xs text-gray-500">
                Nomor WA mu tidak dipublish dan identitasmu dilindungi sesuai tingkat anonimitas yang kamu pilih tadi.
              </p>
            </div>
          </div>

          {!otpSent ? (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Nomor WhatsApp</label>
                <div className="mt-1.5 flex gap-2">
                  <span className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500">
                    +62
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                    placeholder="8123456789"
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#1B6B4A]"
                  />
                </div>
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <div className="flex gap-2">
                <button onClick={() => setStep('tos')} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">
                  ← Kembali
                </button>
                <button
                  onClick={handleRequestOtp}
                  disabled={!phone.trim() || otpLoading}
                  className="flex-1 rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {otpLoading ? 'Mengirim...' : 'Kirim OTP via WA'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700">Kode OTP</label>
                <p className="text-xs text-gray-400">Dikirim ke WhatsApp +62{phone}</p>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                  placeholder="6 digit kode OTP"
                  maxLength={6}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-center text-lg font-bold tracking-widest outline-none focus:border-[#1B6B4A]"
                  autoFocus
                />
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <button
                onClick={handleVerifyOtp}
                disabled={otp.length < 4 || otpLoading}
                className="w-full rounded-xl bg-[#1B6B4A] py-3 text-sm font-semibold text-white disabled:opacity-40"
              >
                {otpLoading ? 'Memverifikasi...' : 'Verifikasi & Kirim Laporan'}
              </button>

              <button
                onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                className="w-full text-center text-xs text-gray-400"
              >
                Ganti nomor atau kirim ulang OTP
              </button>
            </>
          )}
        </div>
      )}

      {/* ── STEP OTP (auto-submit loading) ── */}
      {step === 'otp' && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-[#1B6B4A] border-t-transparent" />
            <p className="text-sm text-gray-500">Mengirim laporan...</p>
          </div>
        </div>
      )}
    </div>
  );
}

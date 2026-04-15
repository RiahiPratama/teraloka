'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'keamanan',       label: 'Keamanan',      icon: 'security',        color: 'bg-emerald-50 text-emerald-700' },
  { key: 'infrastruktur',  label: 'Infrastruktur',  icon: 'construction',    color: 'bg-blue-50 text-blue-700' },
  { key: 'lingkungan',     label: 'Lingkungan',     icon: 'park',            color: 'bg-green-50 text-green-700' },
  { key: 'layanan_publik', label: 'Layanan Publik', icon: 'account_balance', color: 'bg-purple-50 text-purple-700' },
  { key: 'kesehatan',      label: 'Kesehatan',      icon: 'local_hospital',  color: 'bg-red-50 text-red-700' },
  { key: 'pendidikan',     label: 'Pendidikan',     icon: 'school',          color: 'bg-yellow-50 text-yellow-700' },
  { key: 'transportasi',   label: 'Transportasi',   icon: 'directions_boat', color: 'bg-cyan-50 text-cyan-700' },
  { key: 'lainnya',        label: 'Lainnya',        icon: 'more_horiz',      color: 'bg-gray-50 text-gray-600' },
];

const PHOTO_REQUIRED = ['infrastruktur', 'lingkungan'];

const TOS_ITEMS = [
  'Laporan berisi fakta, bukan opini atau fitnah.',
  'Saya bertanggung jawab atas isi laporan (UU ITE).',
  'TeraLoka berhak menolak/menghapus laporan yang melanggar.',
  'Laporan bisa dijadikan artikel BAKABAR setelah diverifikasi.',
  'Data pribadimu bersifat rahasia dan dilindungi oleh hukum.',
  'Takedown request diproses maksimal 1×24 jam.',
];

const ANONYMITY = [
  { key: 'anonim',      label: 'Anonim',        icon: 'masks',        desc: 'Identitasmu tersembunyi sepenuhnya.' },
  { key: 'pseudonym',   label: 'Nama Samaran',  icon: 'person_outline', desc: 'Nama samaran ditampilkan.' },
  { key: 'nama_terang', label: 'Nama Terang',   icon: 'badge',        desc: 'Namamu ditampilkan di laporan.' },
] as const;

export default function ReportsPage() {
  const { user, token, requestOtp, verifyOtp } = useAuth();

  type Step = 'form' | 'tos' | 'login' | 'otp' | 'success';
  const [step, setStep]             = useState<Step>('form');
  const [anonymity, setAnonymity]   = useState<'anonim' | 'pseudonym' | 'nama_terang'>('anonim');
  const [pseudonym, setPseudonym]   = useState('');
  const [category, setCategory]     = useState('');
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [photos, setPhotos]         = useState<string[]>([]);
  const [notifOptIn, setNotifOptIn] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const photoRequired = PHOTO_REQUIRED.includes(category);

  useEffect(() => {
    if (user && token && step === 'otp') handleSubmit(token);
  }, [user, token]);

  const handleSubmit = async (authToken?: string) => {
    const tkn = authToken || token;
    if (!tkn) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/content/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${tkn}` },
        body: JSON.stringify({
          anonymity_level: anonymity,
          pseudonym: anonymity === 'pseudonym' ? pseudonym.trim() : undefined,
          title, body, category, photos,
          notification_opt_in: notifOptIn,
        }),
      });
      const data = await res.json();
      if (res.ok) setStep('success');
      else setError(data.error?.message ?? 'Gagal mengirim laporan.');
    } catch {
      setError('Koneksi bermasalah. Coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const handleTosNext = () => {
    if (!tosAccepted) return;
    if (user && token) handleSubmit();
    else setStep('login');
  };

  const handleRequestOtp = async () => {
    if (!phone.trim()) return;
    setOtpLoading(true); setError('');
    try {
      await requestOtp(phone.trim());
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Gagal kirim OTP.');
    } finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setOtpLoading(true); setError('');
    try {
      await verifyOtp(phone.trim(), otp.trim());
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'OTP salah atau expired.');
    } finally { setOtpLoading(false); }
  };

  const resetForm = () => {
    setStep('form'); setTitle(''); setBody(''); setCategory(''); setPhotos([]);
    setPseudonym(''); setTosAccepted(false); setError(''); setNotifOptIn(false);
    setPhone(''); setOtp(''); setOtpSent(false);
  };

  // SUCCESS
  if (step === 'success') return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#003526]">
          <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h2 className="text-xl font-bold text-[#003526]">Laporan Terkirim!</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">Tim moderasi akan meninjau dalam 1×24 jam.</p>
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-left">
          <p className="text-xs text-emerald-700 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">lock</span>
            Identitasmu dilindungi. Nomor WA tidak pernah dipublikasikan.
          </p>
        </div>
        {notifOptIn && <p className="mt-2 text-xs text-gray-400">📲 Notifikasi WA akan dikirim saat laporan diproses.</p>}
        <button onClick={resetForm} className="mt-6 w-full rounded-xl bg-[#003526] py-3 text-sm font-bold text-white">
          Buat Laporan Lagi
        </button>
        <a href="/my-reports" className="mt-2 block text-center text-sm text-[#003526] font-medium hover:underline">
          Pantau status laporan →
        </a>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      {/* Hero */}
      <div className="bg-[#003526] px-6 pt-8 pb-10">
        <div className="mx-auto max-w-lg">
          <h1 className="text-2xl font-extrabold tracking-tight text-white">BALAPOR</h1>
          <p className="mt-1 text-sm text-[#95d3ba] leading-relaxed">
            Sampaikan laporan secara aman dan terpercaya untuk Maluku Utara yang lebih baik.
          </p>
          {user && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1">
              <span className="material-symbols-outlined text-[#95d3ba] text-sm">verified_user</span>
              <span className="text-xs text-[#95d3ba] font-medium">Login sebagai +{user.phone}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-4 pb-24">
        <div className="rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">

          {/* STEP 1: FORM */}
          {step === 'form' && (
            <div className="p-5 space-y-6">

              {/* Identitas */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Pilih Identitas Pelapor</p>
                <div className="grid grid-cols-3 gap-2">
                  {ANONYMITY.map((a) => (
                    <button key={a.key} onClick={() => setAnonymity(a.key)}
                      className={`flex flex-col items-center gap-2 rounded-xl p-3 text-center transition-all border-2 ${
                        anonymity === a.key ? 'border-[#003526] bg-[#003526]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                      }`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${anonymity === a.key ? 'bg-[#003526]' : 'bg-white border border-gray-200'}`}>
                        <span className={`material-symbols-outlined text-xl ${anonymity === a.key ? 'text-white' : 'text-gray-400'}`}>{a.icon}</span>
                      </div>
                      <span className={`text-xs font-bold leading-tight ${anonymity === a.key ? 'text-[#003526]' : 'text-gray-500'}`}>{a.label}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-2 rounded-xl bg-emerald-50 px-3 py-2">
                  <p className="text-xs text-emerald-700">{ANONYMITY.find(a => a.key === anonymity)?.desc}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    Nomor WA tidak pernah ditampilkan ke publik.
                  </p>
                </div>
                {anonymity === 'pseudonym' && (
                  <input type="text" value={pseudonym} onChange={(e) => setPseudonym(e.target.value)}
                    placeholder="Tulis nama samaranmu..."
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#003526]" />
                )}
              </div>

              {/* Kategori */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Kategori Laporan</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const [bg, text] = cat.color.split(' ');
                    return (
                      <button key={cat.key} onClick={() => setCategory(cat.key)}
                        className={`flex items-center gap-3 rounded-xl p-3 text-left transition-all border-2 ${
                          category === cat.key ? 'border-[#003526] bg-[#003526]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }`}>
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${category === cat.key ? 'bg-[#003526]' : bg}`}>
                          <span className={`material-symbols-outlined text-lg ${category === cat.key ? 'text-white' : text}`}>{cat.icon}</span>
                        </div>
                        <span className={`text-xs font-bold ${category === cat.key ? 'text-[#003526]' : 'text-gray-700'}`}>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
                {photoRequired && (
                  <p className="mt-1.5 text-xs text-amber-600 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">photo_camera</span>
                    Kategori ini wajib upload foto bukti
                  </p>
                )}
              </div>

              {/* Judul */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Judul Laporan</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Jalan rusak di depan RSUD Ternate"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] transition-colors" />
              </div>

              {/* Body */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deskripsi Kejadian</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)}
                  placeholder="Ceritakan detail kejadian: lokasi spesifik, waktu, dan dampaknya..."
                  rows={5}
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] transition-colors resize-none" />
                <p className="mt-1 text-right text-xs text-gray-400">{body.length} karakter</p>
              </div>

              {/* Foto */}
              <ImageUpload bucket="reports" onUpload={(urls) => setPhotos(urls)}
                label={photoRequired ? 'Foto Bukti (Wajib — min. 1 foto)' : 'Foto Bukti (Opsional)'}
                maxFiles={3} />

              {/* Notifikasi opt-in */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Notifikasi WhatsApp</p>
                    <p className="mt-0.5 text-xs text-gray-500 leading-relaxed">
                      {notifOptIn
                        ? 'Aktif — kamu akan dapat update via WA saat laporan diproses. Nomormu tidak dipublikasikan.'
                        : 'Nonaktif — pantau status di halaman "Laporan Saya" tanpa notifikasi WA.'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setNotifOptIn(!notifOptIn)}
                    className={`mt-0.5 relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${notifOptIn ? 'bg-[#003526]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${notifOptIn ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>

              <button onClick={() => setStep('tos')}
                disabled={!title.trim() || !body.trim() || !category || (photoRequired && photos.length === 0) || (anonymity === 'pseudonym' && !pseudonym.trim())}
                className="w-full rounded-xl bg-[#003526] py-3.5 text-sm font-bold text-white disabled:opacity-40 transition-opacity">
                Lanjut ke Syarat & Ketentuan →
              </button>
            </div>
          )}

          {/* STEP 2: TOS */}
          {step === 'tos' && (
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900">Syarat & Ketentuan BALAPOR</h3>
                <p className="text-xs text-gray-400 mt-0.5">Baca dan setujui sebelum mengirim laporan</p>
              </div>
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <ol className="space-y-3">
                  {TOS_ITEMS.map((item, i) => (
                    <li key={i} className="flex gap-2.5 text-sm text-gray-600">
                      <span className="shrink-0 font-bold text-[#003526]">{i + 1}.</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={tosAccepted} onChange={(e) => setTosAccepted(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-[#003526]" />
                <span className="text-sm text-gray-700">
                  Saya menyetujui syarat & ketentuan di atas dan bertanggung jawab atas isi laporan ini.
                </span>
              </label>
              {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button onClick={() => setStep('form')} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">← Kembali</button>
                <button onClick={handleTosNext} disabled={!tosAccepted || loading}
                  className="flex-1 rounded-xl bg-[#003526] py-3 text-sm font-bold text-white disabled:opacity-40">
                  {loading ? 'Mengirim...' : user ? 'Kirim Laporan' : 'Lanjut →'}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: LOGIN */}
          {step === 'login' && (
            <div className="p-5 space-y-4">
              <div className="rounded-xl bg-emerald-50 p-4 text-center">
                <div className="text-3xl mb-2">📱</div>
                <h3 className="font-bold text-gray-900">Satu langkah lagi!</h3>
                <p className="mt-1 text-sm text-gray-600">
                  Login via WhatsApp untuk mengirim laporanmu.
                  <strong> Data laporan sudah tersimpan, tidak akan hilang.</strong>
                </p>
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-left">
                  <span className="material-symbols-outlined text-[#003526] text-sm shrink-0">lock</span>
                  <p className="text-xs text-gray-500">Nomor WA tidak dipublish. Identitasmu dilindungi sesuai pilihan anonimitas tadi.</p>
                </div>
              </div>

              {!otpSent ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nomor WhatsApp</label>
                    <div className="mt-2 flex gap-2">
                      <span className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 font-medium">+62</span>
                      <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRequestOtp()}
                        placeholder="8123456789"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                    </div>
                  </div>
                  {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
                  <div className="flex gap-2">
                    <button onClick={() => setStep('tos')} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">← Kembali</button>
                    <button onClick={handleRequestOtp} disabled={!phone.trim() || otpLoading}
                      className="flex-1 rounded-xl bg-[#003526] py-3 text-sm font-bold text-white disabled:opacity-40">
                      {otpLoading ? 'Mengirim...' : 'Kirim OTP via WA'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Kode OTP</label>
                    <p className="text-xs text-gray-400 mt-0.5">Dikirim ke WhatsApp +62{phone}</p>
                    <input type="text" value={otp} onChange={(e) => setOtp(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleVerifyOtp()}
                      placeholder="______" maxLength={6}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-[#003526]"
                      autoFocus />
                  </div>
                  {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}
                  <button onClick={handleVerifyOtp} disabled={otp.length < 4 || otpLoading}
                    className="w-full rounded-xl bg-[#003526] py-3.5 text-sm font-bold text-white disabled:opacity-40">
                    {otpLoading ? 'Memverifikasi...' : 'Verifikasi & Kirim Laporan'}
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                    className="w-full text-center text-xs text-gray-400 py-1">
                    Ganti nomor atau kirim ulang OTP
                  </button>
                </>
              )}
            </div>
          )}

          {/* OTP loading */}
          {step === 'otp' && (
            <div className="flex min-h-[40vh] items-center justify-center p-5">
              <div className="text-center">
                <div className="mx-auto mb-3 h-12 w-12 animate-spin rounded-full border-4 border-[#003526] border-t-transparent" />
                <p className="text-sm text-gray-500">Mengirim laporan...</p>
              </div>
            </div>
          )}
        </div>

        {user && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Sudah lapor sebelumnya?{' '}
            <a href="/my-reports" className="text-[#003526] font-semibold hover:underline">
              Pantau status laporan →
            </a>
          </p>
        )}
      </div>
    </div>
  );
}

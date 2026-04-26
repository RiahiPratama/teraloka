'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import ImageUpload from '@/components/ui/ImageUpload';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

const CATEGORIES = [
  { key: 'keamanan',       label: 'Keamanan',       icon: 'security',        color: 'bg-emerald-100 text-emerald-700', desc: 'Kamtibmas, pencurian, aktivitas mencurigakan.' },
  { key: 'infrastruktur',  label: 'Infrastruktur',  icon: 'construction',    color: 'bg-blue-100 text-blue-700',     desc: 'Jalan rusak, lampu mati, fasilitas umum.' },
  { key: 'lingkungan',     label: 'Lingkungan',     icon: 'park',            color: 'bg-green-100 text-green-700',   desc: 'Sampah liar, pencemaran, kerusakan alam.' },
  { key: 'layanan_publik', label: 'Layanan Publik', icon: 'account_balance', color: 'bg-purple-100 text-purple-700', desc: 'Pungli, birokrasi bermasalah, pelayanan buruk.' },
  { key: 'kesehatan',      label: 'Kesehatan',      icon: 'local_hospital',  color: 'bg-red-100 text-red-700',       desc: 'Fasilitas rusak, penolakan pasien, wabah.' },
  { key: 'pendidikan',     label: 'Pendidikan',     icon: 'school',          color: 'bg-yellow-100 text-yellow-700', desc: 'Gedung rusak, pungutan liar, diskriminasi.' },
  { key: 'transportasi',   label: 'Transportasi',   icon: 'directions_boat', color: 'bg-cyan-100 text-cyan-700',     desc: 'Speedboat/kapal tidak layak, tarif tidak wajar.' },
  { key: 'lainnya',        label: 'Lainnya',        icon: 'more_horiz',      color: 'bg-gray-100 text-gray-600',     desc: 'Hal lain yang perlu perhatian publik.' },
];

const PHOTO_REQUIRED = ['infrastruktur', 'lingkungan'];

// ── TOS yang tidak menakutkan ─────────────────────────────────
const TOS_ITEMS = [
  { icon: 'fact_check',    text: 'Laporan berisi informasi yang benar sesuai yang saya ketahui.' },
  { icon: 'shield',        text: 'Data pribadi saya bersifat rahasia dan dilindungi penuh oleh TeraLoka.' },
  { icon: 'edit_note',     text: 'Laporan yang telah diverifikasi bisa dijadikan artikel berita BAKABAR.' },
  { icon: 'handshake',     text: 'TeraLoka berkomitmen merespons setiap laporan dalam 1×24 jam.' },
  { icon: 'verified_user', text: 'Identitas saya hanya bisa diakses oleh Super Admin dengan audit log tercatat.' },
  { icon: 'delete',        text: 'Saya bisa mengajukan permintaan hapus laporan kapan saja.' },
];

const ANONYMITY = [
  { key: 'anonim',      label: 'Anonim',        icon: 'masks',        desc: 'Identitasmu tersembunyi sepenuhnya.', inputLabel: '' },
  { key: 'pseudonym',   label: 'Nama Samaran',  icon: 'person_outline', desc: 'Nama samaran ditampilkan.', inputLabel: 'Nama Samaran' },
  { key: 'nama_terang', label: 'Nama Lengkap',  icon: 'badge',        desc: 'Nama lengkapmu akan ditampilkan.', inputLabel: 'Nama Lengkap' },
] as const;

export default function ReportsPage() {
  const { user, token, requestOtp, verifyOtp } = useAuth();

  type Step = 'form' | 'tos' | 'login' | 'submitting' | 'success';
  const [step, setStep]             = useState<Step>('form');
  const [anonymity, setAnonymity]   = useState<'anonim' | 'pseudonym' | 'nama_terang'>('anonim');
  const [identityName, setIdentityName] = useState('');
  const [category, setCategory]     = useState('');
  const [title, setTitle]           = useState('');
  const [body, setBody]             = useState('');
  const [location, setLocation]     = useState('');
  const [coords, setCoords]         = useState<{ lat: number; lng: number } | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoError, setGeoError]     = useState('');
  const [photos, setPhotos]         = useState<string[]>([]);
  const [notifOptIn, setNotifOptIn] = useState(false);
  const [tosAccepted, setTosAccepted] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [phone, setPhone]           = useState('');
  const [otp, setOtp]               = useState('');
  const [otpSent, setOtpSent]       = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError]     = useState('');

  const photoRequired = PHOTO_REQUIRED.includes(category);
  const selectedAnonimity = ANONYMITY.find(a => a.key === anonymity)!;
  const needsIdentityInput = anonymity !== 'anonim';

  const handleSubmit = async (authToken: string) => {
    setStep('submitting');
    setSubmitError('');
    try {
      const res = await fetch(`${API}/content/reports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
        body: JSON.stringify({
          anonymity_level: anonymity,
          pseudonym: needsIdentityInput ? identityName.trim() : undefined,
          title, body, category,
          location: location.trim() || undefined,
          latitude: coords?.lat,
          longitude: coords?.lng,
          photos,
          notification_opt_in: notifOptIn,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setStep('success');
      } else {
        const msg = data.error?.message || data.error || 'Gagal mengirim laporan. Coba lagi.';
        setSubmitError(msg);
        setStep('tos'); // kembali ke TOS agar user bisa retry
      }
    } catch {
      setSubmitError('Koneksi bermasalah. Pastikan internet aktif dan coba lagi.');
      setStep('tos');
    }
  };

  const handleTosNext = () => {
    if (!tosAccepted) return;
    if (user && token) {
      handleSubmit(token);
    } else {
      setStep('login');
    }
  };

  const handleRequestOtp = async () => {
    if (!phone.trim()) return;
    setOtpLoading(true); setOtpError('');
    try { await requestOtp(phone.trim()); setOtpSent(true); }
    catch (err: any) { setOtpError(err.message || 'Gagal kirim OTP.'); }
    finally { setOtpLoading(false); }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) return;
    setOtpLoading(true); setOtpError('');
    try {
      const result = await verifyOtp(phone.trim(), otp.trim());
      // Setelah verify berhasil, langsung submit dengan token baru
      // Token baru ada di localStorage setelah verifyOtp
      const savedToken = localStorage.getItem('tl_token');
      if (savedToken) {
        handleSubmit(savedToken);
      } else {
        setOtpError('Gagal mendapatkan token. Coba lagi.');
        setOtpLoading(false);
      }
    } catch (err: any) {
      setOtpError(err.message || 'OTP salah atau sudah expired.');
      setOtpLoading(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) { setGeoError('Browser tidak mendukung geolokasi.'); return; }
    setGeoLoading(true); setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoLoading(false); },
      () => { setGeoError('Gagal deteksi lokasi. Pastikan GPS aktif dan izin diberikan.'); setGeoLoading(false); },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const resetForm = () => {
    setStep('form'); setTitle(''); setBody(''); setCategory(''); setPhotos([]);
    setIdentityName(''); setTosAccepted(false); setSubmitError(''); setNotifOptIn(false);
    setPhone(''); setOtp(''); setOtpSent(false); setOtpError(''); setLocation(''); setCoords(null);
  };

  // ── SUCCESS ──────────────────────────────────────────────────
  if (step === 'success') return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#003526]">
          <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
        </div>
        <h2 className="text-xl font-bold text-[#003526]">Laporan Terkirim!</h2>
        <p className="mt-2 text-sm text-gray-500 leading-relaxed">Terima kasih sudah berkontribusi untuk Maluku Utara yang lebih baik. Tim kami akan meninjau dalam 1×24 jam.</p>
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-left">
          <p className="text-xs text-emerald-700 flex items-start gap-2">
            <span className="material-symbols-outlined text-sm shrink-0">lock</span>
            Identitasmu dilindungi sepenuhnya. Nomor WA tidak pernah dipublikasikan.
          </p>
        </div>
        {notifOptIn && <p className="mt-2 text-xs text-gray-400">📲 Kamu akan dapat notifikasi WA saat laporan diproses.</p>}
        <div className="mt-5 space-y-2">
          <a href="/my-reports" className="block w-full rounded-xl bg-[#003526] py-3 text-sm font-bold text-white text-center">Pantau Status Laporan →</a>
          <button onClick={resetForm} className="block w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">Buat Laporan Lagi</button>
        </div>
      </div>
    </div>
  );

  // ── SUBMITTING (loading yang proper) ─────────────────────────
  if (step === 'submitting') return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-full border-4 border-[#003526] border-t-transparent animate-spin" />
        <h3 className="font-semibold text-gray-800">Mengirim laporan...</h3>
        <p className="text-sm text-gray-500 mt-1">Harap tunggu sebentar</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      {/* Hero */}
      <div className="bg-[#003526] px-6 pt-8 pb-10">
        <div className="mx-auto max-w-lg">
          {/* Label BALAPOR */}
          <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1.5 mb-4">
            <span className="material-symbols-outlined text-[#95d3ba] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>campaign</span>
            <span className="text-xs font-black text-[#95d3ba] uppercase tracking-widest">BALAPOR</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white leading-tight">
            Dari Netizen,<br />Oleh Netizen,<br />Untuk Warga Maluku Utara
          </h1>
          <p className="mt-2 text-sm text-[#95d3ba] leading-relaxed">
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

      <div className="mx-auto max-w-lg px-4 -mt-4 pb-8">
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
                      className={`flex flex-col items-center gap-2 rounded-xl p-3 text-center border-2 transition-all ${
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
                  <p className="text-xs text-emerald-700">{selectedAnonimity.desc}</p>
                  <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">lock</span>
                    Nomor WA tidak pernah ditampilkan ke publik.
                  </p>
                </div>
                {needsIdentityInput && (
                  <input type="text" value={identityName} onChange={e => setIdentityName(e.target.value)}
                    placeholder={`Tulis ${selectedAnonimity.inputLabel.toLowerCase()} kamu...`}
                    className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-[#003526]" />
                )}
              </div>

              {/* Kategori 2 kolom */}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Kategori Laporan</p>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => {
                    const [bg, text] = cat.color.split(' ');
                    const isSelected = category === cat.key;
                    return (
                      <button key={cat.key} onClick={() => setCategory(cat.key)}
                        className={`flex items-start gap-2.5 rounded-xl p-3 text-left border-2 transition-all ${
                          isSelected ? 'border-[#003526] bg-[#003526]/5' : 'border-transparent bg-gray-50 hover:bg-gray-100'
                        }`}>
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isSelected ? 'bg-[#003526]' : bg}`}>
                          <span className={`material-symbols-outlined text-base ${isSelected ? 'text-white' : text}`}>{cat.icon}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-xs font-bold ${isSelected ? 'text-[#003526]' : 'text-gray-800'}`}>{cat.label}</span>
                            {isSelected && <span className="material-symbols-outlined text-[#003526] text-sm shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>}
                          </div>
                          <p className={`text-xs mt-0.5 leading-tight ${isSelected ? 'text-[#003526]/60' : 'text-gray-400'}`}>{cat.desc}</p>
                          {PHOTO_REQUIRED.includes(cat.key) && (
                            <span className="text-xs text-amber-500 flex items-center gap-0.5 mt-0.5">
                              <span className="material-symbols-outlined text-xs">photo_camera</span> Foto wajib
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Judul */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Judul Laporan</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="Berikan judul singkat dan jelas..."
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
              </div>

              {/* Deskripsi */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Deskripsi Kejadian</label>
                <textarea value={body} onChange={e => setBody(e.target.value)}
                  placeholder="Ceritakan apa yang terjadi, di mana, kapan, dan dampaknya..."
                  rows={5} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526] resize-none" />
                <p className="mt-1 text-right text-xs text-gray-400">{body.length} karakter</p>
              </div>

              {/* Lokasi */}
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Lokasi Kejadian <span className="text-gray-300 font-normal">(Opsional)</span>
                </label>
                <input type="text" value={location} onChange={e => setLocation(e.target.value)}
                  placeholder="Contoh: Jl. Sultan Baab RT 03, Kel. Soa-Sio, Ternate Utara"
                  className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                <div className="mt-2">
                  {!coords ? (
                    <button onClick={detectLocation} disabled={geoLoading}
                      className="flex items-center gap-2 text-xs text-[#003526] font-semibold bg-[#003526]/5 hover:bg-[#003526]/10 px-3 py-2 rounded-xl disabled:opacity-60">
                      {geoLoading
                        ? <span className="w-3.5 h-3.5 border-2 border-[#003526] border-t-transparent rounded-full animate-spin" />
                        : <span className="material-symbols-outlined text-sm">my_location</span>}
                      {geoLoading ? 'Mendeteksi...' : '📍 Deteksi Lokasi via GPS (Opsional)'}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">location_on</span>
                          GPS terdeteksi ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                        </p>
                        <button onClick={() => setCoords(null)} className="text-xs text-gray-400 hover:text-red-500">Hapus</button>
                      </div>
                      <div className="rounded-xl overflow-hidden border border-gray-200 h-36">
                        <iframe
                          src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.lng - 0.005},${coords.lat - 0.005},${coords.lng + 0.005},${coords.lat + 0.005}&layer=mapnik&marker=${coords.lat},${coords.lng}`}
                          width="100%" height="100%" style={{ border: 0 }} title="Lokasi" />
                      </div>
                    </div>
                  )}
                  {geoError && <p className="mt-1 text-xs text-red-500">{geoError}</p>}
                </div>
              </div>

              {/* Foto */}
              <ImageUpload bucket="reports" onUpload={urls => setPhotos(urls)}
                label={photoRequired ? 'Foto Bukti (Wajib — min. 1 foto)' : 'Foto Bukti (Opsional)'}
                maxFiles={3} />

              {/* Notif opt-in */}
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-gray-800">Notifikasi WhatsApp</p>
                    <p className="mt-0.5 text-xs text-gray-500">{notifOptIn ? 'Aktif — update via WA. Nomor tidak dipublikasikan.' : 'Nonaktif — pantau di "Laporan Saya".'}</p>
                  </div>
                  <button onClick={() => setNotifOptIn(!notifOptIn)}
                    className={`mt-0.5 relative h-6 w-11 shrink-0 rounded-full transition-colors ${notifOptIn ? 'bg-[#003526]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${notifOptIn ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              <button onClick={() => setStep('tos')}
                disabled={!title.trim() || !body.trim() || !category || (photoRequired && photos.length === 0) || (needsIdentityInput && !identityName.trim())}
                className="w-full rounded-xl bg-[#003526] py-3.5 text-sm font-bold text-white disabled:opacity-40">
                Lanjut ke Ketentuan →
              </button>
            </div>
          )}

          {/* STEP 2: TOS — yang tidak menakutkan */}
          {step === 'tos' && (
            <div className="p-5 space-y-4">
              <div>
                <h3 className="font-bold text-gray-900">Komitmen Pelapor</h3>
                <p className="text-xs text-gray-400 mt-0.5">Dengan melaporkan, kamu setuju dengan hal-hal berikut</p>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="space-y-3">
                  {TOS_ITEMS.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-[#003526] text-base shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                      <p className="text-sm text-gray-700 leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Error dari submit sebelumnya */}
              {submitError && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 flex items-start gap-2">
                  <span className="material-symbols-outlined text-red-500 text-sm shrink-0 mt-0.5">error</span>
                  <div>
                    <p className="text-sm font-semibold text-red-600">Gagal mengirim laporan</p>
                    <p className="text-xs text-red-500 mt-0.5">{submitError}</p>
                  </div>
                </div>
              )}

              <label className="flex cursor-pointer items-start gap-3">
                <input type="checkbox" checked={tosAccepted} onChange={e => setTosAccepted(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#003526]" />
                <span className="text-sm text-gray-700">Saya memahami dan menyetujui komitmen di atas.</span>
              </label>

              <div className="flex gap-2">
                <button onClick={() => setStep('form')} className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600">← Kembali</button>
                <button onClick={handleTosNext} disabled={!tosAccepted}
                  className="flex-1 rounded-xl bg-[#003526] py-3 text-sm font-bold text-white disabled:opacity-40">
                  {user ? 'Kirim Laporan' : 'Lanjut →'}
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
                <p className="mt-1 text-sm text-gray-600">Login via WhatsApp untuk mengirim laporanmu. <strong>Data laporan sudah tersimpan.</strong></p>
                <div className="mt-3 flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-left">
                  <span className="material-symbols-outlined text-[#003526] text-sm shrink-0">lock</span>
                  <p className="text-xs text-gray-500">Nomor WA tidak dipublish. Identitasmu dilindungi sepenuhnya.</p>
                </div>
              </div>

              {!otpSent ? (
                <>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nomor WhatsApp</label>
                    <div className="mt-2 flex gap-2">
                      <span className="flex items-center rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm text-gray-500 font-medium">+62</span>
                      <input type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleRequestOtp()}
                        placeholder="8123456789"
                        className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:border-[#003526]" />
                    </div>
                  </div>
                  {otpError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{otpError}</p>}
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
                    <input type="text" value={otp} onChange={e => setOtp(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                      placeholder="______" maxLength={6}
                      className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-4 text-center text-2xl font-bold tracking-[0.5em] outline-none focus:border-[#003526]" autoFocus />
                  </div>
                  {otpError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{otpError}</p>}
                  <button onClick={handleVerifyOtp} disabled={otp.length < 4 || otpLoading}
                    className="w-full rounded-xl bg-[#003526] py-3.5 text-sm font-bold text-white disabled:opacity-40">
                    {otpLoading ? 'Memverifikasi...' : 'Verifikasi & Kirim Laporan'}
                  </button>
                  <button onClick={() => { setOtpSent(false); setOtp(''); setOtpError(''); }}
                    className="w-full text-center text-xs text-gray-400 py-1">Ganti nomor atau kirim ulang OTP</button>
                </>
              )}
            </div>
          )}
        </div>

        {user && (
          <p className="mt-4 text-center text-xs text-gray-400">
            Sudah lapor sebelumnya?{' '}
            <a href="/my-reports" className="text-[#003526] font-semibold hover:underline">Pantau status laporan →</a>
          </p>
        )}
      </div>
    </div>
  );
}

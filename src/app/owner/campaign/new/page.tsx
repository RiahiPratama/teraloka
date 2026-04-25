'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';
import { Stethoscope, CloudRainWind, Flower, Baby, UserRound, Home, Loader2 } from 'lucide-react';

const REQUIREMENTS = [
  {
    icon: 'person',
    title: 'Warga Maluku Utara',
    desc: 'Penggalang dana adalah warga yang berdomisili atau terdaftar sebagai pengguna TeraLoka dengan nomor WA terverifikasi.',
  },
  {
    icon: 'badge',
    title: 'KYC Wajib (1-3 Hari Kerja)',
    desc: 'Verifikasi identitas via KTP/KK/Akta. Dokumen disimpan terenkripsi dan hanya dilihat tim verifikasi TeraLoka. Estimasi proses 1-3 hari kerja.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Kategori Kemanusiaan',
    desc: 'Campaign hanya untuk kebutuhan kemanusiaan: kesehatan, bencana, duka/musibah, anak yatim, lansia, atau hunian darurat.',
  },
  {
    icon: 'account_balance',
    title: 'Rekening Atas Nama Penggalang',
    desc: 'Default: rekening PRIBADI atas nama penggalang dana. Untuk kampanye komunitas: rekening lembaga/komunitas terdaftar boleh digunakan jika sudah partnership resmi dengan TeraLoka.',
  },
  {
    icon: 'receipt_long',
    title: 'Laporan Penggunaan Dana',
    desc: 'Penggalang wajib upload laporan penggunaan dana beserta bukti setiap Rp 1.000.000 yang digunakan.',
  },
];

const STEPS = [
  { num: 1, icon: 'edit_note', label: 'Isi Formulir', desc: 'Data penerima, cerita, target dana, dan rekening partner' },
  { num: 2, icon: 'pending_actions', label: 'Verifikasi Admin', desc: 'Tim TeraLoka meninjau dalam 1×24 jam' },
  { num: 3, icon: 'campaign', label: 'Campaign Aktif', desc: 'Campaign tampil di BADONASI dan bisa menerima donasi' },
];

const COMMITMENTS = [
  '100% donasi sampai ke penerima — TIDAK ada potongan dari nominal donasi',
  'Fee operasional adalah TAMBAHAN dari donor (bukan dipotong dari donasi)',
  'Dana masuk ke rekening sesuai pilihan kampanye (pribadi atau komunitas partner)',
  'Semua laporan penggunaan dana dipublikasikan secara terbuka',
  'Tim TeraLoka berhak menghentikan campaign jika ada pelanggaran',
  'Identitas donatur dilindungi sesuai preferensi mereka',
];

export default function CampaignInfoPage() {
  const { user, token, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  // ⭐ FIX-E: KYC profile state
  const [kycChecking, setKycChecking] = useState(true);
  const [kycComplete, setKycComplete] = useState<boolean | null>(null);

  // ⭐ FIX-E: Pre-check creator profile on mount
  // Auto-redirect kalau profile belum lengkap — user ga perlu baca preface
  // dulu, langsung dibawa ke flow KYC. After complete, return ke sini.
  useEffect(() => {
    if (authLoading) return;

    // Belum login? Skip check, biarkan handleLanjut yang handle redirect login
    if (!user || !token) {
      setKycChecking(false);
      return;
    }

    const checkProfile = async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/me/creator-profile`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (!res.ok) {
          // Kalau API error, biarkan user lanjut — error akan muncul di backend
          setKycComplete(true);
          return;
        }

        const json = await res.json();
        const isComplete = json?.data?.is_complete === true;
        setKycComplete(isComplete);

        // Auto-redirect kalau belum lengkap
        if (!isComplete) {
          router.replace(
            `/owner/profile/complete?return=${encodeURIComponent('/owner/campaign/new/info')}`
          );
        }
      } catch {
        // Network error — biarkan user lanjut, backend tetap akan block
        setKycComplete(true);
      } finally {
        setKycChecking(false);
      }
    };

    checkProfile();
  }, [authLoading, user, token, router]);

  const handleLanjut = () => {
    if (!agreed) return;
    if (!user) {
      router.push('/login?redirect=/owner/campaign/new/info');
      return;
    }
    // Defensive: kalau KYC belum lengkap (race condition), redirect ke complete
    if (kycComplete === false) {
      router.push(
        `/owner/profile/complete?return=${encodeURIComponent('/owner/campaign/new/info')}`
      );
      return;
    }
    router.push('/owner/campaign/new');
  };

  // ⭐ FIX-E: Loading state while checking KYC
  // (mencegah flicker preface-content saat akan auto-redirect)
  if (authLoading || kycChecking || (user && kycComplete === false)) {
    return (
      <div className="min-h-screen bg-[#f9f9f8] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-[#003526] mx-auto mb-3" size={32} />
          <p className="text-sm text-gray-600">
            {kycComplete === false ? 'Mengarahkan ke halaman verifikasi...' : 'Memuat...'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9f9f8]">

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-6 pt-10 pb-14 relative overflow-hidden">
        {/* Pink accent decoration */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#EC4899] rounded-full opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-[#EC4899] rounded-full opacity-5 blur-3xl"></div>

        <div className="mx-auto max-w-lg text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-5 border border-[#EC4899]/30">
            <span className="material-symbols-outlined text-[#F9A8D4] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
            <span className="text-xs font-bold text-[#F9A8D4] uppercase tracking-wider">BADONASI TeraLoka</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
            Galang Dana<br />untuk <span className="text-[#F472B6]">Sesama</span>
          </h1>
          <p className="mt-3 text-[#95d3ba] text-sm leading-relaxed max-w-sm mx-auto">
            Platform galang dana kemanusiaan untuk warga Maluku Utara. Transparan, terpercaya, dan <strong className="text-[#F472B6]">100% donasi sampai ke penerima</strong>.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { label: '100% Sampai Penerima', value: 'Rp 0', icon: 'money_off', sublabel: 'Potongan' },
              { label: 'Verifikasi KYC', value: '1-3 hari', icon: 'verified', sublabel: 'Estimasi' },
              { label: 'Review Campaign', value: '1×24 jam', icon: 'schedule', sublabel: 'Proses' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 border border-white/5">
                <span className="material-symbols-outlined text-[#F9A8D4] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                <p className="text-white font-extrabold text-base mt-1">{s.value}</p>
                <p className="text-[#95d3ba]/70 text-[10px] uppercase tracking-wide font-bold">{s.sublabel}</p>
                <p className="text-[#95d3ba]/60 text-[10px] mt-0.5 leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 -mt-5 pb-24 space-y-4">

        {/* Alur pendaftaran */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003526] text-lg">route</span>
            Alur Pendaftaran Campaign
          </h2>
          <div className="space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.num} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-9 h-9 rounded-full bg-[#003526] text-white flex items-center justify-center text-sm font-bold shrink-0">
                    {s.num}
                  </div>
                  {i < STEPS.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 mt-1 mb-0" style={{ minHeight: 24 }} />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="material-symbols-outlined text-[#003526] text-base">{s.icon}</span>
                    <p className="text-sm font-bold text-gray-900">{s.label}</p>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Syarat & ketentuan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003526] text-lg">checklist</span>
            Syarat Penggalang Dana
          </h2>
          <div className="space-y-3">
            {REQUIREMENTS.map(req => (
              <div key={req.title} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-[#003526]/8 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[#003526] text-base">{req.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{req.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{req.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Komitmen TeraLoka */}
        <div className="bg-[#003526]/5 border border-[#003526]/10 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-[#003526] mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            Komitmen TeraLoka BADONASI
          </h2>
          <ul className="space-y-2">
            {COMMITMENTS.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="material-symbols-outlined text-[#003526] text-sm shrink-0 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                {c}
              </li>
            ))}
          </ul>
        </div>

        {/* Perlindungan Data Identitas */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
          <h2 className="text-sm font-bold text-blue-900 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-base text-blue-600" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
            Perlindungan Data Identitas
          </h2>
          <p className="text-xs text-blue-900 leading-relaxed mb-3">
            <strong>TeraLoka memisahkan dokumen identitas (KTP/KK/Akta) dari dokumen bukti pendukung:</strong>
          </p>
          <div className="space-y-2.5">
            <div className="flex items-start gap-2.5 bg-white/60 rounded-lg p-3">
              <span className="material-symbols-outlined text-base shrink-0 text-red-600 mt-0.5">visibility_off</span>
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong className="font-bold">🔒 Identitas Penerima (RAHASIA)</strong>
                <br />
                Foto KTP, KK, Akta Kelahiran <strong>HANYA dilihat tim verifikasi TeraLoka</strong>. Tidak akan ditampilkan ke donor/publik. Disimpan terenkripsi sesuai UU PDP (Perlindungan Data Pribadi).
              </div>
            </div>
            <div className="flex items-start gap-2.5 bg-white/60 rounded-lg p-3">
              <span className="material-symbols-outlined text-base shrink-0 text-emerald-600 mt-0.5">visibility</span>
              <div className="text-xs text-blue-900 leading-relaxed">
                <strong className="font-bold">🌐 Dokumen Pendukung (PUBLIK)</strong>
                <br />
                Foto lokasi, surat dokter (KTP/NIK diblur), surat keterangan kelurahan — <strong>ditampilkan ke donor</strong> untuk transparansi dan kepercayaan.
              </div>
            </div>
          </div>
          <p className="text-[11px] text-blue-700 mt-3 italic leading-relaxed">
            ⚠️ Jangan upload KTP atau dokumen ber-NIK di bagian "Dokumen Pendukung". Saat upload bukti, redaksi/blur informasi sensitif terlebih dahulu.
          </p>
        </div>

        {/* Kategori yang diizinkan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003526] text-lg">category</span>
            Kategori yang Diizinkan
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { Icon: Stethoscope,   label: 'Kesehatan',       color: '#D85A30' },
              { Icon: CloudRainWind, label: 'Bencana',         color: '#378ADD' },
              { Icon: Flower,        label: 'Duka',            color: '#888780' },
              { Icon: Baby,          label: 'Anak Yatim',      color: '#E8963A' },
              { Icon: UserRound,     label: 'Lansia',          color: '#BA7517' },
              { Icon: Home,          label: 'Hunian Darurat',  color: '#0891B2' },
            ].map(c => {
              const CIcon = c.Icon;
              return (
                <div key={c.label} className="text-center bg-gray-50 rounded-xl p-3">
                  <div className="flex justify-center mb-1.5">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${c.color}15`, border: `0.5px solid ${c.color}40` }}>
                      <CIcon size={20} strokeWidth={2} style={{ color: c.color }} />
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-700">{c.label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-xs text-red-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">block</span>
              Campaign untuk tujuan komersial, bisnis, atau politik tidak diizinkan dan akan ditolak otomatis.
            </p>
          </div>
        </div>

        {/* Sistem Transparansi Dana — ENHANCED with anatomi 4 komponen */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003526] text-lg">bar_chart</span>
            Sistem Transparansi Dana
          </h2>
          <p className="text-xs text-gray-500 mb-4 leading-relaxed">
            Bagaimana donasi sampai ke penerima manfaat — transparent untuk donor dan penggalang.
          </p>

          {/* Anatomi Donasi — visual breakdown */}
          <div className="rounded-xl bg-gradient-to-br from-[#003526]/5 to-[#EC4899]/5 border border-[#003526]/10 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-[#EC4899] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>account_tree</span>
              <p className="text-xs font-extrabold text-[#003526] uppercase tracking-wider">
                Contoh: Donor donasi Rp 50.000
              </p>
            </div>

            {/* Visual flow */}
            <div className="bg-white rounded-lg p-3 mb-3">
              <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-2">
                Donor Transfer Total Rp 53.234:
              </p>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base">👤</span>
                    <p className="text-xs font-bold text-emerald-900">Penerima Manfaat</p>
                  </div>
                  <p className="text-sm font-extrabold text-emerald-700 whitespace-nowrap">Rp 50.000</p>
                </div>
                <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base">🏢</span>
                    <p className="text-[11px] text-gray-600">Fee TeraLoka <span className="text-[10px] text-gray-400">(operasional)</span></p>
                  </div>
                  <p className="text-xs font-bold text-gray-700 whitespace-nowrap">Rp 1.500</p>
                </div>
                <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-pink-50 border border-pink-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base">💪</span>
                    <p className="text-[11px] text-gray-600">Fee Penggalang <span className="text-[10px] text-[#EC4899] font-bold">(opt-in donor)</span></p>
                  </div>
                  <p className="text-xs font-bold text-[#BE185D] whitespace-nowrap">Rp 1.500</p>
                </div>
                <div className="flex items-center justify-between gap-2 py-1.5 px-2 rounded-md bg-blue-50 border border-blue-100">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="text-base">🔐</span>
                    <p className="text-[11px] text-gray-600">Kode Unik <span className="text-[10px] text-gray-400">(verifikasi)</span></p>
                  </div>
                  <p className="text-xs font-bold text-gray-700 whitespace-nowrap">Rp 234</p>
                </div>
              </div>
            </div>

            {/* Key callout */}
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
              <p className="text-xs font-extrabold text-emerald-900 mb-1 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
                Donasi UTUH 100% Sampai ke Penerima
              </p>
              <ul className="space-y-1 mt-2">
                <li className="text-[11px] text-emerald-800 flex items-start gap-1.5 leading-relaxed">
                  <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
                  <span>Fee operasional adalah <strong>TAMBAHAN</strong> dari donor — bukan dipotong dari donasi</span>
                </li>
                <li className="text-[11px] text-emerald-800 flex items-start gap-1.5 leading-relaxed">
                  <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
                  <span>Donor pilih sendiri untuk opt-in fee penggalang (default OFF)</span>
                </li>
                <li className="text-[11px] text-emerald-800 flex items-start gap-1.5 leading-relaxed">
                  <span className="text-emerald-600 mt-0.5 shrink-0">✓</span>
                  <span>Kode unik kecil untuk verifikasi otomatis transfer</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Compliance & monitoring */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2">
              Akuntabilitas & Pengawasan
            </p>
            {[
              { icon: 'receipt', text: 'Setiap donasi masuk tercatat dan dipublikasikan (dengan perlindungan privasi donatur)' },
              { icon: 'description', text: 'Laporan penggunaan dana wajib diupload dengan bukti transfer/kwitansi' },
              { icon: 'groups', text: 'Publik bisa memantau semua aktivitas dana di halaman transparansi campaign' },
              { icon: 'gavel', text: 'Campaign yang tidak submit laporan dalam 7 hari akan dibekukan sementara' },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="material-symbols-outlined text-[#003526] text-base shrink-0 mt-0.5">{item.icon}</span>
                <p className="text-xs text-gray-600 leading-relaxed">{item.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Agreement + CTA */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800">Persetujuan</h2>

          <label className="flex cursor-pointer items-start gap-3 bg-gray-50 rounded-xl p-4">
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#EC4899] shrink-0" />
            <span className="text-sm text-gray-700 leading-relaxed">
              Saya memahami dan menyetujui semua syarat, ketentuan, dan komitmen transparansi BADONASI TeraLoka di atas. Saya bertanggung jawab penuh atas kebenaran informasi dan penggunaan dana yang saya galang.
            </span>
          </label>

          <button onClick={handleLanjut} disabled={!agreed}
            className="w-full bg-gradient-to-r from-[#003526] to-[#BE185D] hover:from-[#1B6B4A] hover:to-[#EC4899] text-white py-4 rounded-2xl font-bold text-sm disabled:opacity-40 transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg">
            <span className="material-symbols-outlined text-lg">volunteer_activism</span>
            {user ? 'Saya Siap, Lanjut Buat Campaign →' : 'Login & Lanjut Buat Campaign →'}
          </button>

          {/* Trust signals */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {[
              { icon: 'verified', text: 'Verifikasi Gratis' },
              { icon: 'savings', text: 'Donasi Utuh' },
              { icon: 'visibility', text: 'Transparan 100%' },
            ].map(t => (
              <div key={t.text} className="text-center">
                <span className="material-symbols-outlined text-[#EC4899] text-base" style={{ fontVariationSettings: "'FILL' 1" }}>{t.icon}</span>
                <p className="text-[10px] text-gray-600 font-semibold mt-0.5 leading-tight">{t.text}</p>
              </div>
            ))}
          </div>

          {!user && (
            <p className="text-center text-xs text-gray-400">
              Belum punya akun?{' '}
              <Link href="/login" className="text-[#EC4899] font-semibold hover:underline">Daftar via WhatsApp</Link>
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 pb-4">
          Ada pertanyaan?{' '}
          <a href="https://wa.me/6281234567890" target="_blank" rel="noopener noreferrer"
            className="text-[#003526] font-semibold hover:underline">
            Hubungi Tim TeraLoka →
          </a>
        </p>
      </div>
    </div>
  );
}

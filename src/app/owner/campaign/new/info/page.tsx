'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

const REQUIREMENTS = [
  {
    icon: 'person',
    title: 'Warga Maluku Utara',
    desc: 'Penggalang dana adalah warga yang berdomisili atau terdaftar sebagai pengguna TeraLoka dengan nomor WA terverifikasi.',
  },
  {
    icon: 'volunteer_activism',
    title: 'Kategori Kemanusiaan',
    desc: 'Campaign hanya untuk kebutuhan kemanusiaan: kesehatan, bencana, duka/musibah, anak yatim, lansia, atau hunian darurat.',
  },
  {
    icon: 'account_balance',
    title: 'Rekening Komunitas Partner',
    desc: 'Dana masuk ke rekening komunitas/lembaga partner yang terpercaya — bukan rekening pribadi penggalang.',
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
  '100% donasi sampai ke penerima — tidak ada potongan platform',
  'Dana masuk langsung ke rekening komunitas partner',
  'Semua laporan penggunaan dana dipublikasikan secara terbuka',
  'Tim TeraLoka berhak menghentikan campaign jika ada pelanggaran',
  'Identitas donatur dilindungi sesuai preferensi mereka',
];

export default function CampaignInfoPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);

  const handleLanjut = () => {
    if (!agreed) return;
    if (user) {
      router.push('/owner/campaign/new');
    } else {
      router.push('/login?redirect=/owner/campaign/new');
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8]">

      {/* Hero */}
      <div className="bg-[#003526] px-6 pt-10 pb-14">
        <div className="mx-auto max-w-lg text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 mb-5">
            <span className="material-symbols-outlined text-[#95d3ba] text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>volunteer_activism</span>
            <span className="text-xs font-bold text-[#95d3ba] uppercase tracking-wider">BADONASI TeraLoka</span>
          </div>
          <h1 className="text-3xl font-extrabold text-white leading-tight tracking-tight">
            Galang Dana<br />untuk Sesama
          </h1>
          <p className="mt-3 text-[#95d3ba] text-sm leading-relaxed max-w-sm mx-auto">
            Platform galang dana kemanusiaan untuk warga Maluku Utara. Transparan, terpercaya, dan 100% dana sampai ke penerima.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-8">
            {[
              { label: 'Transparansi', value: '100%', icon: 'verified' },
              { label: 'Potongan Platform', value: 'Rp 0', icon: 'money_off' },
              { label: 'Proses Verifikasi', value: '1×24 jam', icon: 'schedule' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-3">
                <span className="material-symbols-outlined text-[#95d3ba] text-lg" style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                <p className="text-white font-extrabold text-base mt-1">{s.value}</p>
                <p className="text-[#95d3ba]/70 text-xs">{s.label}</p>
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

        {/* Kategori yang diizinkan */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003526] text-lg">category</span>
            Kategori yang Diizinkan
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { emoji: '🏥', label: 'Kesehatan' },
              { emoji: '🌊', label: 'Bencana' },
              { emoji: '🕊️', label: 'Duka' },
              { emoji: '👶', label: 'Anak Yatim' },
              { emoji: '👴', label: 'Lansia' },
              { emoji: '🏚️', label: 'Hunian Darurat' },
            ].map(c => (
              <div key={c.label} className="text-center bg-gray-50 rounded-xl p-3">
                <span className="text-2xl block mb-1">{c.emoji}</span>
                <p className="text-xs font-semibold text-gray-700">{c.label}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3">
            <p className="text-xs text-red-700 flex items-start gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">block</span>
              Campaign untuk tujuan komersial, bisnis, atau politik tidak diizinkan dan akan ditolak otomatis.
            </p>
          </div>
        </div>

        {/* Proses transparansi */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#003526] text-lg">bar_chart</span>
            Sistem Transparansi Dana
          </h2>
          <div className="space-y-2">
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
              className="mt-0.5 h-4 w-4 accent-[#003526] shrink-0" />
            <span className="text-sm text-gray-700 leading-relaxed">
              Saya memahami dan menyetujui semua syarat, ketentuan, dan komitmen transparansi BADONASI TeraLoka di atas. Saya bertanggung jawab penuh atas kebenaran informasi dan penggunaan dana yang saya galang.
            </span>
          </label>

          <button onClick={handleLanjut} disabled={!agreed}
            className="w-full bg-[#003526] text-white py-4 rounded-2xl font-bold text-sm disabled:opacity-40 transition-opacity flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-lg">volunteer_activism</span>
            {user ? 'Lanjut Buat Campaign →' : 'Login & Lanjut Buat Campaign →'}
          </button>

          {!user && (
            <p className="text-center text-xs text-gray-400">
              Belum punya akun?{' '}
              <Link href="/login" className="text-[#003526] font-semibold hover:underline">Daftar via WhatsApp</Link>
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

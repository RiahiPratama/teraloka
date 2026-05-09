/**
 * TeraLoka — Halaman Aturan Foto Bukti BALAPOR
 * BALAPOR Pre-Launch Polish — Day 2 Photo Policy Detail Page
 * ------------------------------------------------------------
 * Public route, SEO-indexable, mobile-first.
 *
 * Sections (per PRD-BALAPOR-v2.0 Section 7.3.2):
 *   1. Pengantar (kenapa aturan ini ada)
 *   2. Yang DIIZINKAN — dengan contoh
 *   3. Yang DILARANG — dengan contoh
 *   4. Konsekuensi pelanggaran
 *   5. Pengecualian khusus
 *   6. Hak pelapor
 *   7. Kontak admin
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aturan Foto Bukti BALAPOR — TeraLoka',
  description:
    'Panduan upload foto bukti laporan warga di BALAPOR TeraLoka. Lindungi privasi orang lain, hindari penolakan laporan, dan jadilah pelapor yang bertanggung jawab.',
  keywords: [
    'aturan foto BALAPOR',
    'panduan upload foto laporan',
    'kebijakan privasi TeraLoka',
    'lapor warga Maluku Utara',
  ],
  openGraph: {
    title: 'Aturan Foto Bukti BALAPOR — TeraLoka',
    description:
      'Panduan upload foto bukti laporan warga di BALAPOR TeraLoka.',
    type: 'article',
  },
};

const ALLOWED = [
  {
    icon: 'construction',
    title: 'Infrastruktur Fisik',
    desc: 'Jalan rusak, jembatan retak, got mampet, lampu jalan mati, tiang listrik miring, fasilitas umum yang rusak.',
  },
  {
    icon: 'park',
    title: 'Lingkungan',
    desc: 'Sampah liar, banjir, pencemaran air/udara, kerusakan alam, pohon tumbang, area kumuh.',
  },
  {
    icon: 'apartment',
    title: 'Bangunan dan Area Umum',
    desc: 'Gedung pemerintah, sekolah, pasar, terminal, pelabuhan, area publik tanpa orang yang teridentifikasi.',
  },
];

const PROHIBITED = [
  {
    icon: 'face',
    title: 'Wajah Orang Tanpa Persetujuan',
    desc: 'Wajah yang bisa dikenali (close-up, jelas terlihat) tanpa izin tertulis dari orang tersebut. Termasuk wajah pelaku, korban, atau saksi.',
    why: 'Privasi adalah hak. Foto wajah bisa berdampak hukum + sosial bagi orang yang difoto.',
  },
  {
    icon: 'directions_car',
    title: 'Plat Kendaraan',
    desc: 'Nomor plat kendaraan (mobil, motor, truk) yang teridentifikasi jelas — kecuali untuk pelanggaran lalu lintas spesifik.',
    why: 'Plat kendaraan bisa di-trace ke pemilik. Salah lapor = kriminalisasi orang yang gak bersalah.',
  },
  {
    icon: 'child_care',
    title: 'Anak di Bawah Umur',
    desc: 'Anak-anak (di bawah 18 tahun) dalam kondisi apapun, walaupun wajahnya gak jelas. Wajah bayi, balita, anak sekolah dasar/menengah dilarang keras.',
    why: 'UU Perlindungan Anak (UU 35/2014) larangan keras eksploitasi gambar anak. Ini ranah kriminal.',
  },
  {
    icon: 'description',
    title: 'Dokumen Pribadi',
    desc: 'KTP, KK, NPWP, kartu BPJS, paspor, akta lahir, ijazah, atau dokumen identitas pribadi lainnya yang teridentifikasi.',
    why: 'Bocoran dokumen pribadi = potensi pencurian identitas + penipuan.',
  },
];

const RIGHTS = [
  'Mengajukan permintaan hapus laporan kapan saja via "Laporan Saya"',
  'Edit foto laporan jika belum diverifikasi (dalam 24 jam pertama)',
  'Mendapat alasan jelas jika laporan ditolak admin',
  'Mengajukan banding jika merasa keputusan admin tidak tepat',
];

export default function AturanFotoBuktiPage() {
  return (
    <div className="min-h-screen bg-[#f9f9f8]">
      {/* Hero */}
      <div className="bg-gradient-to-br from-[#003526] via-[#003526] to-[#1B6B4A] px-6 pt-10 pb-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-[#EF4444]/12 blur-3xl -translate-y-1/3 translate-x-1/3"></div>

        <div className="relative mx-auto max-w-2xl text-center">
          <div className="inline-flex items-center gap-2 bg-gradient-to-r from-[#EF4444] to-[#DC2626] rounded-full px-4 py-2 mb-5 shadow-lg shadow-[#DC2626]/40">
            <span
              className="material-symbols-outlined text-white text-base"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              photo_camera
            </span>
            <span className="text-xs font-black text-white uppercase tracking-widest">
              ATURAN FOTO BUKTI
            </span>
          </div>

          <h1 className="text-[26px] sm:text-[32px] font-extrabold tracking-tight text-white leading-[1.2]">
            Lapor dengan <span className="text-[#EF4444]">Bertanggung Jawab</span>
          </h1>

          <p className="mt-3 text-sm text-[#95d3ba] leading-relaxed max-w-md mx-auto">
            Panduan upload foto bukti yang melindungi privasi orang lain.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-2xl px-4 pt-6 pb-10 space-y-5">
        {/* 1. Pengantar */}
        <section className="rounded-2xl bg-white shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-2 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#003526] text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              info
            </span>
            Kenapa Ada Aturan Ini?
          </h2>
          <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <p>
              BALAPOR TeraLoka adalah platform civic warga Maluku Utara — laporan
              kamu bisa naik jadi berita BAKABAR untuk public exposure. Karena
              foto laporan punya potensi tersebar luas, kami punya aturan ketat
              soal privasi.
            </p>
            <p>
              Aturan ini melindungi <strong>kamu sebagai pelapor</strong> dari
              tuntutan hukum, dan melindungi{' '}
              <strong>orang yang ada di foto</strong> dari pelanggaran privasi.
            </p>
          </div>
        </section>

        {/* 2. Yang Diizinkan */}
        <section className="rounded-2xl bg-white shadow-sm border border-emerald-200 p-5">
          <h2 className="text-base font-bold text-emerald-700 mb-3 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-emerald-600 text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            Yang DIIZINKAN
          </h2>
          <div className="space-y-3">
            {ALLOWED.map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-emerald-50/50 border border-emerald-100 p-3 flex items-start gap-3"
              >
                <div className="h-9 w-9 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                  <span
                    className="material-symbols-outlined text-emerald-700 text-base"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {item.icon}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-gray-900">
                    {item.title}
                  </h3>
                  <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 3. Yang Dilarang */}
        <section className="rounded-2xl bg-white shadow-sm border border-red-200 p-5">
          <h2 className="text-base font-bold text-[#DC2626] mb-3 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#DC2626] text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              block
            </span>
            Yang DILARANG
          </h2>
          <div className="space-y-3">
            {PROHIBITED.map((item) => (
              <div
                key={item.title}
                className="rounded-xl bg-red-50/50 border border-red-100 p-3"
              >
                <div className="flex items-start gap-3 mb-2">
                  <div className="h-9 w-9 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <span
                      className="material-symbols-outlined text-[#DC2626] text-base"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      {item.icon}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-gray-900">
                      {item.title}
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 ml-12">
                  <p className="text-xs text-amber-700 leading-relaxed">
                    <strong>Kenapa dilarang:</strong> {item.why}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 4. Konsekuensi */}
        <section className="rounded-2xl bg-white shadow-sm border border-amber-200 p-5">
          <h2 className="text-base font-bold text-amber-700 mb-3 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-amber-600 text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              gavel
            </span>
            Konsekuensi Jika Melanggar
          </h2>
          <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <p>Jika foto kamu melanggar aturan di atas:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 text-xs">
              <li>
                <strong>Laporan ditolak admin</strong> — gak naik ke verifikasi,
                gak naik BAKABAR
              </li>
              <li>
                <strong>Notifikasi alasan ditolak</strong> — kamu dapet pesan
                jelas via WA atau "Laporan Saya"
              </li>
              <li>
                <strong>Pelanggaran berulang</strong> — akun bisa di-suspend
                sementara
              </li>
              <li>
                <strong>Pelanggaran berat (anak/dokumen pribadi)</strong> —
                laporan dihapus permanen + akun di-banned
              </li>
            </ul>
            <p className="mt-3 text-xs text-gray-500 italic">
              Note: Admin TeraLoka selalu kasih alasan jelas. Kalau merasa
              keputusan gak tepat, kamu bisa ajukan banding.
            </p>
          </div>
        </section>

        {/* 5. Pengecualian */}
        <section className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-gray-700 text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              help
            </span>
            Pengecualian Khusus
          </h2>
          <div className="space-y-3 text-sm text-gray-700">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900 mb-1">
                Plat kendaraan untuk pelanggaran lalu lintas
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Boleh — selama foto fokus ke pelanggaran (parkir liar, melawan
                arah, melebihi batas tonase), bukan ke wajah pengendara.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900 mb-1">
                Foto pejabat publik dalam tugas
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Boleh — pejabat dalam kapasitas tugas resmi (rapat publik, sidak,
                acara pemerintahan) tidak punya ekspektasi privasi yang sama
                dengan warga sipil.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900 mb-1">
                Foto kerumunan tanpa identifikasi spesifik
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Boleh — kerumunan jauh dimana wajah individu gak jelas.
                Misal: foto demo, banjir di pasar (orang dari jauh).
              </p>
            </div>
          </div>
        </section>

        {/* 6. Hak Pelapor */}
        <section className="rounded-2xl bg-white shadow-sm border border-gray-200 p-5">
          <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span
              className="material-symbols-outlined text-[#003526] text-lg"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              shield
            </span>
            Hak Kamu sebagai Pelapor
          </h2>
          <ul className="space-y-2">
            {RIGHTS.map((right, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                <span
                  className="material-symbols-outlined text-emerald-600 text-base shrink-0 mt-0.5"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  check
                </span>
                <span className="leading-relaxed">{right}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 7. Kontak */}
        <section className="rounded-2xl bg-gradient-to-br from-[#003526] to-[#1B6B4A] p-5 text-center">
          <span
            className="material-symbols-outlined text-white text-3xl mb-2 inline-block"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            support_agent
          </span>
          <h2 className="text-base font-bold text-white mb-2">
            Punya Pertanyaan?
          </h2>
          <p className="text-sm text-[#95d3ba] mb-4 leading-relaxed">
            Tim BALAPOR siap bantu klarifikasi aturan ini. Hubungi kami untuk
            kasus ragu-ragu sebelum upload.
          </p>
          <Link
            href="/kontak"
            className="inline-flex items-center gap-2 bg-white text-[#003526] rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-gray-100 transition-colors"
          >
            <span className="material-symbols-outlined text-base">mail</span>
            Hubungi Tim TeraLoka
          </Link>
        </section>

        {/* CTA back to lapor */}
        <div className="text-center pt-2">
          <Link
            href="/balapor/buat-laporan"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#EF4444] hover:underline"
          >
            ← Lanjutkan Buat Laporan
          </Link>
        </div>
      </div>
    </div>
  );
}

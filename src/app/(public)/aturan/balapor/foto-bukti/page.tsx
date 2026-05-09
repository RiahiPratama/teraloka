/**
 * TeraLoka — Halaman Aturan Foto Bukti BALAPOR
 * BALAPOR Pre-Launch Polish — Day 2 Photo Policy Detail Page
 * Updated: 10 Mei 2026 — copy formalization (Pattern QQ)
 * ------------------------------------------------------------
 * Public route, SEO-indexable, mobile-first.
 * Path: /aturan/balapor/foto-bukti
 *
 * Sections (per PRD-BALAPOR-v2.0 Section 7.3.2):
 *   1. Pengantar (kenapa aturan ini ada)
 *   2. Yang DIIZINKAN — dengan contoh
 *   3. Yang DILARANG — dengan contoh
 *   4. Konsekuensi pelanggaran
 *   5. Pengecualian khusus
 *   6. Hak pelapor
 *   7. Kontak admin
 *
 * Tone: formal-tidak-kaku, target audiens pelapor Maluku Utara.
 */

import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Aturan Foto Bukti BALAPOR — TeraLoka',
  description:
    'Panduan unggah foto bukti laporan warga di BALAPOR TeraLoka. Lindungi privasi orang lain, hindari penolakan laporan, dan jadilah pelapor yang bertanggung jawab.',
  keywords: [
    'aturan foto BALAPOR',
    'panduan unggah foto laporan',
    'kebijakan privasi TeraLoka',
    'lapor warga Maluku Utara',
  ],
  openGraph: {
    title: 'Aturan Foto Bukti BALAPOR — TeraLoka',
    description:
      'Panduan unggah foto bukti laporan warga di BALAPOR TeraLoka.',
    type: 'article',
  },
};

const ALLOWED = [
  {
    icon: 'construction',
    title: 'Infrastruktur Fisik',
    desc: 'Jalan rusak, jembatan retak, got tersumbat, lampu jalan mati, tiang listrik miring, dan fasilitas umum yang rusak.',
  },
  {
    icon: 'park',
    title: 'Lingkungan',
    desc: 'Sampah liar, banjir, pencemaran air dan udara, kerusakan alam, pohon tumbang, serta area kumuh.',
  },
  {
    icon: 'apartment',
    title: 'Bangunan dan Area Umum',
    desc: 'Gedung pemerintah, sekolah, pasar, terminal, pelabuhan, dan area publik tanpa orang yang teridentifikasi.',
  },
];

const PROHIBITED = [
  {
    icon: 'face',
    title: 'Wajah Orang Tanpa Persetujuan',
    desc: 'Wajah yang dapat dikenali (close-up, jelas terlihat) tanpa izin tertulis dari orang tersebut. Termasuk wajah pelaku, korban, atau saksi.',
    why: 'Privasi adalah hak. Foto wajah dapat berdampak hukum dan sosial bagi orang yang difoto.',
  },
  {
    icon: 'directions_car',
    title: 'Plat Kendaraan',
    desc: 'Nomor plat kendaraan (mobil, motor, truk) yang teridentifikasi jelas, kecuali untuk pelanggaran lalu lintas spesifik.',
    why: 'Plat kendaraan dapat dilacak ke pemilik. Kesalahan dalam pelaporan berpotensi mengkriminalisasi orang yang tidak bersalah.',
  },
  {
    icon: 'child_care',
    title: 'Anak di Bawah Umur',
    desc: 'Anak-anak (di bawah 18 tahun) dalam kondisi apa pun, walaupun wajah tidak terlihat jelas. Wajah bayi, balita, anak sekolah dasar dan menengah dilarang keras.',
    why: 'UU Perlindungan Anak (UU 35/2014) melarang keras eksploitasi gambar anak. Hal ini termasuk ranah pidana.',
  },
  {
    icon: 'description',
    title: 'Dokumen Pribadi',
    desc: 'KTP, KK, NPWP, kartu BPJS, paspor, akta kelahiran, ijazah, atau dokumen identitas pribadi lainnya yang teridentifikasi.',
    why: 'Bocornya dokumen pribadi berpotensi menyebabkan pencurian identitas dan penipuan.',
  },
];

const RIGHTS = [
  'Mengajukan permintaan hapus laporan kapan saja melalui menu "Laporan Saya"',
  'Mengedit foto laporan apabila belum diverifikasi (dalam 24 jam pertama)',
  'Mendapatkan alasan jelas apabila laporan ditolak admin',
  'Mengajukan banding apabila merasa keputusan admin tidak tepat',
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
            Panduan unggah foto bukti yang melindungi privasi orang lain.
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
            Mengapa Aturan Ini Diperlukan?
          </h2>
          <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <p>
              BALAPOR TeraLoka adalah platform civic warga Maluku Utara. Laporan
              Anda dapat diangkat menjadi berita BAKABAR untuk publikasi yang
              lebih luas. Karena foto laporan memiliki potensi tersebar luas,
              kami memberlakukan aturan ketat mengenai privasi.
            </p>
            <p>
              Aturan ini melindungi <strong>Anda sebagai pelapor</strong> dari
              tuntutan hukum, sekaligus melindungi{' '}
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
                    <strong>Alasan:</strong> {item.why}
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
            Konsekuensi Apabila Melanggar
          </h2>
          <div className="space-y-2 text-sm text-gray-700 leading-relaxed">
            <p>Apabila foto Anda melanggar aturan di atas:</p>
            <ul className="list-disc list-inside space-y-1.5 ml-2 text-xs">
              <li>
                <strong>Laporan ditolak admin</strong> — tidak dilanjutkan ke
                verifikasi maupun publikasi BAKABAR
              </li>
              <li>
                <strong>Notifikasi alasan penolakan</strong> — Anda akan
                menerima pesan dengan alasan yang jelas melalui WhatsApp atau
                menu &ldquo;Laporan Saya&rdquo;
              </li>
              <li>
                <strong>Pelanggaran berulang</strong> — akun dapat ditangguhkan
                sementara
              </li>
              <li>
                <strong>Pelanggaran berat (anak atau dokumen pribadi)</strong> —
                laporan dihapus permanen dan akun diblokir
              </li>
            </ul>
            <p className="mt-3 text-xs text-gray-500 italic">
              Catatan: Admin TeraLoka selalu memberikan alasan penolakan yang
              jelas. Apabila merasa keputusan tidak tepat, Anda dapat
              mengajukan banding.
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
                Diperbolehkan, selama foto berfokus pada pelanggaran (parkir
                liar, melawan arah, melebihi batas tonase), bukan pada wajah
                pengendara.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900 mb-1">
                Foto pejabat publik dalam kapasitas tugas
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Diperbolehkan. Pejabat publik dalam kapasitas tugas resmi
                (rapat publik, sidak, acara pemerintahan) tidak memiliki
                ekspektasi privasi yang sama dengan warga sipil.
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="font-semibold text-gray-900 mb-1">
                Foto kerumunan tanpa identifikasi spesifik
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">
                Diperbolehkan. Foto kerumunan dari kejauhan di mana wajah
                individu tidak terlihat jelas. Contoh: foto demonstrasi atau
                banjir di pasar (subjek dari jarak jauh).
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
            Hak Anda sebagai Pelapor
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
            Memiliki Pertanyaan?
          </h2>
          <p className="text-sm text-[#95d3ba] mb-4 leading-relaxed">
            Tim BALAPOR siap membantu klarifikasi aturan ini. Silakan hubungi
            kami untuk konsultasi sebelum mengunggah foto.
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
            href="/reports/buat-laporan"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#EF4444] hover:underline"
          >
            ← Lanjutkan Buat Laporan
          </Link>
        </div>
      </div>
    </div>
  );
}

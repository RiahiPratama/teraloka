// TUJUAN: src/app/(public)/fundraising/badonasi/page.tsx
//   → URL: /fundraising/badonasi  (LP BADONASI — pintu LP saat launch)
//
// Server component (tanpa 'use client'): konten statik.
//   - FAQ & "Lihat jejak lengkap dana" pakai <details> native → no JS, no hydration.
//   - Animasi reveal/pulse via <style> + CSS (server-safe).
// Ikon: lucide-react. Warna: token semantic (badonasi/surface/text/border) +
//   arbitrary hex untuk bagian bespoke (hero gelap, section hijau, tint transparansi).
// Peta: <MalukuUtaraMap/> (geometri asli Maluku Utara, GeoJSON).
//
// CHROME GLOBAL: navbar & footer dipakai dari komponen global TeraLoka.
//   → Halaman ini TIDAK punya <header>/<footer> sendiri. Logo BADONASI ada di hero.
//   → Disclaimer legal BADONASI tetap dipertahankan di sini (band sebelum footer global),
//     karena footer global belum tentu memuatnya (kepatuhan UU 9/1961 jo. Permensos 8/2021).
//
// CTA ROUTE — single source of truth di bawah:
//   CREATE_CAMPAIGN : tujuan "Buat Campaign". Default mengikuti instruksi terbaru
//     (/fundraising/badonasi/galang-dana). CATATAN: versi lama LP ini memakai
//     '/owner/funding/campaigns/new/info' (gerbang KYC). Bila galang-dana belum
//     menggerbang KYC, ganti const ini ke route KYC tsb.
//   DONATE : tujuan "Donasi" → daftar campaign publik (/fundraising).

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Heart, HandHeart, MapPin, Sparkles, BadgeCheck, ShieldCheck, Wallet, Network,
  FileText, Smartphone, ClipboardCheck, Banknote, FileCheck, SearchCheck,
  Stethoscope, AlertTriangle, GraduationCap, Landmark, Store, Users,
  TrendingUp, ShoppingBag, ChevronDown, ArrowRight, Receipt,
} from 'lucide-react'
import MalukuUtaraMap from './_components/MalukuUtaraMap'
import RunningCampaigns from './_components/RunningCampaigns'

export const metadata: Metadata = {
  title: 'BADONASI — Torang Bantu Torang | TeraLoka Maluku Utara',
  description:
    'Platform gotong royong digital untuk warga Maluku Utara. Galang dana yang transparan, terverifikasi, dan dari kita untuk kita — non-custodial, donasi langsung ke rekening kampanye.',
}

// ── CTA routes (single source of truth) ─────────────────
const CREATE_CAMPAIGN = '/fundraising/badonasi/galang-dana'
const DONATE = '/fundraising'

// ── style tokens (bespoke) ──────────────────────────────
const HERO_BG =
  'linear-gradient(135deg,#1A1330 0%,#241842 46%,#3A1740 100%)'
const SH_SOFT = 'shadow-[0_22px_55px_-20px_rgba(33,26,29,0.22)]'
const SH_CARD = 'shadow-[0_10px_30px_-16px_rgba(33,26,29,0.14)]'
const SH_PINK = 'shadow-[0_18px_44px_-14px_rgba(190,24,93,0.40)]'

// ── data ────────────────────────────────────────────────
const KATEGORI = [
  { Icon: Stethoscope, t: 'Bantuan Medis', d: 'Biaya berobat, operasi, alat kesehatan.', bg: '#FDF2F8', fg: '#BE185D' },
  { Icon: AlertTriangle, t: 'Bencana Alam', d: 'Korban banjir, kebakaran, gempa.', bg: '#E2F3F6', fg: '#0B7A93' },
  { Icon: GraduationCap, t: 'Pendidikan', d: 'Anak-anak & fasilitas belajar.', bg: '#E7F2EC', fg: '#0F5138' },
  { Icon: Landmark, t: 'Rumah Ibadah', d: 'Renovasi & pembangunan.', bg: '#F8EEDF', fg: '#A26A1E' },
  { Icon: Store, t: 'UMKM & Ekonomi', d: 'Modal bangkit usaha warga.', bg: '#FDF2F8', fg: '#BE185D' },
  { Icon: Users, t: 'Kegiatan Sosial', d: 'Santunan & fasilitas publik.', bg: '#E2F3F6', fg: '#0B7A93' },
]

const STEPS = [
  { Icon: FileText, n: 1, t: 'Ajukan & diverifikasi', d: 'Ceritakan kebutuhan, target dana, dan rekeningmu. Unggah KTP & dokumen — tim memeriksa sebelum tayang.' },
  { Icon: Smartphone, n: 2, t: 'Warga donasi langsung', d: 'Donasi masuk langsung ke rekening kampanye yang kamu kelola. TeraLoka memfasilitasi, tidak menahan dana.' },
  { Icon: ClipboardCheck, n: 3, t: 'Salurkan & laporkan', d: 'Salurkan ke penerima sesuai kebutuhan, lalu unggah bukti & laporan penggunaan dana — terbuka untuk publik.' },
]

const TRUST = [
  { Icon: ShieldCheck, t: 'Non-custodial', d: 'Dana langsung ke rekening kampanye. TeraLoka tidak menahan, mencairkan, atau memiliki dana.' },
  { Icon: BadgeCheck, t: 'Diverifikasi', d: 'Identitas penggalang & kewajaran campaign diperiksa tim lokal sebelum tayang.' },
  { Icon: Wallet, t: 'Donasi utuh', d: 'Biaya layanan ditambahkan di atas donasi, bukan dipotong dari nominal ke penerima.' },
  { Icon: Network, t: 'Didukung TeraLoka', d: 'Terhubung ke ekosistem warga Malut — berpotensi diangkat & disebar lebih luas.' },
]

const FAQ = [
  { q: 'Apakah BADONASI benar-benar gratis?', a: 'Ya. Membuat campaign gratis — tanpa biaya pendaftaran. Ada biaya layanan kecil untuk operasional teknologi yang ditambahkan di atas donasi (ditanggung donatur secara sukarela), bukan dipotong dari donasi.' },
  { q: 'Bagaimana proses verifikasinya?', a: 'Tim memeriksa identitas penggalang (KTP/KK/Akta — disimpan terbatas) serta kelengkapan & kewajaran campaign sebelum tayang. Verifikasi mengurangi risiko, bukan menghilangkannya — “terverifikasi” bukan jaminan bebas penipuan.' },
  { q: 'Berapa biaya layanannya?', a: 'Biaya layanan operasional ditambahkan di atas nominal donasi, jadi donasi tetap utuh ke penerima. Ada juga dukungan opsional untuk penggalang yang hanya berlaku bila donatur memilih menambahkannya. Rinciannya transparan sebelum donasi diselesaikan.' },
  { q: 'Kapan dana disalurkan ke penerima?', a: 'Dana sepenuhnya hak penerima manfaat. Masuk langsung ke rekening kampanye yang dikelola penggalang sebagai pemegang amanah. Penggalang menyalurkan sesuai kebutuhan, lalu wajib mengunggah laporan & bukti. TeraLoka tidak menahan, mencairkan, atau memiliki dana.' },
  { q: 'Siapa yang bisa membuat campaign?', a: 'Warga Maluku Utara dengan akun TeraLoka & nomor WhatsApp terverifikasi, untuk kebutuhan kemanusiaan. Penggalang bertanggung jawab penuh atas kebenaran informasi & penggunaan dana.' },
  { q: 'Kalau ada masalah pada campaign?', a: 'Laporkan campaign mencurigakan lewat kanal yang tersedia. TeraLoka dapat menurunkan campaign & menghentikan akses penggalang bila ada pelanggaran. Karena dana tidak di TeraLoka, pemulihan dana di luar kendali kami — pilih & pantau dengan bijak.' },
]

// contoh transparansi (data ilustrasi yang konsisten: Cair = Dipakai)
const TIMELINE = [
  { kind: 'mulai', tag: 'MULAI', date: '18 Jun 2026', title: 'Campaign Dimulai', sub: 'Target Rp 40.000.000' },
  { kind: 'cair', tag: 'PENCAIRAN', date: '18 Jun 2026', title: 'Pencairan Tahap 1', amount: 'Rp 5.000.000', sub: 'Koordinator Lapangan' },
  { kind: 'pakai', tag: 'PENGGUNAAN', date: '19 Jun 2026 · dari Pencairan Tahap 1', title: 'Laporan Penggunaan Dana Tahap 1', sub: 'Dana tahap 1 dipakai untuk perlengkapan sekolah & biaya distribusi ke lokasi. Bukti & rincian terlampir.' },
  { kind: 'cair', tag: 'PENCAIRAN', date: '20 Jun 2026', title: 'Pencairan Tahap 2', amount: 'Rp 4.000.000', sub: 'Warga Terdampak' },
  { kind: 'pakai', tag: 'PENGGUNAAN', date: '21 Jun 2026 · dari Pencairan Tahap 2', title: 'Laporan Penggunaan Dana Tahap 2', sub: 'Dana tahap 2 dipakai untuk pakaian ibadah & bantuan sembako warga terdampak. Rincian lengkap di laporan.' },
] as const

const RINCIAN = [
  { no: '#1', total: 'Rp 5.000.000', title: 'Laporan Penggunaan Dana Tahap 1', rows: [['Beli Perlengkapan Sekolah', 'Pendidikan', 'Rp 3.500.000'], ['Biaya Distribusi & Transport', 'Operasional', 'Rp 1.500.000']] },
  { no: '#2', total: 'Rp 4.000.000', title: 'Laporan Penggunaan Dana Tahap 2', rows: [['Beli Pakaian & Perlengkapan Shalat', 'Pakaian', 'Rp 2.500.000'], ['Bantuan Sembako Warga', 'Konsumsi', 'Rp 1.500.000']] },
]

// tint timeline (light-only)
const tlColor = {
  cair: { dot: '#E8963A', tag: '#A26A1E', tagBg: '#FBF4E2', card: '#FCF8EE', border: '#F0E2C4', amount: '#A26A1E' },
  pakai: { dot: '#2B5FA8', tag: '#2B5FA8', tagBg: '#E9F1FC', card: '#F4F8FE', border: '#D3E2F6' },
  mulai: { dot: '#94A3B8', tag: '#64748B', tagBg: '#F1F5F9', card: '#F8FAFC', border: '#E5E7EB' },
} as const

export default function BadonasiLandingPage() {
  return (
    <div className="bg-[#F8FAFB] text-[#0F172A]">
      <style>{`
        @keyframes bd-rise{to{opacity:1;transform:none}}
        .bd-rv{opacity:0;transform:translateY(18px);animation:bd-rise .8s cubic-bezier(.2,.7,.2,1) forwards}
        @media(prefers-reduced-motion:reduce){.bd-rv{opacity:1;transform:none;animation:none}}
        details.bd-acc>summary{list-style:none}
        details.bd-acc>summary::-webkit-details-marker{display:none}
        details.bd-acc[open] .bd-chev{transform:rotate(180deg)}
      `}</style>

      {/* ══ HERO ══ */}
      <section className="relative overflow-hidden text-white" style={{ background: HERO_BG }}>
        {/* glow */}
        <div className="absolute -top-24 right-[8%] w-[34rem] h-[34rem] rounded-full blur-3xl" style={{ background: 'rgba(236,72,153,0.28)' }} />
        <div className="absolute -bottom-32 left-[14%] w-[26rem] h-[26rem] rounded-full blur-3xl" style={{ background: 'rgba(11,122,147,0.22)' }} />
        {/* peta Maluku Utara asli */}
        <MalukuUtaraMap color="#FF8CC8" pinColor="#FF2E94" opacity={0.85} className="hidden md:block absolute right-[-1%] top-[3%] w-[62%] h-auto pointer-events-none" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(110deg,rgba(26,19,48,.97) 30%,rgba(26,19,48,.5) 60%,rgba(58,23,64,.15))' }} />

        <div className="relative max-w-[1200px] mx-auto px-6 pt-12 pb-16 grid lg:grid-cols-[1.04fr_.96fr] gap-10 items-center">
          <div className="flex flex-col gap-5">
            {/* logo BADONASI (chrome dipindah ke hero) */}
            <div className="bd-rv flex items-center gap-2.5">
              <div className="w-[42px] h-[42px] rounded-[13px] grid place-items-center text-white" style={{ background: 'linear-gradient(135deg,#EC4899,#BE185D)' }}><HandHeart size={22} /></div>
              <div className="leading-none">
                <span className="font-sora font-extrabold text-[20px] text-white">BADONASI</span>
                <span className="block text-[10px] font-semibold tracking-[0.02em] text-white/60 mt-0.5">Torang Bantu Torang</span>
              </div>
            </div>

            <span className="bd-rv inline-flex items-center gap-2 w-fit rounded-full px-4 py-1.5 text-[12px] font-bold text-[#FFB3D8]" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.2)' }}>
              <Sparkles size={14} /> #TorangBantuTorang · Babak pertama dimulai dari kamu
            </span>

            <h1 className="bd-rv font-sora text-[clamp(42px,5.6vw,64px)] font-extrabold leading-[1.02] tracking-[-0.02em]" style={{ animationDelay: '.05s' }}>
              Kebaikan<br />Menyatukan<br /><span style={{ color: '#FF6FB3' }}>Kita Semua.</span>
            </h1>
            <p className="bd-rv text-[17px] text-white/75 max-w-[460px] leading-relaxed" style={{ animationDelay: '.1s' }}>
              Platform gotong royong digital untuk warga Maluku Utara. Belum ada campaign hari ini — <b className="text-white">kamu bisa jadi yang pertama</b> menyalakan titik kebaikan di peta ini.
            </p>

            <div className="bd-rv flex flex-wrap gap-3.5 pt-1" style={{ animationDelay: '.15s' }}>
              <Link href={CREATE_CAMPAIGN} className={`inline-flex items-center gap-2 text-white px-7 py-3.5 rounded-xl text-[15px] font-bold hover:scale-[1.03] active:scale-95 transition ${SH_PINK}`} style={{ background: 'linear-gradient(135deg,#EC4899,#BE185D)' }}>
                <Heart size={19} /> Buat Campaign Pertama
              </Link>
              <Link href={DONATE} className="inline-flex items-center gap-2 bg-white text-[#BE185D] px-7 py-3.5 rounded-xl text-[15px] font-bold hover:scale-[1.03] active:scale-95 transition shadow-[0_10px_28px_-12px_rgba(0,0,0,.5)]">
                <Heart size={18} /> Donasi Sekarang
              </Link>
              <a href="#cara" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl text-[15px] font-bold text-white transition hover:bg-white/[.18]" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.25)' }}>
                Cara Kerja <ArrowRight size={17} />
              </a>
            </div>
          </div>

          {/* mockup imageless (frame media) */}
          <div className="bd-rv hidden lg:block" style={{ animationDelay: '.1s' }}>
            <div className="mx-auto w-[270px] rounded-[34px] p-3 bg-white/[.06] border border-white/15 backdrop-blur-md">
              <div className="rounded-[26px] overflow-hidden bg-white">
                <div className="h-36 grid place-items-center relative" style={{ background: 'linear-gradient(140deg,#FDE3F0,#FAD1E6)' }}>
                  <Heart size={40} className="text-[#EC4899]/70" />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 bg-white/90 text-[#BE185D] text-[9.5px] font-extrabold tracking-wide px-2.5 py-1 rounded-full"><BadgeCheck size={11} /> TERVERIFIKASI</span>
                </div>
                <div className="p-4">
                  <p className="font-sora font-bold text-[14px] text-[#0F172A] leading-snug">Bantu biaya pengobatan tetangga torang</p>
                  <div className="mt-3 h-2 rounded-full bg-[#F1F5F9] overflow-hidden"><div className="h-full w-[58%] rounded-full" style={{ background: 'linear-gradient(90deg,#EC4899,#BE185D)' }} /></div>
                  <div className="flex justify-between text-[10.5px] text-[#64748B] mt-1.5"><span>Terkumpul</span><span>dari target</span></div>
                  <button className="w-full mt-3 py-2 rounded-[10px] text-white text-[12px] font-bold" style={{ background: 'linear-gradient(135deg,#EC4899,#BE185D)' }}>Donasi Sekarang</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STAT BAND (promise, bukan metrik) ══ */}
      <section className="px-6 -mt-8 relative z-10">
        <div className={`max-w-[1000px] mx-auto bg-white rounded-[24px] border border-[#E5E7EB] grid grid-cols-3 divide-x divide-[#E5E7EB] ${SH_CARD}`}>
          {[
            { v: '100%', l: 'Hak penerima manfaat', s: 'Non-custodial sejak hari pertama' },
            { v: 'Rp 0', l: 'Potongan dari donasi', s: 'Biaya di atas, bukan memotong' },
            { v: '∞', l: 'Potensi kebaikan', s: 'Sebanyak warga yang peduli' },
          ].map((x) => (
            <div key={x.l} className="px-4 py-7 text-center">
              <p className="font-sora text-[30px] md:text-[34px] font-extrabold text-[#EC4899] leading-none">{x.v}</p>
              <p className="text-[13px] font-bold text-[#0F172A] mt-2">{x.l}</p>
              <p className="text-[11px] text-[#64748B] mt-1 leading-snug">{x.s}</p>
            </div>
          ))}
        </div>
      </section>

      <main>
        {/* ══ KATEGORI ══ */}
        <section className="py-9 md:py-11 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="mb-7 max-w-[760px]">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#EC4899] mb-3 block">MULAI DARI HAL TERDEKAT</span>
              <h2 className="text-[clamp(26px,4vw,34px)] font-bold text-[#0F172A]">Apa saja yang bisa kamu galang?</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {KATEGORI.map(({ Icon, t, d, bg, fg }) => (
                <Link key={t} href={CREATE_CAMPAIGN} className={`group block bg-white rounded-2xl p-5 border border-[#E5E7EB] transition hover:-translate-y-1 ${SH_CARD}`}>
                  <div className="w-11 h-11 rounded-xl grid place-items-center mb-3" style={{ background: bg, color: fg }}><Icon size={22} /></div>
                  <h3 className="font-sora font-bold text-[16px] text-[#0F172A] mb-1">{t}</h3>
                  <p className="text-[13px] text-[#64748B] leading-relaxed">{d}</p>
                  <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-[#EC4899]">Galang untuk ini <ArrowRight size={13} className="transition group-hover:translate-x-0.5" /></p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ══ CAMPAIGN SEDANG BERJALAN / EMPTY STATE (auto show-hide via fetch) ══ */}
        <RunningCampaigns />

        {/* ══ FILOSOFI ══ */}
        <section className="py-9 md:py-11 px-6">
          <div className="max-w-[760px] mx-auto text-center">
            <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#EC4899] mb-4 block">FILOSOFI KAMI</span>
            <h2 className="text-[clamp(26px,4vw,38px)] font-bold leading-[1.18] text-[#0F172A]">Modernitas yang berakar<br />pada <span className="text-[#EC4899]">tradisi torang.</span></h2>
            <p className="text-[17px] text-[#64748B] leading-relaxed mt-4">Di Maluku Utara, &ldquo;Torang Bantu Torang&rdquo; bukan sekadar slogan — itu nafas kehidupan. Saat ada yang susah, kita kumpulkan bantuan lewat grup WhatsApp terbatas. Niatnya tulus, tapi sering tercecer dan susah dipercaya.</p>
            <p className="text-[17px] text-[#0F172A] font-semibold leading-relaxed mt-3">BADONASI mendigitalkan semangat itu — agar bantuan lebih rapi, lebih terbuka, dan menjangkau lebih banyak orang baik tanpa batas pulau.</p>
          </div>
        </section>

        {/* ══ CARA KERJA ══ */}
        <section id="cara" className="py-9 md:py-11 px-6 bg-[#F1F5F9] scroll-mt-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[760px] mx-auto mb-8">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#EC4899] mb-3 block">CARA KERJA</span>
              <h2 className="text-[clamp(26px,4vw,34px)] font-bold text-[#0F172A]">Tiga langkah, semua terbuka.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {STEPS.map(({ Icon, n, t, d }) => (
                <div key={n} className={`relative bg-white rounded-[20px] p-6 border border-[#E5E7EB] ${SH_CARD}`}>
                  <div className="w-12 h-12 rounded-2xl grid place-items-center mb-4 bg-[#FDF2F8] text-[#EC4899]"><Icon size={24} /></div>
                  <h3 className="font-sora font-bold text-[18px] text-[#0F172A] mb-2">{t}</h3>
                  <p className="text-[14px] text-[#64748B] leading-relaxed">{d}</p>
                  <span className="font-sora absolute -top-3.5 -right-3.5 w-9 h-9 rounded-full bg-white border-2 border-[#E5E7EB] grid place-items-center font-bold text-[#EC4899] text-[14px]">{n}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══ TRANSPARANSI (contoh) ══ */}
        <section id="transparansi" className="py-9 md:py-11 px-6 scroll-mt-24">
          <div className="max-w-[1100px] mx-auto">
            <div className="text-center max-w-[720px] mx-auto mb-9">
              <span className="inline-flex items-center gap-2 bg-[#FDF2F8] text-[#BE185D] px-4 py-1.5 rounded-full text-[11px] font-extrabold tracking-[0.04em]">CONTOH TRANSPARANSI · DEMO</span>
              <h2 className="text-[clamp(26px,4vw,34px)] font-bold text-[#0F172A] mt-4">Transparansi yang nyata, bukan janji.</h2>
              <p className="text-[14.5px] text-[#64748B] mt-2 leading-relaxed">Begini detail yang akan kamu lihat di tiap campaign — setiap rupiah tercatat, dari donasi masuk sampai dipakai oleh penerima.</p>
            </div>

            <div className={`bg-white rounded-[24px] border border-[#E5E7EB] p-6 md:p-8 ${SH_SOFT}`}>
              {/* ALIRAN DANA */}
              <div className="flex items-center gap-2.5"><Banknote size={22} className="text-[#0F172A]" /><h3 className="font-sora text-[18px] font-extrabold tracking-[0.01em]">ALIRAN DANA</h3></div>
              <p className="text-[13px] text-[#64748B] mt-2 leading-relaxed max-w-[760px]">Transparansi perjalanan dana — dari donasi masuk ke rekening kampanye, sampai penyaluran ke penerima oleh penggalang. Semua dalam angka.</p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5">
                <div className="rounded-[18px] p-5 text-center" style={{ background: '#E9F6EE', border: '1px solid #CDE9D8' }}>
                  <p className="text-[12px] font-extrabold tracking-[0.04em] inline-flex items-center gap-1 justify-center" style={{ color: '#1B6B4A' }}><TrendingUp size={13} /> TERKUMPUL</p>
                  <p className="font-sora text-[26px] font-extrabold mt-1.5" style={{ color: '#1B6B4A' }}>Rp 12.500.000</p>
                  <p className="text-[12px] mt-1" style={{ color: '#3E7C5E' }}>dari 47 donatur</p>
                </div>
                <div className="rounded-[18px] p-5 text-center" style={{ background: '#FBF4E2', border: '1px solid #F0E2C4' }}>
                  <p className="text-[12px] font-extrabold tracking-[0.04em] inline-flex items-center gap-1 justify-center" style={{ color: '#A26A1E' }}><Wallet size={13} /> CAIR</p>
                  <p className="font-sora text-[26px] font-extrabold mt-1.5" style={{ color: '#A26A1E' }}>Rp 9.000.000</p>
                  <p className="text-[12px] mt-1" style={{ color: '#A98039' }}>2 tahap</p>
                </div>
                <div className="rounded-[18px] p-5 text-center" style={{ background: '#E9F1FC', border: '1px solid #D3E2F6' }}>
                  <p className="text-[12px] font-extrabold tracking-[0.04em] inline-flex items-center gap-1 justify-center" style={{ color: '#2B5FA8' }}><ShoppingBag size={13} /> DIPAKAI</p>
                  <p className="font-sora text-[26px] font-extrabold mt-1.5" style={{ color: '#2B5FA8' }}>Rp 9.000.000</p>
                  <p className="text-[12px] mt-1" style={{ color: '#4D77B5' }}>2 laporan</p>
                </div>
              </div>
              <p className="text-[12px] text-[#64748B] mt-3 leading-relaxed">
                <b className="text-[#334155]">Cair</b> = dana ditarik ke lapangan · <b className="text-[#334155]">Dipakai</b> = sudah ada laporan rincian. Di campaign ini keduanya sama besar — <b style={{ color: '#1B6B4A' }}>setiap rupiah yang cair sudah dilaporkan penggunaannya.</b>
              </p>
              <div className="rounded-[18px] p-6 text-center mt-4" style={{ background: '#F3EEFB', border: '1px solid #E0D3F4' }}>
                <p className="text-[12px] font-extrabold tracking-[0.04em] inline-flex items-center gap-1 justify-center" style={{ color: '#6B3FA0' }}><ShieldCheck size={13} /> SISA BELUM DISALURKAN</p>
                <p className="font-sora text-[30px] font-extrabold mt-1.5" style={{ color: '#6B3FA0' }}>Rp 3.500.000</p>
                <p className="text-[13px] mt-2 leading-relaxed max-w-[620px] mx-auto" style={{ color: '#7C5BA8' }}>Tersimpan di rekening penggalang. Akan disalurkan oleh penggalang saat campaign mencapai milestone berikutnya atau sesuai kebutuhan penerima.</p>
              </div>

              {/* collapsible: jejak lengkap */}
              <details className="bd-acc group mt-5">
                <summary className="cursor-pointer w-full bg-white border border-[#E5E7EB] rounded-[14px] py-3.5 font-bold text-[14px] flex items-center justify-center gap-2 hover:bg-[#F1F5F9] transition">
                  Lihat jejak lengkap dana <ChevronDown size={17} className="bd-chev text-[#EC4899] transition-transform" />
                </summary>

                <div className="grid lg:grid-cols-2 gap-8 mt-6 pt-6 border-t border-[#E5E7EB]">
                  {/* TIMELINE */}
                  <div className="ml-1.5 border-l-2 border-[#E5E7EB]">
                    {TIMELINE.map((it, i) => {
                      const c = tlColor[it.kind as keyof typeof tlColor]
                      const last = i === TIMELINE.length - 1
                      return (
                        <div key={i} className={`relative ${last ? 'pb-0.5' : 'pb-6'} pl-7`}>
                          <span className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full border-[3px] border-white" style={{ background: c.dot }} />
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10.5px] font-extrabold px-2.5 py-0.5 rounded-full" style={{ color: c.tag, background: c.tagBg }}>{it.tag}</span>
                            <span className="text-[12px] text-[#94A3B8]">{it.date}</span>
                          </div>
                          <div className="rounded-[14px] p-3.5 mt-2.5" style={{ background: c.card, border: `1px solid ${c.border}` }}>
                            <div className="flex justify-between items-baseline gap-2">
                              <p className="font-sora text-[15px] font-bold text-[#0F172A]">{it.title}</p>
                              {'amount' in it && it.amount && <p className="font-sora text-[15px] font-extrabold" style={{ color: '#A26A1E' }}>{it.amount}</p>}
                            </div>
                            <p className="text-[13px] text-[#64748B] mt-1 leading-relaxed">{it.sub}</p>
                            {it.kind === 'cair' && <p className="text-[12.5px] font-semibold mt-2 inline-flex items-center gap-1" style={{ color: c.tag }}><FileCheck size={13} /> Lihat bukti transfer</p>}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* RINCIAN */}
                  <div>
                    <div className="flex items-center gap-2.5"><Receipt size={20} className="text-[#2B5FA8]" /><h3 className="font-sora text-[16px] font-extrabold tracking-[0.01em]">RINCIAN PENGGUNAAN DANA</h3></div>
                    <p className="text-[13px] text-[#64748B] mt-1.5 leading-relaxed">Breakdown detail per pos pengeluaran — apa, berapa, untuk siapa.</p>
                    {RINCIAN.map((r) => (
                      <div key={r.no} className="rounded-[18px] p-5 mt-4" style={{ background: '#F4F8FE', border: '1px solid #D3E2F6' }}>
                        <div className="flex justify-between items-baseline gap-2">
                          <p className="text-[11.5px] font-extrabold tracking-[0.04em]" style={{ color: '#2B5FA8' }}>LAPORAN {r.no}</p>
                          <p className="font-sora text-[20px] font-extrabold" style={{ color: '#2B5FA8' }}>{r.total}</p>
                        </div>
                        <p className="font-sora text-[16px] font-bold text-[#0F172A] mt-1">{r.title}</p>
                        <div className="bg-white border border-[#E5E7EB] rounded-[14px] p-4 mt-3">
                          <p className="text-[11px] font-extrabold tracking-[0.06em] text-[#94A3B8]">BREAKDOWN</p>
                          {r.rows.map(([name, cat, amt]) => (
                            <div key={name} className="flex justify-between items-center gap-2.5 mt-2.5">
                              <p className="text-[13.5px] text-[#0F172A]">{name} <span className="text-[#94A3B8]">· {cat}</span></p>
                              <p className="font-sora text-[14px] font-bold tabular-nums whitespace-nowrap text-[#0F172A]">{amt}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            </div>
            <p className="text-center text-[11.5px] text-[#94A3B8] italic mt-4">Data di atas ilustrasi satu campaign — begini transparansi yang kamu dapat. Live: tampil dari campaign nyata, atau disembunyikan saat belum ada.</p>
          </div>
        </section>

        {/* ══ TRUST PROOF ══ */}
        <section className="py-9 md:py-11 px-6 bg-[#F1F5F9]">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[760px] mx-auto mb-8">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#EC4899] mb-3 block">KENAPA PERCAYA SEJAK HARI PERTAMA</span>
              <h2 className="text-[clamp(26px,4vw,34px)] font-bold text-[#0F172A]">Bukan ramai dulu baru bisa dipercaya.</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {TRUST.map(({ Icon, t, d }) => (
                <div key={t} className={`bg-white rounded-2xl p-5 border border-[#E5E7EB] ${SH_CARD}`}>
                  <div className="w-11 h-11 rounded-xl grid place-items-center mb-3 bg-[#FDF2F8] text-[#EC4899]"><Icon size={22} /></div>
                  <h3 className="font-sora font-bold text-[15.5px] text-[#0F172A] mb-1.5">{t}</h3>
                  <p className="text-[13px] text-[#64748B] leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
            {/* honesty + links (dipertahankan dari versi lama, kepatuhan) */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <p className="text-[12.5px] text-[#64748B] text-center max-w-[560px] leading-relaxed">Verifikasi <b className="text-[#334155]">mengurangi</b> risiko, bukan menghilangkan — &ldquo;terverifikasi&rdquo; bukan jaminan bebas penipuan.</p>
              <div className="flex gap-2.5">
                <Link href="/aturan/badonasi/ketentuan" className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-4 py-2.5 text-[12.5px] font-bold text-[#0F172A] hover:bg-[#F1F5F9] transition"><FileText size={15} /> Ketentuan</Link>
                <Link href="/fundraising/standar-verifikasi" className="inline-flex items-center gap-2 bg-white border border-[#E5E7EB] rounded-full px-4 py-2.5 text-[12.5px] font-bold text-[#0F172A] hover:bg-[#F1F5F9] transition"><SearchCheck size={15} /> Standar Verifikasi</Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══ DARI KITA UNTUK KITA ══ */}
        <section className="py-9 md:py-11 px-6 text-white relative overflow-hidden" style={{ background: '#0F5138' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px,#fff 1px,transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="max-w-[1200px] mx-auto relative grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#FF8CC8] mb-4 block">DARI KITA, UNTUK KITA</span>
              <h2 className="text-[clamp(26px,3.6vw,38px)] font-bold leading-[1.12]">Kebaikan yang dekat,<br />dari tetangga torang sendiri.</h2>
              <p className="text-[16px] text-white/70 leading-relaxed mt-6 max-w-[460px]">Bukan platform jauh yang tak kenal kondisi di sini. BADONASI tumbuh dari Maluku Utara — dari Ternate, Tidore, Halmahera, sampai pelosok kepulauan. Kebaikanmu sampai ke yang benar-benar dekat.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { Icon: Users, t: 'Warga & relawan lokal', d: 'Yang paham betul kebutuhan di sekitar.' },
                { Icon: MapPin, t: 'Jangkau pelosok', d: 'Dari kota hingga kampung di kepulauan.' },
                { Icon: Heart, t: 'Gotong royong', d: 'Semangat saling bantu yang sudah mengakar.' },
                { Icon: Network, t: 'Satu ekosistem', d: 'Terhubung ke layanan warga TeraLoka.' },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="bg-white/[.08] border border-white/[.12] rounded-2xl p-5">
                  <Icon size={24} className="text-[#FF8CC8]" />
                  <p className="font-sora font-bold text-[15px] mt-2">{t}</p>
                  <p className="text-[12px] text-white/60 mt-1">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <p className="max-w-[1200px] mx-auto relative text-[12px] text-white/45 italic mt-8">* Peliputan atau penyebaran lewat ekosistem TeraLoka bersifat editorial &amp; independen — sebuah potensi, bukan jaminan.</p>
        </section>

        {/* ══ FAQ (semua tertutup) ══ */}
        <section id="faq" className="py-9 md:py-11 px-6 scroll-mt-24">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[760px] mx-auto mb-8">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#EC4899] mb-3 block">PERTANYAAN UMUM</span>
              <h2 className="text-[clamp(26px,4vw,34px)] font-bold text-[#0F172A]">Transparan sejak pertanyaan pertama.</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto items-start">
              {FAQ.map((item, i) => (
                <details key={i} className={`bd-acc group bg-white border border-[#E5E7EB] rounded-2xl ${SH_CARD}`}>
                  <summary className="cursor-pointer p-5 font-bold text-[15px] text-[#0F172A] flex justify-between items-center gap-3">
                    {item.q}
                    <ChevronDown size={18} className="bd-chev text-[#EC4899] transition-transform shrink-0" />
                  </summary>
                  <div className="px-5 pb-5 text-[13.5px] text-[#64748B] leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ══ FINAL CTA ══ */}
        <section className="px-6 py-9 md:py-11">
          <div className={`max-w-[1200px] mx-auto rounded-[34px] p-8 md:p-12 text-center relative overflow-hidden ${SH_PINK}`} style={{ background: 'linear-gradient(135deg,#EC4899 0%,#BE185D 60%,#9D174D 100%)' }}>
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/12 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/[.08] rounded-full -ml-20 -mb-20 blur-3xl" />
            <div className="relative space-y-4">
              <div className="text-[42px]">🩷</div>
              <h2 className="text-[clamp(26px,4vw,42px)] font-extrabold text-white leading-tight max-w-2xl mx-auto">Kenal seseorang yang butuh uluran tangan?</h2>
              <p className="text-[16px] text-white/85 max-w-lg mx-auto">Jadilah jembatan bantuan pertama di Maluku Utara. Gratis, diverifikasi, dan kamu didampingi.</p>
              <div className="pt-3 flex flex-wrap gap-3 justify-center">
                <Link href={CREATE_CAMPAIGN} className="bg-white text-[#BE185D] inline-flex items-center gap-2 px-9 py-4 rounded-full text-[16px] font-bold hover:scale-105 transition shadow-xl">
                  <Heart size={19} /> Buat Campaign Sekarang
                </Link>
                <Link href={DONATE} className="inline-flex items-center gap-2 px-8 py-4 rounded-full text-[16px] font-bold text-white border border-white/40 hover:bg-white/10 transition">
                  Lihat Campaign <ArrowRight size={18} />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ══ DISCLAIMER LEGAL (kepatuhan — dipertahankan; footer global belum tentu memuat) ══ */}
        <section className="px-6 pb-12">
          <div className="max-w-[1200px] mx-auto border-t border-[#E5E7EB] pt-6">
            <p className="text-[11.5px] leading-relaxed text-[#64748B]">
              <span className="font-bold text-[#334155]">Pemberitahuan.</span> BADONASI adalah fasilitator teknologi yang mempertemukan penggalang dana warga dengan donatur.
              TeraLoka <b className="text-[#334155]">bukan penyelenggara pengumpulan uang atau barang</b> dan tidak menghimpun, menyimpan, menyalurkan,
              atau memiliki dana donasi — donasi masuk langsung ke rekening kampanye yang dikelola penggalang.
              Tanggung jawab atas kebenaran informasi, penyaluran dana, serta pemenuhan ketentuan yang berlaku (termasuk perizinan bila disyaratkan)
              sepenuhnya berada pada penggalang. Verifikasi mengurangi, tetapi tidak menghilangkan, risiko — &ldquo;terverifikasi&rdquo; bukan jaminan.
              Dengan membuat campaign, penggalang menyetujui{' '}
              <Link href="/aturan/badonasi/ketentuan" className="text-[#EC4899] font-semibold hover:underline">Ketentuan BADONASI</Link>.
            </p>
          </div>
        </section>
      </main>
    </div>
  )
}

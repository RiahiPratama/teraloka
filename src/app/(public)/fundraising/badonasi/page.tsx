// TUJUAN: src/app/(public)/fundraising/badonasi/page.tsx
//   → URL: /fundraising/badonasi  (LP BADONASI — pasang ini jadi pintu LP saat launch)
//
// Server component (tanpa 'use client'): konten statik, FAQ pakai <details> native (no JS).
// Ikon: lucide-react (konsisten dgn komponen lain). Warna: Tailwind arbitrary hex (aman di v4).
// Font heading: Sora via inline style. Gradient/shadow: inline style + arbitrary class.
//
// CATATAN:
// - Foto hero masih placeholder → ganti dgn <img>/next/image berlisensi/izin.
// - Saat launch: arahkan navbar "BADONASI" ke /fundraising/badonasi (bukan /fundraising).
// - Semua CTA "Mulai/Buat Galang Dana" → /owner/funding/campaigns/new/info (gerbang KYC + persetujuan).

import type { Metadata } from 'next'
import Link from 'next/link'
import {
  Heart, HandHeart, MapPin, BadgeCheck, ReceiptText, PiggyBank, Wallet, Megaphone,
  FileText, Smartphone, ClipboardCheck, Banknote, ArrowDown, FileCheck, Shield,
  SearchCheck, Network, CheckCircle2, Newspaper, MessageSquare, Building2, Store,
  Image as ImageIcon, PenTool, PlusCircle, Users, AlertTriangle, GraduationCap,
  Landmark, Stethoscope, Map, Handshake, ChevronDown, ArrowRight,
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'BADONASI — Torang Bantu Torang | TeraLoka Maluku Utara',
  description:
    'Platform gotong royong digital untuk warga Maluku Utara. Buat campaign galang dana yang transparan, terverifikasi, dan dari kita untuk kita.',
}

// ── tokens ──────────────────────────────────────────────
const gRose = { background: 'linear-gradient(135deg,#D6006E,#A80057)' }
const gGreen = { background: 'linear-gradient(150deg,#1B6B4A,#0F5138)' }
const gWarm = { background: 'linear-gradient(150deg,#C8893A,#A80057)' }
const sora = { fontFamily: 'Sora, sans-serif', letterSpacing: '-0.025em' } as const

const SH_SOFT = 'shadow-[0_22px_55px_-20px_rgba(33,26,29,0.22)]'
const SH_CARD = 'shadow-[0_10px_30px_-16px_rgba(33,26,29,0.16)]'
const SH_ROSE = 'shadow-[0_18px_44px_-14px_rgba(168,0,87,0.32)]'

const NEW_CAMPAIGN = '/owner/funding/campaigns/new/info'

const KATEGORI = [
  { Icon: Stethoscope, t: 'Bantuan Medis', d: 'Biaya berobat, operasi, atau alat kesehatan warga.', bg: '#FDEFF6', fg: '#D6006E' },
  { Icon: AlertTriangle, t: 'Bencana Alam', d: 'Tanggap darurat kebakaran, banjir, atau gempa di Malut.', bg: '#E2F3F6', fg: '#0B7A93' },
  { Icon: GraduationCap, t: 'Pendidikan', d: 'Beasiswa anak yatim atau perbaikan ruang kelas.', bg: '#E7F2EC', fg: '#0F5138' },
  { Icon: Landmark, t: 'Rumah Ibadah', d: 'Renovasi masjid, gereja, atau fasilitas ibadah warga.', bg: '#F8EEDF', fg: '#C8893A' },
  { Icon: Store, t: 'UMKM & Ekonomi', d: 'Modal bangkit UMKM warga yang terdampak musibah.', bg: '#FDEFF6', fg: '#D6006E' },
  { Icon: Users, t: 'Kegiatan Sosial', d: 'Santunan, kegiatan komunitas, atau fasilitas publik desa.', bg: '#E2F3F6', fg: '#0B7A93' },
]

const FAQ = [
  { q: 'Apakah BADONASI benar-benar gratis?', a: 'Ya. Membuat campaign gratis — tanpa biaya pendaftaran. Ada biaya layanan kecil untuk operasional teknologi yang ditambahkan di atas donasi (ditanggung donatur secara sukarela), bukan dipotong dari donasi.' },
  { q: 'Bagaimana proses verifikasinya?', a: 'Tim memeriksa identitas penggalang (KTP/KK/Akta — disimpan terbatas) serta kelengkapan & kewajaran campaign (mis. dokumen pendukung kebutuhan) sebelum tayang. Verifikasi mengurangi risiko, bukan menghilangkannya — "terverifikasi" bukan jaminan bebas penipuan.' },
  { q: 'Berapa biaya layanannya?', a: 'Biaya layanan operasional ditambahkan di atas nominal donasi, jadi donasi tetap utuh ke penerima. Ada juga dukungan opsional untuk penggalang yang hanya berlaku bila donatur memilih menambahkannya. Rinciannya transparan sebelum donasi diselesaikan.' },
  { q: 'Kapan dana disalurkan ke penerima?', a: 'Dana sepenuhnya hak penerima manfaat — bukan milik penggalang maupun TeraLoka. Masuk langsung ke rekening kampanye yang dikelola penggalang sebagai pemegang amanah. Penggalang menyalurkan sesuai kebutuhan, lalu wajib mengunggah laporan & bukti. TeraLoka tidak menahan, mencairkan, atau memiliki dana.' },
  { q: 'Siapa yang bisa membuat campaign?', a: 'Warga Maluku Utara dengan akun TeraLoka & nomor WhatsApp terverifikasi, untuk kebutuhan kemanusiaan. Penggalang bertanggung jawab penuh atas kebenaran informasi & penggunaan dana, termasuk memenuhi kewajiban yang berlaku atas kegiatannya.' },
  { q: 'Kalau ada masalah pada campaign?', a: 'Laporkan campaign mencurigakan lewat kanal yang tersedia. TeraLoka dapat menurunkan campaign & menghentikan akses penggalang bila ada pelanggaran. Karena dana tidak di TeraLoka, pemulihan dana di luar kendali kami — pilih & pantau dengan bijak. Penyalahgunaan dana berimplikasi pidana & jadi tanggung jawab penggalang.' },
]

export default function BadonasiLandingPage() {
  return (
    <div className="bg-[#FBF8F4] text-[#211A1D]">
      <style>{`
        @keyframes bd-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-11px)}}
        .bd-floaty{animation:bd-float 3.8s ease-in-out infinite}
        .bd-floaty2{animation:bd-float 4.4s ease-in-out infinite;animation-delay:1.1s}
        @keyframes bd-rise{to{opacity:1;transform:none}}
        .bd-rv{opacity:0;transform:translateY(18px);animation:bd-rise .8s cubic-bezier(.2,.7,.2,1) forwards}
      `}</style>

      {/* NAV */}
      <header className="sticky top-0 z-50 bg-[#FBF8F4]/85 backdrop-blur-xl border-b border-[#ECE2E6]">
        <nav className="max-w-[1200px] mx-auto px-6 h-[74px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl grid place-items-center text-white" style={gRose}><HandHeart size={20} /></div>
            <div className="leading-none">
              <span className="font-extrabold text-[18px] text-[#211A1D]" style={sora}>BADONASI</span>
              <span className="block text-[8.5px] font-bold tracking-[0.24em] text-[#988A8F] mt-1">TERALOKA</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-9 text-[14.5px] font-semibold text-[#6B5B61]">
            <a href="#cara" className="hover:text-[#D6006E] transition-colors">Cara Kerja</a>
            <a href="#transparansi" className="hover:text-[#D6006E] transition-colors">Transparansi</a>
            <a href="#ekosistem" className="hover:text-[#D6006E] transition-colors">Ekosistem</a>
            <a href="#faq" className="hover:text-[#D6006E] transition-colors">FAQ</a>
          </div>
          <Link href={NEW_CAMPAIGN} className={`text-white px-5 py-2.5 rounded-full text-[14px] font-bold hover:opacity-90 active:scale-95 transition ${SH_ROSE}`} style={gRose}>
            Mulai Galang Dana
          </Link>
        </nav>
      </header>

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden">
          <div className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full bg-[#D6006E]/5 blur-3xl" />
          <div className="absolute top-40 -left-32 w-96 h-96 rounded-full bg-[#0F5138]/5 blur-3xl" />
          <div className="max-w-[1200px] mx-auto px-6 pt-3 pb-8 md:pt-4 md:pb-10 grid lg:grid-cols-2 gap-8 items-center relative">
            <div className="space-y-4">
              <div className="bd-rv inline-flex items-center gap-2 bg-[#E7F2EC] text-[#0F5138] px-4 py-2 rounded-full">
                <MapPin size={16} />
                <span className="text-[12px] font-extrabold tracking-[0.04em]">GRATIS · KHUSUS WARGA MALUKU UTARA</span>
              </div>
              <h1 className="bd-rv text-[clamp(44px,6.5vw,72px)] font-extrabold leading-[1.0] text-[#211A1D]" style={{ ...sora, animationDelay: '.05s' }}>
                Torang Bantu<br /><span className="text-[#D6006E]">Torang.</span>
              </h1>
              <p className="bd-rv text-[18px] text-[#6B5B61] max-w-[480px] leading-relaxed" style={{ animationDelay: '.1s' }}>
                Kenal keluarga, tetangga, sekolah, rumah ibadah, atau UMKM yang butuh bantuan? Buat campaign galang dana — jadi pionir gotong royong digital di Maluku Utara.
              </p>
              <div className="bd-rv flex flex-wrap gap-3.5 pt-1" style={{ animationDelay: '.15s' }}>
                <Link href={NEW_CAMPAIGN} className={`text-white px-8 py-4 rounded-full text-[15px] font-bold hover:scale-[1.03] active:scale-95 transition flex items-center gap-2 ${SH_ROSE}`} style={gRose}>
                  <Heart size={20} /> Mulai Galang Dana
                </Link>
                <a href="#cara" className={`bg-white border border-[#E6DCD3] text-[#211A1D] px-8 py-4 rounded-full text-[15px] font-bold hover:bg-[#F3ECE3] transition flex items-center gap-2 ${SH_CARD}`}>
                  Pelajari Cara Kerja
                </a>
              </div>
              <div className="bd-rv flex items-center gap-3 pt-3" style={{ animationDelay: '.2s' }}>
                <div className="flex -space-x-3">
                  <span className="w-9 h-9 rounded-full border-2 border-[#FBF8F4]" style={gGreen} />
                  <span className="w-9 h-9 rounded-full border-2 border-[#FBF8F4]" style={{ background: 'linear-gradient(140deg,#0B7A93,#0B5566)' }} />
                  <span className="w-9 h-9 rounded-full border-2 border-[#FBF8F4]" style={gWarm} />
                </div>
                <p className="text-[13px] text-[#988A8F] max-w-[260px] leading-snug">Jadilah bagian dari gerakan kebaikan pertama di Maluku Utara.</p>
              </div>
            </div>

            <div className="relative">
              <div className={`bd-rv rounded-[34px] overflow-hidden h-[300px] md:h-[400px] w-full grid place-items-center text-center p-8 ${SH_SOFT}`} style={{ ...gGreen, animationDelay: '.1s' }}>
                <p className="text-white/55 text-[13px] leading-relaxed">[ Foto hangat warga Maluku Utara bergotong royong — pakai foto berlisensi / izin / AI, bukan stok berhak cipta ]</p>
              </div>
              {/* floating: verified */}
              <div className={`bd-floaty absolute -left-5 top-1/4 z-10 bg-white/95 backdrop-blur p-4 rounded-2xl border border-white/60 ${SH_SOFT}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#E7F2EC] grid place-items-center text-[#0F5138]"><BadgeCheck size={20} /></div>
                  <div className="leading-tight">
                    <p className="font-bold text-[13.5px] text-[#211A1D]" style={sora}>Terverifikasi</p>
                    <p className="text-[11px] text-[#988A8F]">Diperiksa tim lokal Malut</p>
                  </div>
                </div>
              </div>
              {/* floating: transparency (no fake amount) */}
              <div className={`bd-floaty2 absolute -right-4 bottom-12 z-10 bg-white/95 backdrop-blur p-5 rounded-2xl border border-white/60 max-w-[210px] ${SH_SOFT}`}>
                <p className="text-[10.5px] font-extrabold tracking-wide text-[#D6006E] mb-1">TRANSPARAN &amp; TERBUKA</p>
                <p className="text-[11.5px] text-[#6B5B61] leading-relaxed mb-3">Donasi masuk &amp; laporan penyaluran ditampilkan terbuka.</p>
                <div className="h-2 rounded-full bg-[#F3ECE3] overflow-hidden"><div className="h-full w-[60%] rounded-full" style={gRose} /></div>
                <p className="text-[10px] text-[#988A8F] mt-1.5">contoh progres campaign</p>
              </div>
            </div>
          </div>
        </section>

        {/* TRUST BAND */}
        <section className="max-w-[1200px] mx-auto px-6 pb-4">
          <div className={`bg-white rounded-[26px] border border-[#ECE2E6] grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-[#ECE2E6] ${SH_CARD}`}>
            {[
              { Icon: PiggyBank, t: 'Gratis', d: 'Tanpa biaya buat penggalang', bg: '#FDEFF6', fg: '#D6006E' },
              { Icon: BadgeCheck, t: 'Diverifikasi', d: 'Dokumen dicek sebelum tayang', bg: '#E7F2EC', fg: '#0F5138' },
              { Icon: Wallet, t: 'Donasi Utuh', d: 'Biaya di atas, bukan dipotong', bg: '#E2F3F6', fg: '#0B7A93' },
              { Icon: Megaphone, t: 'Berpotensi Viral', d: 'Lewat ekosistem TeraLoka', bg: '#F8EEDF', fg: '#C8893A' },
            ].map(({ Icon, t, d, bg, fg }) => (
              <div key={t} className="p-6 flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl grid place-items-center shrink-0" style={{ background: bg, color: fg }}><Icon size={22} /></div>
                <div>
                  <p className="font-bold text-[14.5px]" style={sora}>{t}</p>
                  <p className="text-[11.5px] text-[#988A8F] leading-snug">{d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* STORY / FILOSOFI */}
        <section className="py-8 md:py-10 px-6 relative overflow-hidden">
          <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-[#D6006E]/5 rounded-full blur-3xl" />
          <div className="max-w-[760px] mx-auto text-center relative">
            <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#D6006E] mb-5 block">FILOSOFI KAMI</span>
            <h2 className="text-[clamp(28px,4vw,40px)] font-bold leading-[1.18] text-[#211A1D]" style={sora}>
              Modernitas yang berakar<br />pada <span className="text-[#D6006E]">tradisi torang.</span>
            </h2>
            <p className="text-[18px] text-[#6B5B61] leading-relaxed mt-4">
              Di Maluku Utara, &ldquo;Torang Bantu Torang&rdquo; bukan sekadar slogan — itu nafas kehidupan. Saat ada yang susah, biasanya kita kumpulkan bantuan lewat grup WhatsApp yang terbatas. Niatnya tulus, tapi sering tercecer dan susah dipercaya.
            </p>
            <p className="text-[18px] text-[#211A1D] font-semibold leading-relaxed mt-3">
              BADONASI mendigitalkan semangat gotong royong itu — agar bantuan lebih rapi, lebih terbuka, dan menjangkau lebih banyak orang baik tanpa batas pulau.
            </p>
          </div>
        </section>

        {/* CARA KERJA */}
        <section id="cara" className="py-8 md:py-10 px-6 bg-[#F3ECE3]/50">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[760px] mx-auto mb-6">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#D6006E] mb-4 block">CARA KERJA</span>
              <h2 className="text-[34px] font-bold text-[#211A1D]" style={sora}>Tiga langkah, semua terbuka.</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-7">
              {[
                { Icon: FileText, n: 1, t: 'Ajukan & diverifikasi', d: 'Ceritakan kebutuhan, target dana, dan rekeningmu. Unggah KTP & dokumen — tim memeriksa sebelum tayang.', bg: '#FDEFF6', fg: '#D6006E' },
                { Icon: Smartphone, n: 2, t: 'Warga donasi langsung', d: 'Donasi masuk langsung ke rekening kampanye yang kamu kelola. TeraLoka memfasilitasi, tidak menahan dana.', bg: '#E7F2EC', fg: '#0F5138' },
                { Icon: ClipboardCheck, n: 3, t: 'Salurkan & laporkan', d: 'Salurkan ke penerima sesuai kebutuhan, lalu unggah bukti & laporan penggunaan dana — terbuka untuk publik.', bg: '#F8EEDF', fg: '#C8893A' },
              ].map(({ Icon, n, t, d, bg, fg }) => (
                <div key={n} className={`group relative bg-white rounded-[26px] p-8 border border-[#ECE2E6] transition hover:-translate-y-1.5 ${SH_CARD}`}>
                  <div className="w-14 h-14 rounded-2xl grid place-items-center mb-6" style={{ background: bg, color: fg }}><Icon size={28} /></div>
                  <h3 className="font-bold text-[19px] mb-2.5" style={sora}>{t}</h3>
                  <p className="text-[14.5px] text-[#6B5B61] leading-relaxed">{d}</p>
                  <div className="absolute -top-3.5 -right-3.5 w-9 h-9 rounded-full bg-white border-2 border-[#ECE2E6] grid place-items-center font-bold text-[#D6006E] text-[14px]" style={sora}>{n}</div>
                </div>
              ))}
            </div>
            <div className="text-center mt-8">
              <Link href={NEW_CAMPAIGN} className={`inline-block px-9 py-4 rounded-full text-white text-[15px] font-bold hover:scale-105 transition ${SH_ROSE}`} style={gRose}>Mulai Buat Campaign Sekarang</Link>
            </div>
          </div>
        </section>

        {/* TRANSPARANSI */}
        <section id="transparansi" className="py-8 md:py-10 px-6">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#D6006E] mb-4 block">TRANSPARANSI</span>
              <h2 className="text-[34px] font-bold text-[#211A1D] leading-tight" style={sora}>Lihat ke mana dana mengalir.</h2>
              <p className="text-[16.5px] text-[#6B5B61] leading-relaxed mt-4 mb-5">Tidak ada kotak hitam. Setiap rupiah punya jejak yang bisa dilihat — dari donasi masuk hingga laporan penyaluran.</p>
              <div className="space-y-2.5">
                {[
                  { Icon: Banknote, t: 'Donasi masuk', d: 'Langsung ke rekening kampanye penggalang — tercatat terbuka.', bg: '#FDEFF6', fg: '#D6006E' },
                  { Icon: HandHeart, t: 'Disalurkan oleh penggalang', d: 'Ke penerima manfaat sesuai kebutuhan yang jelas.', bg: '#E7F2EC', fg: '#0F5138' },
                  { Icon: FileCheck, t: 'Dilaporkan terbuka', d: 'Penggalang wajib unggah bukti & laporan penggunaan dana.', bg: '#E2F3F6', fg: '#0B7A93' },
                ].map(({ Icon, t, d, bg, fg }, i) => (
                  <div key={t}>
                    <div className={`flex items-center gap-4 bg-white rounded-2xl p-4 border border-[#ECE2E6] ${SH_CARD}`}>
                      <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0" style={{ background: bg, color: fg }}><Icon size={22} /></div>
                      <div>
                        <p className="font-bold text-[14.5px]" style={sora}>{t}</p>
                        <p className="text-[13px] text-[#988A8F]">{d}</p>
                      </div>
                    </div>
                    {i < 2 && <div className="pl-9 py-0.5 text-[#E6DCD3]"><ArrowDown size={20} /></div>}
                  </div>
                ))}
              </div>
            </div>
            <div className={`rounded-[34px] p-9 text-white relative overflow-hidden ${SH_SOFT}`} style={gGreen}>
              <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full opacity-20 blur-3xl bg-[#D6006E]" />
              <div className="relative space-y-4">
                <Shield size={36} className="text-[#FF5CA8]" />
                <h3 className="font-bold text-[22px] leading-snug" style={sora}>Jujur soal batasnya.</h3>
                <p className="text-[14.5px] text-white/75 leading-relaxed">
                  TeraLoka <b className="text-white">memfasilitasi &amp; memverifikasi</b> — bukan pemegang atau penyalur dana. Dana donasi adalah <b className="text-white">hak penerima manfaat</b>, bukan milik penggalang maupun TeraLoka. Verifikasi <b className="text-white">mengurangi</b> risiko, bukan menghilangkan — &ldquo;terverifikasi&rdquo; bukan jaminan bebas penipuan.
                </p>
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <Link href="/aturan/badonasi/ketentuan" className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-[12.5px] font-bold hover:bg-white/15 transition"><FileText size={15} /> Ketentuan</Link>
                  <Link href="/fundraising/standar-verifikasi" className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-2.5 text-[12.5px] font-bold hover:bg-white/15 transition"><SearchCheck size={15} /> Standar Verifikasi</Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* EKOSISTEM BENTO + DIFFERENTIATOR */}
        <section id="ekosistem" className="py-8 md:py-10 px-6">
          <div className={`max-w-[1200px] mx-auto bg-[#211A1D] rounded-[34px] overflow-hidden grid lg:grid-cols-2 ${SH_SOFT}`}>
            <div className="p-10 lg:p-14 flex flex-col justify-center space-y-4">
              <div className="inline-flex items-center gap-2 text-[#FF5CA8] text-[12px] font-extrabold tracking-[0.14em]"><Network size={18} /> EKOSISTEM TERALOKA</div>
              <h2 className="text-[clamp(28px,3.5vw,38px)] font-extrabold text-white leading-[1.1]" style={sora}>Campaign-mu tidak berjalan sendiri.</h2>
              <p className="text-[15.5px] text-white/65 leading-relaxed">Sebagai bagian dari ekosistem TeraLoka, setiap campaign terhubung ke jaringan portal berita warga BAKABAR &amp; platform lokal lain. Setiap campaign <b className="text-white">berpotensi</b>:</p>
              <ul className="space-y-3 text-[14.5px] text-white/85">
                {['Diangkat di BAKABAR, portal berita warga Malut', 'Dibagikan komunitas & jaringan relawan', 'Disebar ke media sosial TeraLoka'].map((x) => (
                  <li key={x} className="flex items-center gap-3"><CheckCircle2 size={20} className="text-[#8ad6ae] shrink-0" /> {x}</li>
                ))}
              </ul>
              <p className="text-[12.5px] text-white/40 italic">* Peliputan oleh redaksi BAKABAR bersifat editorial &amp; independen — sebuah potensi, bukan jaminan.</p>
            </div>
            {/* BENTO */}
            <div className="relative min-h-[400px] p-6 lg:p-8 grid grid-cols-2 gap-3.5" style={{ background: 'linear-gradient(135deg,rgba(214,0,110,.18),transparent)' }}>
              <div className="bg-white/10 backdrop-blur-md rounded-[26px] border border-white/15 p-5 flex flex-col justify-between">
                <Newspaper size={28} className="text-[#FF5CA8]" />
                <div><p className="text-white font-bold text-[15px]" style={sora}>BAKABAR</p><p className="text-white/55 text-[11px]">Berita warga Malut</p></div>
              </div>
              <div className="bg-[#D6006E]/25 backdrop-blur-md rounded-[26px] border border-white/15 p-5 flex flex-col justify-between">
                <MessageSquare size={28} className="text-white" />
                <div><p className="text-white font-bold text-[15px]" style={sora}>BALAPOR</p><p className="text-white/55 text-[11px]">Lapor warga</p></div>
              </div>
              <div className="bg-white/8 backdrop-blur-md rounded-[26px] border border-white/15 p-5 col-span-2 flex items-center justify-between">
                <div><p className="text-white font-bold text-[15px]" style={sora}>BAKOS</p><p className="text-white/55 text-[11px]">Kos &amp; properti warga</p></div>
                <Building2 size={34} className="text-[#FF5CA8]" />
              </div>
              <div className="bg-white/8 backdrop-blur-md rounded-[26px] border border-white/15 p-5 col-span-2 flex items-center justify-between">
                <div><p className="text-white font-bold text-[15px]" style={sora}>BANIAGA</p><p className="text-white/55 text-[11px]">Niaga &amp; produk lokal</p></div>
                <Store size={34} className="text-[#FF5CA8]" />
              </div>
            </div>
          </div>
        </section>

        {/* CAMPAIGN PREVIEW (labeled illustration) */}
        <section className="py-8 md:py-10 px-6 bg-[#F3ECE3]/50">
          <div className="max-w-[1200px] mx-auto grid lg:grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#D6006E] block">BELUM ADA CAMPAIGN — JADILAH YANG PERTAMA</span>
              <h2 className="text-[34px] font-bold text-[#211A1D] leading-tight" style={sora}>Begini campaign-mu nanti tampil.</h2>
              <p className="text-[16.5px] text-[#6B5B61] leading-relaxed">Cerita yang menyentuh, progres yang terbuka, dan mudah dibagikan ke siapa saja. Satu langkah darimu bisa jadi awal kebaikan besar di Maluku Utara.</p>
              <Link href={NEW_CAMPAIGN} className={`inline-flex items-center gap-2 text-white px-8 py-4 rounded-full text-[15px] font-bold hover:scale-[1.03] transition ${SH_ROSE}`} style={gRose}>
                <PlusCircle size={20} /> Buat Campaign Pertama
              </Link>
            </div>
            <div className={`bg-white rounded-[34px] border border-[#ECE2E6] overflow-hidden transition hover:-translate-y-1.5 ${SH_SOFT}`}>
              <div className="relative h-44 grid place-items-center" style={gGreen}>
                <ImageIcon size={44} className="text-white/55" />
                <span className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/90 text-[#D6006E] text-[10.5px] font-extrabold tracking-wide px-3 py-1.5 rounded-full"><PenTool size={13} /> ILUSTRASI — BUKAN CAMPAIGN NYATA</span>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0F5138] bg-[#E7F2EC] px-2.5 py-1 rounded-full"><BadgeCheck size={13} /> Terverifikasi</span>
                  <span className="text-[11px] text-[#988A8F]">· Kesehatan</span>
                </div>
                <h4 className="font-bold text-[18px] text-[#211A1D] leading-snug" style={sora}>Bantu biaya pengobatan tetangga torang</h4>
                <p className="text-[13px] text-[#6B5B61] mt-2 leading-relaxed">Cerita, kebutuhan, dan target dana ditampilkan jelas &amp; terbuka untuk calon donatur.</p>
                <div className="mt-5 h-2.5 rounded-full bg-[#F3ECE3] overflow-hidden"><div className="h-full w-[58%] rounded-full" style={gRose} /></div>
                <div className="flex justify-between items-end mt-2.5">
                  <div><p className="font-bold text-[15px] text-[#D6006E]" style={sora}>Terkumpul</p><p className="text-[11px] text-[#988A8F]">dari target</p></div>
                  <p className="text-[12px] text-[#988A8F] flex items-center gap-1"><Users size={15} /> donatur</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KATEGORI */}
        <section className="py-8 md:py-10 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="mb-6 max-w-[760px]">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#D6006E] mb-4 block">MULAI DARI HAL TERDEKAT</span>
              <h2 className="text-[34px] font-bold text-[#211A1D]" style={sora}>Apa saja yang bisa kamu galang?</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {KATEGORI.map(({ Icon, t, d, bg, fg }) => (
                <div key={t} className={`bg-white rounded-[26px] p-7 border border-[#ECE2E6] transition hover:-translate-y-1.5 ${SH_CARD}`}>
                  <div className="w-[52px] h-[52px] rounded-2xl grid place-items-center mb-5" style={{ background: bg, color: fg }}><Icon size={28} /></div>
                  <h3 className="font-bold text-[17px] mb-1.5" style={sora}>{t}</h3>
                  <p className="text-[14px] text-[#6B5B61] leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* COMMUNITY */}
        <section className="py-8 md:py-10 px-6 text-white relative overflow-hidden" style={{ background: '#0F5138' }}>
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px,#fff 1px,transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="max-w-[1200px] mx-auto relative grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#FF5CA8] mb-4 block">DARI KITA, UNTUK KITA</span>
              <h2 className="text-[clamp(28px,3.6vw,38px)] font-bold leading-[1.12]" style={sora}>Kebaikan yang dekat,<br />dari tetangga torang sendiri.</h2>
              <p className="text-[16px] text-white/70 leading-relaxed mt-6 max-w-[460px]">Bukan platform jauh yang tak kenal kondisi di sini. BADONASI tumbuh dari Maluku Utara — dari Ternate, Tidore, Halmahera, sampai pelosok kepulauan. Kebaikanmu sampai ke yang benar-benar dekat.</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { Icon: Users, t: 'Warga & relawan lokal', d: 'Yang paham betul kebutuhan di sekitar.' },
                { Icon: Map, t: 'Jangkau pelosok', d: 'Dari kota hingga kampung di kepulauan.' },
                { Icon: Handshake, t: 'Gotong royong', d: 'Semangat saling bantu yang sudah mengakar.' },
                { Icon: Network, t: 'Satu ekosistem', d: 'BAKABAR · BALAPOR · BAKOS · BANIAGA.' },
              ].map(({ Icon, t, d }) => (
                <div key={t} className="bg-white/8 border border-white/12 rounded-2xl p-5">
                  <Icon size={24} className="text-[#FF5CA8]" />
                  <p className="font-bold text-[15px] mt-2" style={sora}>{t}</p>
                  <p className="text-[12px] text-white/60 mt-1">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-8 md:py-10 px-6">
          <div className="max-w-[1200px] mx-auto">
            <div className="text-center max-w-[760px] mx-auto mb-6">
              <span className="text-[12px] font-extrabold tracking-[0.18em] text-[#D6006E] mb-4 block">PERTANYAAN UMUM</span>
              <h2 className="text-[34px] font-bold text-[#211A1D]" style={sora}>Transparan sejak pertanyaan pertama.</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4 max-w-5xl mx-auto items-start">
              {FAQ.map((item, i) => (
                <details key={i} open={i === 0} className={`group bg-white border border-[#ECE2E6] rounded-2xl ${SH_CARD}`}>
                  <summary className="cursor-pointer p-5 font-bold text-[15px] text-[#211A1D] flex justify-between items-center gap-3">
                    {item.q}
                    <ChevronDown size={18} className="text-[#D6006E] transition-transform group-open:rotate-180 shrink-0" />
                  </summary>
                  <div className="px-5 pb-5 text-[13.5px] text-[#6B5B61] leading-relaxed">{item.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="px-6 py-8 md:py-10">
          <div className={`max-w-[1200px] mx-auto rounded-[34px] p-8 md:p-12 text-center relative overflow-hidden ${SH_ROSE}`} style={gRose}>
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/12 rounded-full -mr-20 -mt-20 blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/8 rounded-full -ml-20 -mb-20 blur-3xl" />
            <div className="relative space-y-4">
              <div className="text-[42px]">🩷</div>
              <h2 className="text-[clamp(28px,4vw,42px)] font-extrabold text-white leading-tight max-w-2xl mx-auto" style={sora}>Kenal seseorang yang butuh uluran tangan?</h2>
              <p className="text-[16px] text-white/80 max-w-lg mx-auto">Jadilah jembatan bantuan pertama di Maluku Utara. Gratis, diverifikasi, dan kamu didampingi.</p>
              <div className="pt-3">
                <Link href={NEW_CAMPAIGN} className="bg-white text-[#A80057] inline-block px-10 py-4 rounded-full text-[16px] font-bold hover:scale-105 transition shadow-xl">Mulai Galang Dana Sekarang</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-[#ECE2E6] py-10 px-6">
        <div className="max-w-[1200px] mx-auto grid md:grid-cols-12 gap-10">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-2xl grid place-items-center text-white" style={gRose}><HandHeart size={20} /></div>
              <div className="leading-none">
                <span className="font-extrabold text-[18px]" style={sora}>BADONASI</span>
                <span className="block text-[8.5px] font-bold tracking-[0.24em] text-[#988A8F] mt-1">TERALOKA</span>
              </div>
            </div>
            <p className="text-[14px] text-[#6B5B61] max-w-sm leading-relaxed">Gotong royong digital warga Maluku Utara. Dari kita, untuk kita — terbuka &amp; bisa dipercaya.</p>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-bold text-[14px] mb-4" style={sora}>Mulai</h4>
            <ul className="space-y-2.5 text-[14px] text-[#6B5B61]">
              <li><Link href={NEW_CAMPAIGN} className="hover:text-[#D6006E] transition">Galang Dana</Link></li>
              <li><a href="#cara" className="hover:text-[#D6006E] transition">Cara Kerja</a></li>
              <li><Link href="/fundraising/standar-verifikasi" className="hover:text-[#D6006E] transition">Panduan Penggalang</Link></li>
            </ul>
          </div>
          <div className="md:col-span-2">
            <h4 className="font-bold text-[14px] mb-4" style={sora}>Legal</h4>
            <ul className="space-y-2.5 text-[14px] text-[#6B5B61]">
              <li><Link href="/aturan/privasi" className="hover:text-[#D6006E] transition">Kebijakan Privasi</Link></li>
              <li><Link href="/aturan/badonasi/ketentuan" className="hover:text-[#D6006E] transition">Ketentuan BADONASI</Link></li>
              <li><Link href="/fundraising/standar-verifikasi" className="hover:text-[#D6006E] transition">Standar Verifikasi</Link></li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <h4 className="font-bold text-[14px] mb-4" style={sora}>Hubungi</h4>
            <p className="text-[14px] text-[#6B5B61]">Ternate, Maluku Utara</p>
            <p className="text-[14px] text-[#D6006E] font-bold mt-1">halo@teraloka.com</p>
          </div>
        </div>
        {/* Disclaimer legal permanen — mirror UU 9/1961 jo. Permensos 8/2021 (TeraLoka = fasilitator, BUKAN penyelenggara PUB) */}
        <div className="max-w-[1200px] mx-auto mt-8 pt-6 border-t border-[#ECE2E6]">
          <p className="text-[11.5px] leading-relaxed text-[#988A8F]">
            <span className="font-bold text-[#6B5B61]">Pemberitahuan.</span> BADONASI adalah fasilitator teknologi yang mempertemukan penggalang dana warga dengan donatur.
            TeraLoka <b className="text-[#6B5B61]">bukan penyelenggara pengumpulan uang atau barang</b> dan tidak menghimpun, menyimpan, menyalurkan,
            atau memiliki dana donasi — donasi masuk langsung ke rekening kampanye yang dikelola penggalang.
            Tanggung jawab atas kebenaran informasi, penyaluran dana, serta pemenuhan ketentuan yang berlaku (termasuk perizinan bila disyaratkan)
            sepenuhnya berada pada penggalang. Verifikasi mengurangi, tetapi tidak menghilangkan, risiko — &ldquo;terverifikasi&rdquo; bukan jaminan.
            Dengan membuat campaign, penggalang menyetujui{' '}
            <Link href="/aturan/badonasi/ketentuan" className="text-[#D6006E] font-semibold hover:underline">Ketentuan BADONASI</Link>.
          </p>
        </div>
        <div className="max-w-[1200px] mx-auto mt-6 pt-5 border-t border-[#ECE2E6] flex flex-col md:flex-row justify-between items-center gap-3">
          <p className="text-[12px] text-[#988A8F]">© 2026 BADONASI · Torang Bantu Torang untuk Maluku Utara.</p>
          <p className="text-[12px] text-[#988A8F]">Powered by <span className="text-[#D6006E] font-bold">TeraLoka Ecosystem</span></p>
        </div>
      </footer>
    </div>
  )
}

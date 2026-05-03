'use client';

// ════════════════════════════════════════════════════════════════
// BALAPOR LANDING PAGE — V4 React Production
// ────────────────────────────────────────────────────────────────
// Path: src/app/(public)/reports/page.tsx
// URL public: /balapor (via rewrites di next.config.ts)
//
// Strategy:
//   - Folder TETAP /reports (filosofi "dapur generic")
//   - URL public = /balapor (filosofi "etalase branded")
//   - Form pelaporan sudah di-move ke /balapor/buat-laporan
//
// Architecture:
//   - Inherit Publiclayout (Ticker + Navbar + Footer + Fab + BottomNav)
//   - Single file, ~900 lines (consistent dengan pattern existing)
//   - Pakai semantic tokens dari globals.css
//   - Material Symbols Outlined untuk icons
//   - React state untuk FAQ Tab + Accordion
//
// History:
//   May 3, 2026 — Initial implementation V4 mockup → React production
// ════════════════════════════════════════════════════════════════

import { useState } from 'react';
import Link from 'next/link';

// ─── Form path constant ─────────────────────────────────────────
const FORM_PATH = '/balapor/buat-laporan';

// ─── 8 Categories data ──────────────────────────────────────────
const CATEGORIES = [
  { key: 'keamanan',       label: 'Keamanan',       icon: 'security',        bg: '#ECFDF5', color: '#047857', desc: 'Kamtibmas, pencurian, aktivitas mencurigakan' },
  { key: 'infrastruktur',  label: 'Infrastruktur',  icon: 'construction',    bg: '#EFF6FF', color: '#1D4ED8', desc: 'Jalan rusak, lampu mati, fasilitas umum' },
  { key: 'lingkungan',     label: 'Lingkungan',     icon: 'park',            bg: '#F0FDF4', color: '#15803D', desc: 'Sampah liar, pencemaran, kerusakan alam' },
  { key: 'layanan_publik', label: 'Layanan Publik', icon: 'account_balance', bg: '#FAF5FF', color: '#7E22CE', desc: 'Pungli, birokrasi, pelayanan buruk' },
  { key: 'kesehatan',      label: 'Kesehatan',      icon: 'local_hospital',  bg: 'var(--color-balapor-muted)', color: 'var(--color-balapor)', desc: 'Fasilitas rusak, penolakan pasien, wabah' },
  { key: 'pendidikan',     label: 'Pendidikan',     icon: 'school',          bg: '#FEFCE8', color: '#A16207', desc: 'Gedung rusak, pungutan liar, diskriminasi' },
  { key: 'transportasi',   label: 'Transportasi',   icon: 'directions_boat', bg: '#ECFEFF', color: '#0E7490', desc: 'Kapal tidak layak, tarif tidak wajar' },
  { key: 'lainnya',        label: 'Lainnya',        icon: 'more_horiz',      bg: '#F3F4F6', color: '#4B5563', desc: 'Hal lain yang perlu perhatian publik' },
];

// ─── 5-step Lifecycle data ──────────────────────────────────────
const LIFECYCLE_STEPS = [
  { num: 1, title: 'Laporkan',           icon: 'photo_camera', bg: 'var(--color-balapor-muted)', color: 'var(--color-balapor)', desc: 'Foto, tulis singkat, pilih kategori. GPS otomatis.' },
  { num: 2, title: 'Verifikasi',         icon: 'verified',     bg: '#EFF6FF', color: '#3B82F6', desc: 'Tim TeraLoka verifikasi fakta, lokasi, dan kategorinya.' },
  { num: 3, title: 'Publikasi BAKABAR',  icon: 'newspaper',    bg: 'rgba(255,255,255,0.1)', color: '#10B981', desc: 'Layak naik jadi artikel berita. Dibaca ribuan warga.', highlight: true },
  { num: 4, title: 'Kesadaran Bersama',  icon: 'groups',       bg: '#FEF3C7', color: '#F59E0B', desc: 'Berita jadi bahan diskusi publik, mengundang aksi kolektif.' },
  { num: 5, title: 'Selesai & Konfirmasi', icon: 'check_circle', bg: '#ECFDF5', color: '#10B981', desc: 'Kamu konfirmasi: "Sudah teratasi atau belum?"', filled: true },
];

// ─── FAQ data ───────────────────────────────────────────────────
const FAQ_DATA: { tabs: { id: number; label: string; icon: string }[]; items: Record<number, { id: string; q: string; a: string }[]> } = {
  tabs: [
    { id: 0, label: 'Tentang BALAPOR',    icon: 'campaign' },
    { id: 1, label: 'Privasi & Keamanan', icon: 'shield' },
    { id: 2, label: 'Cara Kerja',         icon: 'info' },
  ],
  items: {
    0: [
      { id: 'about-1', q: 'Apakah BALAPOR resmi pemerintah?', a: '<strong>Tidak.</strong> BALAPOR adalah inisiatif independen warga Maluku Utara — bagian dari ekosistem TeraLoka. Kami bekerja dengan semangat <strong>kolaborasi</strong>, bukan konfrontasi. Tujuan kami adalah memfasilitasi suara warga agar didengar lebih banyak pihak melalui jurnalisme warga di BAKABAR.' },
      { id: 'about-2', q: 'Bagaimana laporan saya ditanggapi?', a: 'Setelah verifikasi tim TeraLoka, laporan layak naik jadi artikel BAKABAR. Berita ini menjadi bahan diskusi publik dan <strong>kesadaran kolektif</strong> warga Maluku Utara. Kami percaya pembangunan terbaik adalah hasil sinergi semua pihak.' },
      { id: 'about-3', q: 'Apa hubungan BALAPOR dengan BAKABAR?', a: 'BAKABAR adalah <strong>partner ekosistem</strong> BALAPOR. Setiap laporan terverifikasi yang relevan akan diangkat menjadi artikel berita di BAKABAR — dengan tetap menjaga privasi pelapor. Inilah kekuatan utama BALAPOR: <strong>jurnalisme warga</strong> yang mengangkat suara akar rumput.' },
    ],
    1: [
      { id: 'priv-1', q: 'Apakah identitas saya bisa bocor?', a: 'Default-nya <strong>anonim ke publik</strong>. Hanya admin BALAPOR yang bisa melihat nomor WA — itu pun hanya untuk update status laporan kepadamu. Nomor WA tidak akan diteruskan ke pihak mana pun. Privasi terjaga by design.' },
      { id: 'priv-2', q: 'Bagaimana jika dipakai untuk fitnah?', a: 'Tim TeraLoka <strong>verifikasi setiap laporan</strong> sebelum naik ke BAKABAR. Cek konsistensi cerita, lokasi GPS, dan foto. Laporan palsu otomatis terflag oleh sistem AI, akun bisa diblokir permanen jika terbukti melakukan fitnah.' },
      { id: 'priv-3', q: 'Saya bisa hapus laporan kapan saja?', a: 'Ya. Kamu bisa <strong>request hapus laporan</strong> kapan saja melalui dashboard "Laporan Saya". Tim TeraLoka akan memproses permintaan dalam 1×24 jam. Hak privasi sepenuhnya milikmu.' },
    ],
    2: [
      { id: 'how-1', q: 'Berapa lama proses verifikasi laporan?', a: 'Tim TeraLoka berkomitmen verifikasi setiap laporan dalam <strong>1×24 jam</strong>. Untuk kasus mendesak (kecelakaan, bencana), kami prioritaskan respon lebih cepat. Status laporan transparan, kamu bisa pantau real-time.' },
      { id: 'how-2', q: 'Apa saja yang bisa saya laporkan?', a: '8 kategori utama: <strong>Keamanan</strong>, <strong>Infrastruktur</strong>, <strong>Lingkungan</strong>, <strong>Layanan Publik</strong>, <strong>Kesehatan</strong>, <strong>Pendidikan</strong>, <strong>Transportasi</strong>, dan <strong>Lainnya</strong>. Mulai dari hal kecil seperti lampu jalan mati hingga isu yang berdampak luas.' },
      { id: 'how-3', q: 'Apakah saya perlu bukti foto?', a: 'Untuk kategori <strong>Infrastruktur</strong> dan <strong>Lingkungan</strong>, foto wajib karena memerlukan bukti visual. Untuk kategori lain, foto opsional tetapi sangat dianjurkan agar laporan lebih kredibel dan mudah diverifikasi.' },
    ],
  },
};

// ─── BAKABAR mock articles (Ekosistem section) ──────────────────
const BAKABAR_ARTICLES = [
  { source: 'BALAPOR', title: 'Banjir di Kel. Bastiong, Drainase Perlu Perhatian', meta: '2.847 dibaca · 2 hari lalu', icon: 'water_drop', bgGrad: 'linear-gradient(135deg, #fef2f2, #fecaca)', iconColor: 'var(--color-balapor)' },
  { source: 'BALAPOR', title: 'TPS Liar di Sulamadaha Mendapat Tindakan',         meta: '1.523 dibaca · 5 hari lalu', icon: 'delete',      bgGrad: 'linear-gradient(135deg, #fef3c7, #fcd34d)', iconColor: '#92400E' },
  { source: 'EDITORIAL', title: 'Pembangunan Pelabuhan Bastiong Tahap 2',          meta: '945 dibaca · 1 minggu lalu', icon: 'construction', bgGrad: 'linear-gradient(135deg, #dbeafe, #93c5fd)', iconColor: '#1D4ED8' },
];

// ─── BADONASI mock campaigns ────────────────────────────────────
const BADONASI_CAMPAIGNS = [
  { title: 'Bantu Korban Banjir Bastiong', meta: '35 donatur · Aktif',     raised: 'Rp 12,5 jt', target: 'dari Rp 20 jt', pct: 65,  icon: 'water_drop', bgGrad: 'linear-gradient(135deg, #fce7f3, #f9a8d4)', iconColor: '#BE185D', complete: false },
  { title: 'Renovasi SD Baitur Rohman',     meta: '22 donatur · Aktif',     raised: 'Rp 8,2 jt',  target: 'dari Rp 20 jt', pct: 41,  icon: 'school',     bgGrad: 'linear-gradient(135deg, #fef3c7, #fcd34d)', iconColor: '#92400E', complete: false },
  { title: 'Pengobatan Anak Difabel',       meta: '48 donatur · Tercapai', raised: 'Rp 15 jt ✓', target: '100%',           pct: 100, icon: 'favorite',   bgGrad: 'linear-gradient(135deg, #dcfce7, #86efac)', iconColor: '#15803D', complete: true },
];

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function BalaporLandingPage() {
  // FAQ state
  const [activeFaqTab, setActiveFaqTab] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const handleFaqToggle = (id: string) => {
    setOpenFaqId(openFaqId === id ? null : id);
  };

  const handleFaqTabChange = (tabId: number) => {
    setActiveFaqTab(tabId);
    setOpenFaqId(null); // close all accordions when switching tab
  };

  return (
    <div style={{ background: 'white', color: '#1f2937' }}>

      {/* ════════════════════════════════════════════════════════
          1. HERO — Diplomatic + Hopeful
          ════════════════════════════════════════════════════════ */}
      <section style={{ background: '#001a13', padding: '60px 32px 80px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative dotted Maluku map */}
        <svg
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 700, height: 600, opacity: 0.4, pointerEvents: 'none',
          }}
          viewBox="0 0 700 600"
        >
          <defs>
            <pattern id="dotPattern" x="0" y="0" width="8" height="8" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1" fill="#95d3ba" />
            </pattern>
          </defs>
          <path d="M 150 200 Q 200 180 250 220 L 280 280 Q 320 300 380 280 L 450 320 Q 480 300 520 350 L 540 400 Q 500 450 460 430 L 400 460 Q 340 480 280 450 L 220 430 Q 180 400 160 350 Z" fill="url(#dotPattern)" />
          <path d="M 380 150 Q 420 130 450 170 L 470 220 Q 440 250 410 230 L 390 200 Z" fill="url(#dotPattern)" />
          <path d="M 520 230 Q 560 210 590 250 L 600 290 Q 580 320 550 300 L 530 270 Z" fill="url(#dotPattern)" />
          <circle className="balapor-pulse" cx="280" cy="280" r="6" fill="var(--color-balapor)" />
          <circle className="balapor-pulse" cx="450" cy="320" r="6" fill="var(--color-balapor)" style={{ animationDelay: '0.5s' }} />
          <circle className="balapor-pulse" cx="380" cy="180" r="6" fill="var(--color-balapor)" style={{ animationDelay: '1s' }} />
          <circle className="balapor-pulse" cx="540" cy="380" r="6" fill="var(--color-balapor)" style={{ animationDelay: '1.5s' }} />
        </svg>

        <div className="hero-grid" style={{
          maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1,
          display: 'grid', gridTemplateColumns: '1fr 380px', gap: 60, alignItems: 'start',
        }}>
          {/* LEFT: Hero copy */}
          <div>
            {/* BALAPOR brand pill */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'var(--color-balapor)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>campaign</span>
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'white', letterSpacing: 0.5 }}>BALAPOR</p>
                <p style={{ fontSize: 11, color: '#9ca3af', marginTop: -2 }}>Suara Warga Maluku Utara</p>
              </div>
            </div>

            <h1 style={{
              fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800, color: 'white',
              lineHeight: 1.15, letterSpacing: '-1.2px', marginBottom: 20,
            }}>
              Bersama membangun<br />
              <span style={{ color: 'var(--color-balapor)' }}>Maluku Utara</span><br />
              yang lebih baik.
            </h1>

            <p style={{ fontSize: 17, color: '#d1d5db', lineHeight: 1.55, marginBottom: 32, maxWidth: 500 }}>
              Suaramu penting. Di BALAPOR, laporan terverifikasi naik jadi <strong style={{ color: 'white' }}>artikel BAKABAR</strong> — dibaca warga, dilihat banyak pihak, jadi bagian dari pembangunan kolektif Maluku Utara.
            </p>

            {/* CTA Buttons */}
            <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
              <Link href={FORM_PATH} style={{
                background: 'var(--color-balapor)', color: 'white',
                padding: '14px 28px', borderRadius: 12,
                fontSize: 14, fontWeight: 700, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
                boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
                transition: 'transform 0.15s',
              }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'none')}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit_square</span>
                Sampaikan Laporanmu
              </Link>
              <a href="#cara-kerja" style={{
                background: 'transparent', color: 'white',
                border: '1px solid rgba(255,255,255,0.25)',
                padding: '14px 22px', borderRadius: 12,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>play_circle</span>
                Lihat Cara Kerja
              </a>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 0' }}>
              <span className="material-symbols-outlined" style={{ color: '#95d3ba', fontSize: 18 }}>lock</span>
              <span style={{ fontSize: 13, color: '#95d3ba' }}>Aman & anonim by default. Identitasmu terlindungi.</span>
            </div>
          </div>

          {/* RIGHT: Cold-start panel + Founding perks */}
          <div style={{
            background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(149, 211, 186, 0.15)',
            borderRadius: 20, padding: 28,
          }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '6px 12px', borderRadius: 12, marginBottom: 16,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10B981' }} />
              <span style={{ fontSize: 11, color: '#10B981', fontWeight: 600 }}>Awal perjalanan kami</span>
            </div>

            <h2 style={{ fontSize: 36, fontWeight: 800, color: 'white', lineHeight: 1, letterSpacing: '-1px', marginBottom: 8 }}>0 laporan masuk</h2>
            <p style={{ fontSize: 13, color: '#9ca3af', lineHeight: 1.5, marginBottom: 24 }}>
              Karena ini baru dimulai.<br />Mari bangun bersama dari awal.
            </p>

            <div style={{ height: 1, background: 'rgba(149, 211, 186, 0.15)', marginBottom: 20 }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { icon: 'groups',    bgRgba: 'rgba(16, 185, 129, 0.15)',  iconColor: '#10B981', title: '100 orang pertama',         desc: 'akan mendapat badge eksklusif Founding Reporter.' },
                { icon: 'lightbulb', bgRgba: 'rgba(245, 158, 11, 0.15)', iconColor: '#F59E0B', title: 'Bentuk masa depan BALAPOR', desc: 'Vote fitur, beri masukan, tentukan arah platform ini.' },
                { icon: 'shield',    bgRgba: 'rgba(168, 85, 247, 0.15)', iconColor: '#A855F7', title: 'Privasi dijaga sepenuhnya', desc: 'Default anonim. Hanya admin yang melihat nomor WA.' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'start' }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: item.bgRgba,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <span className="material-symbols-outlined" style={{ color: item.iconColor, fontSize: 20, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>{item.title}</p>
                    <p style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          2. EMPATHY — Tantangan Bersama
          ════════════════════════════════════════════════════════ */}
      <section style={{ background: '#FFF5F5', padding: '80px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#1f2937',
            textAlign: 'center', letterSpacing: '-0.8px', marginBottom: 12,
          }}>
            Tantangan yang kita <span style={{ color: 'var(--color-balapor)' }}>hadapi bersama</span>
          </h2>
          <p style={{ fontSize: 14, color: '#6b7280', textAlign: 'center', marginBottom: 48 }}>
            Realita yang sering dialami warga Maluku Utara
          </p>

          <div className="empathy-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          }}>
            {[
              { title: 'Lapor sulit terlacak',     desc: 'Laporan masuk tapi sulit dipantau perkembangannya. Tidak ada kejelasan status.', illusBg: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)', illusIcon: 'smartphone',  showCard: true },
              { title: 'Hilang dalam scroll medsos', desc: 'Lapor di Facebook atau Twitter? Tenggelam dalam jam, sulit dilacak kembali.', illusBg: 'linear-gradient(135deg, #4b5563 0%, #6b7280 100%)', illusIcon: 'swap_vert',  showCard: false },
              { title: 'Khawatir identitas terbuka', desc: 'Ingin lapor tapi takut identitas diketahui dan menimbulkan masalah.',           illusBg: 'linear-gradient(135deg, #111827 0%, #1f2937 100%)', illusIcon: 'person',      showCard: false },
            ].map((item, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', gap: 16, padding: 24, alignItems: 'start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'var(--color-balapor)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                    }}>
                      <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 18 }}>close</span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1f2937', marginBottom: 8 }}>{item.title}</h3>
                    <p style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6 }}>{item.desc}</p>
                  </div>
                  <div style={{
                    width: 110, height: 130, borderRadius: 12,
                    background: item.illusBg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: 'white', fontSize: item.showCard ? 36 : 50, opacity: item.showCard ? 0.4 : 0.5 }}>{item.illusIcon}</span>
                    {item.showCard && (
                      <div style={{ position: 'absolute', bottom: 14, left: 8, right: 8, background: 'white', padding: '4px 6px', borderRadius: 4 }}>
                        <p style={{ fontSize: 7, fontWeight: 700, color: 'var(--color-balapor)', textAlign: 'center' }}>LAPORAN ANDA<br />DITERIMA</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          3. SYNERGY — BALAPOR × BAKABAR
          ════════════════════════════════════════════════════════ */}
      <section style={{
        background: 'linear-gradient(135deg, #003526 0%, #00251a 100%)',
        padding: '80px 32px', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(239, 68, 68, 0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              padding: '6px 14px', borderRadius: 16, marginBottom: 16,
            }}>
              <span className="material-symbols-outlined" style={{ color: '#FCA5A5', fontSize: 14 }}>handshake</span>
              <span style={{ fontSize: 11, color: '#FCA5A5', fontWeight: 700, letterSpacing: 1 }}>SEMANGAT KOLABORASI</span>
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.5vw, 36px)', fontWeight: 800, color: 'white', letterSpacing: '-1px', marginBottom: 12 }}>
              Suara warga yang <span style={{ color: 'var(--color-balapor)' }}>membangun.</span>
            </h2>
            <p style={{ fontSize: 15, color: '#95d3ba', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
              Kekuatan kami adalah <strong style={{ color: 'white' }}>jurnalisme warga</strong> — mengangkat suara akar rumput agar didengar lebih banyak pihak. Bersama membangun kesadaran kolektif untuk Maluku Utara.
            </p>
          </div>

          {/* Visual Synergy Diagram */}
          <div style={{
            background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(20px)',
            border: '1px solid rgba(149, 211, 186, 0.15)',
            borderRadius: 24, padding: '48px 32px', marginBottom: 40,
          }}>
            <div className="synergy-flow" style={{
              display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', gap: 16,
              alignItems: 'center', maxWidth: 900, margin: '0 auto',
            }}>
              {/* BALAPOR */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: 'var(--color-balapor)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                  boxShadow: '0 12px 32px rgba(239, 68, 68, 0.4)',
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 40, fontVariationSettings: "'FILL' 1" }}>campaign</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 4 }}>BALAPOR</p>
                <p style={{ fontSize: 11, color: '#95d3ba', lineHeight: 1.5 }}>Warga sampaikan<br />laporan secara aman</p>
              </div>

              <svg width="60" height="40" viewBox="0 0 60 40">
                <path className="balapor-flow-arrow" d="M 5 20 L 50 20" stroke="var(--color-balapor)" strokeWidth="3" fill="none" strokeLinecap="round" />
                <polygon points="50,15 60,20 50,25" fill="var(--color-balapor)" />
              </svg>

              {/* TeraLoka */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: 'linear-gradient(135deg, #003526, #064E3B)',
                  border: '2px solid rgba(149, 211, 186, 0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
                }}>
                  <span className="material-symbols-outlined" style={{ color: '#95d3ba', fontSize: 40, fontVariationSettings: "'FILL' 1" }}>verified</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 4 }}>TeraLoka</p>
                <p style={{ fontSize: 11, color: '#95d3ba', lineHeight: 1.5 }}>Tim verifikasi<br />fakta & lokasi</p>
              </div>

              <svg width="60" height="40" viewBox="0 0 60 40">
                <path className="balapor-flow-arrow" d="M 5 20 L 50 20" stroke="#10B981" strokeWidth="3" fill="none" strokeLinecap="round" />
                <polygon points="50,15 60,20 50,25" fill="#10B981" />
              </svg>

              {/* BAKABAR */}
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: 20,
                  background: '#003526', border: '2px solid #10B981',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px',
                  boxShadow: '0 12px 32px rgba(16, 185, 129, 0.3)',
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 40 }}>newspaper</span>
                </div>
                <p style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 4 }}>BAKABAR</p>
                <p style={{ fontSize: 11, color: '#95d3ba', lineHeight: 1.5 }}>Publish jadi<br />berita publik</p>
              </div>
            </div>

            {/* Result chain */}
            <div style={{ marginTop: 32, paddingTop: 32, borderTop: '1px solid rgba(149, 211, 186, 0.15)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
                {[
                  { icon: 'visibility', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)', label: 'Dibaca Warga' },
                  { icon: 'groups',     color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.15)', label: 'Kesadaran Kolektif' },
                  { icon: 'handshake',  color: 'var(--color-balapor)', bg: 'rgba(239, 68, 68, 0.15)', label: 'Aksi Bersama' },
                ].map((chain, i, arr) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: chain.bg, padding: '10px 18px', borderRadius: 12 }}>
                      <span className="material-symbols-outlined" style={{ color: chain.color, fontSize: 18 }}>{chain.icon}</span>
                      <span style={{ fontSize: 13, color: 'white', fontWeight: 600 }}>{chain.label}</span>
                    </div>
                    {i < arr.length - 1 && <span style={{ color: '#95d3ba', fontSize: 18 }}>→</span>}
                  </div>
                ))}
              </div>
              <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: '#95d3ba', fontStyle: 'italic' }}>
                "Pembangunan terbaik adalah yang melibatkan semua pihak — warga, pemerintah, dan dunia usaha."
              </p>
            </div>
          </div>

          {/* 3 Value Props */}
          <div className="value-props-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16,
          }}>
            {[
              { num: '1.', title: 'Suaramu Didengar',    icon: 'campaign',   color: '#FCA5A5', bg: 'rgba(239, 68, 68, 0.2)',  desc: 'Laporan terverifikasi naik ke BAKABAR — dibaca warga, jadi bagian dari percakapan publik Maluku Utara.' },
              { num: '2.', title: 'Mengangkat Cerita',   icon: 'visibility', color: '#10B981', bg: 'rgba(16, 185, 129, 0.2)', desc: 'Issue lokal yang penting jadi sorotan publik — agar lebih banyak pihak peduli dan bertindak.' },
              { num: '3.', title: 'Bersama Menggerakkan', icon: 'handshake',  color: '#F59E0B', bg: 'rgba(245, 158, 11, 0.2)', desc: 'Pembangunan terbaik adalah hasil sinergi — warga, pemerintah, swasta, dan komunitas.' },
            ].map((vp, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)',
                border: '1px solid rgba(149, 211, 186, 0.15)',
                borderRadius: 16, padding: 24,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: vp.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
                }}>
                  <span className="material-symbols-outlined" style={{ color: vp.color, fontSize: 24, fontVariationSettings: "'FILL' 1" }}>{vp.icon}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'white', marginBottom: 8 }}>{vp.num} {vp.title}</h3>
                <p style={{ fontSize: 13, color: '#95d3ba', lineHeight: 1.6 }}>{vp.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          4. LIFECYCLE — 5-Step Process
          ════════════════════════════════════════════════════════ */}
      <section id="cara-kerja" style={{ background: 'white', padding: '80px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{
              fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#1f2937',
              letterSpacing: '-0.8px', marginBottom: 8,
            }}>
              Bagaimana <span style={{ color: 'var(--color-balapor)' }}>prosesnya</span>
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Sistem pelaporan yang transparan, aman, dan tuntas.</p>
          </div>

          <div className="lifecycle-grid" style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto 1fr auto 1fr auto 1fr auto 1fr',
            gap: 12, alignItems: 'start',
          }}>
            {LIFECYCLE_STEPS.map((step, i, arr) => (
              <div key={step.num} style={{ display: 'contents' }}>
                <div style={{
                  background: step.highlight ? 'linear-gradient(135deg, #003526 0%, #00251a 100%)' : '#f9f9f8',
                  border: step.highlight ? '2px solid #10B981' : '1px solid #e5e7eb',
                  borderRadius: 16, padding: 24, textAlign: 'center', position: 'relative',
                  boxShadow: step.highlight ? '0 12px 32px rgba(16, 185, 129, 0.15)' : 'none',
                }}>
                  <div style={{
                    position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
                    width: 24, height: 24, borderRadius: '50%',
                    background: step.num === 5 ? '#10B981' : '#1f2937',
                    color: 'white', fontSize: 12, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{step.num}</div>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: step.bg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  }}>
                    <span className="material-symbols-outlined" style={{ color: step.color, fontSize: 28, fontVariationSettings: step.filled ? "'FILL' 1" : undefined }}>{step.icon}</span>
                  </div>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: step.highlight ? 'white' : '#1f2937', marginBottom: 8 }}>{step.title}</h3>
                  <p style={{ fontSize: 11, color: step.highlight ? '#95d3ba' : '#6b7280', lineHeight: 1.55 }}>{step.desc}</p>
                  {step.highlight && (
                    <div style={{
                      position: 'absolute', top: 14, right: 12,
                      background: 'var(--color-balapor)', color: 'white',
                      fontSize: 9, fontWeight: 800, padding: '2px 8px', borderRadius: 8, letterSpacing: 0.5,
                    }}>⚡ KUNCI</div>
                  )}
                </div>
                {i < arr.length - 1 && (
                  <span className="material-symbols-outlined lifecycle-chevron" style={{ color: '#d1d5db', fontSize: 24, alignSelf: 'center', marginTop: 40 }}>chevron_right</span>
                )}
              </div>
            ))}
          </div>

          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#ECFDF5', padding: '10px 20px', borderRadius: 100,
              border: '1px solid #A7F3D0',
            }}>
              <span className="material-symbols-outlined" style={{ color: '#10B981', fontSize: 18 }}>visibility</span>
              <span style={{ fontSize: 13, color: '#047857', fontWeight: 500 }}>
                Semua proses transparan. Kamu bisa pantau status laporanmu kapan saja.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          5. CATEGORIES
          ════════════════════════════════════════════════════════ */}
      <section style={{ background: '#f9f9f8', padding: '60px 32px' }}>
        <div className="categories-grid" style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '280px 1fr', gap: 48, alignItems: 'start',
        }}>
          <div>
            <h2 style={{
              fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 800, color: '#1f2937',
              letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 12,
            }}>
              Kamu bisa laporkan<br />
              <span style={{ color: 'var(--color-balapor)' }}>berbagai hal</span>
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 20 }}>
              Mulai dari yang kecil hingga yang berdampak besar.
            </p>
            <Link href={FORM_PATH} style={{
              background: 'white', border: '1px solid #e5e7eb',
              padding: '10px 18px', borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: '#1f2937',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              textDecoration: 'none',
            }}>
              Mulai laporkan
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </Link>
          </div>

          <div className="cat-cards-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{
                background: 'white', border: '1px solid #e5e7eb',
                borderRadius: 14, padding: 16,
                display: 'flex', gap: 12, alignItems: 'start',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: cat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ color: cat.color, fontSize: 20 }}>{cat.icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#1f2937', marginBottom: 2 }}>{cat.label}</p>
                  <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.4 }}>{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          6. EKOSISTEM TERALOKA — ALIVE 3-COL
          ════════════════════════════════════════════════════════ */}
      <section style={{ background: 'white', padding: '80px 32px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-balapor)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              EKOSISTEM TERALOKA
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#1f2937', letterSpacing: '-0.8px', marginBottom: 8 }}>
              Ekosistem yang <span style={{ color: 'var(--color-balapor)' }}>hidup</span>
            </h2>
            <p style={{ fontSize: 14, color: '#6b7280' }}>Tiga layanan terintegrasi untuk Maluku Utara yang lebih baik.</p>
          </div>

          <div className="ekosistem-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20,
          }}>

            {/* COL 1: BAKABAR */}
            <div style={{ background: '#f9f9f8', border: '1px solid #e5e7eb', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#003526', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 20 }}>newspaper</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#003526' }}>BAKABAR</p>
                  <p style={{ fontSize: 10, color: '#6b7280' }}>Berita terkini Maluku Utara</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {BAKABAR_ARTICLES.map((article, i) => (
                  <Link key={i} href="/news" style={{
                    background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10,
                    textDecoration: 'none', display: 'flex', gap: 10, alignItems: 'start',
                    transition: 'border-color 0.2s',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#003526')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  >
                    <div style={{
                      width: 50, height: 50, borderRadius: 8, background: article.bgGrad,
                      flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span className="material-symbols-outlined" style={{ color: article.iconColor, fontSize: 22, opacity: 0.7 }}>{article.icon}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 9, color: article.source === 'BALAPOR' ? 'var(--color-balapor)' : '#6b7280', fontWeight: 700, letterSpacing: 0.5, marginBottom: 2 }}>
                        {article.source === 'BALAPOR' ? 'DARI BALAPOR' : 'EDITORIAL'}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', lineHeight: 1.4, marginBottom: 4 }}>{article.title}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af' }}>{article.meta}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <Link href="/news" style={{
                marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'white', border: '1px solid #003526',
                padding: 10, borderRadius: 10,
                fontSize: 12, fontWeight: 700, color: '#003526', textDecoration: 'none',
              }}>
                Lihat Semua Berita
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>

            {/* COL 2: PRIVASI */}
            <div style={{ background: '#f9f9f8', border: '1px solid #e5e7eb', borderRadius: 18, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#A855F7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>shield</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#1f2937' }}>Privasi Terjaga</p>
                  <p style={{ fontSize: 10, color: '#6b7280' }}>Identitasmu aman by design</p>
                </div>
              </div>

              {/* Yang dilihat publik */}
              <div style={{ background: 'white', borderRadius: 12, padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Yang dilihat publik</p>
                {[
                  { icon: 'check_circle', color: '#10B981', text: 'Foto kejadian (jika perlu blur)', strong: true },
                  { icon: 'check_circle', color: '#10B981', text: 'Lokasi umum & status',             strong: true },
                  { icon: 'cancel',       color: 'var(--color-balapor)', text: 'Nama, WA, alamat lengkap', strong: false },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'start', gap: 6, padding: '3px 0' }}>
                    <span className="material-symbols-outlined" style={{ color: item.color, fontSize: 14, flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                    <span style={{ fontSize: 11, color: item.strong ? '#1f2937' : '#6b7280', lineHeight: 1.4 }}>{item.text}</span>
                  </div>
                ))}
              </div>

              {/* Yang dilihat admin */}
              <div style={{ background: 'white', borderRadius: 12, padding: 14, marginBottom: 14 }}>
                <p style={{ fontSize: 10, fontWeight: 700, color: '#6b7280', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 }}>Yang dilihat admin</p>
                {[
                  { icon: 'check_circle', color: '#10B981', text: 'Nomor WA (untuk update)',  strong: true },
                  { icon: 'check_circle', color: '#10B981', text: 'GPS presisi & detail',     strong: true },
                  { icon: 'cancel',       color: 'var(--color-balapor)', text: 'KTP atau dokumen identitas', strong: false },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'start', gap: 6, padding: '3px 0' }}>
                    <span className="material-symbols-outlined" style={{ color: item.color, fontSize: 14, flexShrink: 0, marginTop: 1, fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                    <span style={{ fontSize: 11, color: item.strong ? '#1f2937' : '#6b7280', lineHeight: 1.4 }}>{item.text}</span>
                  </div>
                ))}
              </div>

              <div style={{
                background: 'rgba(168, 85, 247, 0.08)',
                border: '1px solid rgba(168, 85, 247, 0.2)',
                padding: '10px 12px', borderRadius: 10,
              }}>
                <p style={{ fontSize: 10, color: '#6B21A8', lineHeight: 1.5, display: 'flex', alignItems: 'start', gap: 4 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }}>lock</span>
                  Nomor WA hanya untuk update kamu, tidak pernah diteruskan ke pihak lain.
                </p>
              </div>
            </div>

            {/* COL 3: BADONASI */}
            <div style={{ background: '#f9f9f8', border: '1px solid #e5e7eb', borderRadius: 18, padding: 24, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--color-badonasi)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 20, fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-badonasi)' }}>BADONASI</p>
                  <p style={{ fontSize: 10, color: '#6b7280' }}>Aksi sosial berjalan</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {BADONASI_CAMPAIGNS.map((camp, i) => (
                  <Link key={i} href="/fundraising" style={{
                    background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12,
                    textDecoration: 'none', transition: 'border-color 0.2s', display: 'block',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-badonasi)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: camp.bgGrad, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span className="material-symbols-outlined" style={{ color: camp.iconColor, fontSize: 18 }}>{camp.icon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', lineHeight: 1.3 }}>{camp.title}</p>
                        <p style={{ fontSize: 10, color: '#6b7280' }}>{camp.meta}</p>
                      </div>
                    </div>
                    <div style={{ background: '#fce7f3', height: 5, borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                      <div style={{ background: camp.complete ? '#10B981' : 'var(--color-badonasi)', height: '100%', width: `${camp.pct}%` }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10 }}>
                      <span style={{ color: camp.complete ? '#047857' : '#BE185D', fontWeight: 700 }}>{camp.raised}</span>
                      <span style={{ color: camp.complete ? '#047857' : '#6b7280' }}>{camp.target}</span>
                    </div>
                  </Link>
                ))}
              </div>

              <Link href="/fundraising" style={{
                marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'white', border: '1px solid var(--color-badonasi)',
                padding: 10, borderRadius: 10,
                fontSize: 12, fontWeight: 700, color: 'var(--color-badonasi)', textDecoration: 'none',
              }}>
                Lihat Semua Donasi
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          7. FOUNDING REPORTER
          ════════════════════════════════════════════════════════ */}
      <section style={{ background: 'var(--color-balapor-muted)', padding: '60px 32px' }}>
        <div className="founding-grid" style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center',
        }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'white', padding: '8px 14px', borderRadius: 14,
              marginBottom: 16, border: '1px solid #FCA5A5',
            }}>
              <span className="material-symbols-outlined" style={{ color: 'var(--color-balapor)', fontSize: 16, fontVariationSettings: "'FILL' 1" }}>stars</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7F1D1D', letterSpacing: 1 }}>FOUNDING MEMBERS · 100 PERTAMA</span>
            </div>
            <h2 style={{
              fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#7F1D1D',
              lineHeight: 1.2, letterSpacing: '-0.8px', marginBottom: 16,
            }}>
              Jadi salah satu 100 pelapor pertama Maluku Utara.
            </h2>
            <p style={{ fontSize: 16, color: '#991B1B', lineHeight: 1.65, marginBottom: 24 }}>
              Kamu yang ikut membentuk BALAPOR jadi seperti apa. Suara kalian akan menentukan fitur-fitur berikutnya.
            </p>
            <Link href={FORM_PATH} style={{
              background: 'var(--color-balapor)', color: 'white',
              padding: '16px 32px', borderRadius: 14,
              fontSize: 15, fontWeight: 700, textDecoration: 'none',
              display: 'inline-block',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.35)',
            }}>
              Daftar sebagai pelapor pertama
            </Link>
            <p style={{ marginTop: 12, fontSize: 12, color: '#991B1B' }}>
              Gratis selamanya · cuma butuh nomor WhatsApp
            </p>
          </div>

          <div>
            {[
              { icon: 'stars',       text: 'Badge "Founding Reporter" permanen di profil', filled: true },
              { icon: 'schedule',    text: 'Akses awal ke fitur baru sebelum publik',      filled: false },
              { icon: 'how_to_vote', text: 'Vote langsung untuk fitur prioritas berikutnya', filled: false },
            ].map((perk, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: 14, padding: '16px 20px',
                marginBottom: i < 2 ? 10 : 0, border: '1px solid #FECACA',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-balapor)', fontSize: 22, fontVariationSettings: perk.filled ? "'FILL' 1" : undefined }}>{perk.icon}</span>
                  <p style={{ fontSize: 14, color: '#7F1D1D', fontWeight: 500 }}>{perk.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          8. FAQ — Hybrid Tab + Accordion
          ════════════════════════════════════════════════════════ */}
      <section style={{ background: 'white', padding: '80px 32px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-balapor)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 8 }}>
              PERTANYAAN UMUM
            </p>
            <h2 style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 800, color: '#1f2937', letterSpacing: '-0.8px' }}>
              Yang sering <span style={{ color: 'var(--color-balapor)' }}>ditanyakan</span>
            </h2>
          </div>

          {/* Tabs */}
          <div className="faq-tabs" style={{
            display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32, flexWrap: 'wrap',
            background: '#f9f9f8', padding: 8, borderRadius: 14,
            maxWidth: 'fit-content', marginLeft: 'auto', marginRight: 'auto',
          }}>
            {FAQ_DATA.tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => handleFaqTabChange(tab.id)}
                style={{
                  background: activeFaqTab === tab.id ? '#003526' : 'transparent',
                  color: activeFaqTab === tab.id ? 'white' : '#6b7280',
                  border: 'none', padding: '12px 20px', borderRadius: 12,
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  transition: 'all 0.2s',
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Accordion items */}
          <div>
            {FAQ_DATA.items[activeFaqTab].map(item => {
              const isOpen = openFaqId === item.id;
              return (
                <div
                  key={item.id}
                  style={{
                    background: 'white', border: `1px solid ${isOpen ? 'var(--color-balapor)' : '#e5e7eb'}`,
                    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
                    transition: 'all 0.2s',
                    boxShadow: isOpen ? '0 4px 12px rgba(239, 68, 68, 0.08)' : 'none',
                  }}
                >
                  <div
                    onClick={() => handleFaqToggle(item.id)}
                    style={{
                      padding: '20px 24px', cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
                    }}
                  >
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: '#1f2937' }}>{item.q}</h4>
                    <span
                      className="material-symbols-outlined"
                      style={{
                        color: isOpen ? 'var(--color-balapor)' : '#9ca3af',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.3s ease, color 0.3s ease',
                      }}
                    >expand_more</span>
                  </div>
                  <div style={{
                    maxHeight: isOpen ? 300 : 0,
                    padding: isOpen ? '0 24px 20px' : '0 24px',
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease, padding 0.3s ease',
                  }}>
                    <p
                      style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7 }}
                      dangerouslySetInnerHTML={{ __html: item.a }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          9. FINAL CTA
          ════════════════════════════════════════════════════════ */}
      <section style={{
        background: 'linear-gradient(135deg, #003526 0%, #00251a 100%)',
        padding: 32,
      }}>
        <div className="final-cta-grid" style={{
          maxWidth: 1200, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap',
        }}>
          <div>
            <h2 style={{
              fontSize: 'clamp(20px, 2.5vw, 24px)', fontWeight: 800, color: 'white',
              lineHeight: 1.3, letterSpacing: '-0.5px', marginBottom: 4,
            }}>
              Bersama membangun Maluku Utara
            </h2>
            <h2 style={{
              fontSize: 'clamp(20px, 2.5vw, 24px)', fontWeight: 800, color: 'white',
              lineHeight: 1.3, letterSpacing: '-0.5px',
            }}>
              yang <span style={{ color: 'var(--color-balapor)' }}>lebih baik</span>, satu laporan setiap kalinya.
            </h2>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0, flexWrap: 'wrap' }}>
            <Link href={FORM_PATH} style={{
              background: 'var(--color-balapor)', color: 'white',
              padding: '14px 24px', borderRadius: 12,
              fontSize: 14, fontWeight: 700, textDecoration: 'none',
              display: 'inline-block',
              boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)',
            }}>
              Sampaikan laporanmu
            </Link>
            <a
              href="https://wa.me/6281289539452?text=Halo%20TeraLoka%2C%20saya%20mau%20tanya%20soal%20BALAPOR"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: 'rgba(255,255,255,0.1)', color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                padding: '14px 22px', borderRadius: 12,
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chat</span>
              Tanya via WhatsApp dulu
            </a>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          Inline animations (BALAPOR-specific)
          ────────────────────────────────────────────────────────
          Pakai <style jsx global> agar animation accessible di SVG
          ════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        @keyframes balapor-pulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%      { opacity: 1; transform: scale(1.2); }
        }
        .balapor-pulse {
          animation: balapor-pulse 2s ease-in-out infinite;
          transform-origin: center;
        }

        @keyframes balapor-flow {
          0%   { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .balapor-flow-arrow {
          stroke-dasharray: 5;
          animation: balapor-flow 1.5s linear infinite;
        }

        /* Mobile responsive overrides */
        @media (max-width: 900px) {
          .hero-grid           { grid-template-columns: 1fr !important; gap: 40px !important; }
          .empathy-grid        { grid-template-columns: 1fr !important; }
          .value-props-grid    { grid-template-columns: 1fr !important; }
          .lifecycle-grid      { grid-template-columns: 1fr !important; gap: 16px !important; }
          .lifecycle-chevron   { display: none !important; }
          .categories-grid     { grid-template-columns: 1fr !important; gap: 24px !important; }
          .cat-cards-grid      { grid-template-columns: repeat(2, 1fr) !important; }
          .ekosistem-grid      { grid-template-columns: 1fr !important; }
          .founding-grid       { grid-template-columns: 1fr !important; gap: 32px !important; }
          .synergy-flow        { grid-template-columns: 1fr !important; gap: 24px !important; }
          .synergy-flow svg    { transform: rotate(90deg); margin: 0 auto; }
          .final-cta-grid      { flex-direction: column !important; align-items: flex-start !important; }
        }
      `}</style>
    </div>
  );
}

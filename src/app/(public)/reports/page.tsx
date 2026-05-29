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
//   May 10, 2026 — Day 12 Step 8: BalaporLiveMapSection removed (map moved to hero)
//                  antara Hero & Empathy (Hybrid B+C live map + Phase 0 demo)
// ════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { HeroSection } from '@/components/balapor/hero-section';
import { CaraKerjaSection } from '@/components/balapor/cara-kerja-section';
import { FiturUtamaSection } from '@/components/balapor/fitur-utama-section';
import { TantanganManifestoSlide } from '@/components/balapor/tantangan-manifesto-slide';
import { KomunitasAwalSection } from '@/components/balapor/komunitas-awal-section';
import { EkosistemSection } from '@/components/balapor/ekosistem-section';

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

// ─── Ekosistem LIVE data (29 Mei 2026) ──────────────────────────
// Card BAKABAR & BADONASI fetch data asli dari endpoint public.
// Mock di atas = FALLBACK (LP gak pernah blank kalau fetch gagal).
// Transform API → shape card yang SAMA → JSX nyaris gak berubah.
//   - BAKABAR  ← GET /content/articles (badge=category, link=slug, view_count)
//   - BADONASI ← GET /funding/campaigns (collected/target → pct, donor_count)

const ECO_API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'https://api.teraloka.com/api/v1';

interface ArticleCard {
  source: string; title: string; meta: string;
  icon: string; bgGrad: string; iconColor: string; href?: string; imageUrl?: string | null;
}
interface CampaignCard {
  title: string; meta: string; raised: string; target: string; pct: number;
  icon: string; bgGrad: string; iconColor: string; complete: boolean; href?: string; imageUrl?: string | null;
}

// Visual presets dicycle by index → identitas visual card tetap konsisten
const ART_PRESETS = [
  { icon: 'article',     bgGrad: 'linear-gradient(135deg, #fef2f2, #fecaca)', iconColor: 'var(--color-balapor)' },
  { icon: 'description', bgGrad: 'linear-gradient(135deg, #fef3c7, #fcd34d)', iconColor: '#92400E' },
  { icon: 'newspaper',   bgGrad: 'linear-gradient(135deg, #dbeafe, #93c5fd)', iconColor: '#1D4ED8' },
];
const CAMP_PRESETS = [
  { icon: 'volunteer_activism', bgGrad: 'linear-gradient(135deg, #fce7f3, #f9a8d4)', iconColor: '#BE185D' },
  { icon: 'favorite',           bgGrad: 'linear-gradient(135deg, #fef3c7, #fcd34d)', iconColor: '#92400E' },
  { icon: 'diversity_3',        bgGrad: 'linear-gradient(135deg, #dbeafe, #93c5fd)', iconColor: '#1D4ED8' },
];

function ecoRelTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (isNaN(m)) return '';
  if (m < 1) return 'baru saja';
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  return `${Math.floor(d / 7)} minggu lalu`;
}
function ecoReads(n: number): string {
  const v = Number(n) || 0;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace('.0', '')}rb`;
  return String(v);
}
function ecoRupiah(n: number): string {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `Rp ${(v / 1_000_000_000).toFixed(1).replace('.0', '')} M`;
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toFixed(1).replace('.0', '')} jt`;
  if (v >= 1_000) return `Rp ${Math.round(v / 1_000)} rb`;
  return `Rp ${v}`;
}
function ecoCapitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}

interface RawArticle {
  title: string; slug?: string | null; category?: string | null;
  view_count?: number; published_at?: string; cover_image_url?: string | null;
}
interface RawCampaign {
  title: string; slug?: string | null; status?: string;
  target_amount?: number; collected_amount?: number; donor_count?: number;
  cover_image_url?: string | null;
}

function mapArticlesToCards(items: RawArticle[]): ArticleCard[] {
  return items.slice(0, 3).map((a, i) => ({
    source: a.category ? ecoCapitalize(a.category) : 'BAKABAR',
    title: a.title,
    meta: `${ecoReads(a.view_count ?? 0)} dibaca · ${ecoRelTime(a.published_at ?? '')}`,
    href: a.slug ? `/bakabar/${a.slug}` : '/bakabar',
    imageUrl: a.cover_image_url ?? null,
    ...ART_PRESETS[i % ART_PRESETS.length],
  }));
}
function mapCampaignsToCards(items: RawCampaign[]): CampaignCard[] {
  return items.slice(0, 3).map((c, i) => {
    const target = Number(c.target_amount) || 0;
    const collected = Number(c.collected_amount) || 0;
    const pct = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
    const complete = (Boolean(c.status) && c.status !== 'active') || pct >= 100;
    return {
      title: c.title,
      meta: `${c.donor_count ?? 0} donatur · ${complete ? 'Tercapai' : 'Aktif'}`,
      raised: ecoRupiah(collected) + (complete ? ' ✓' : ''),
      target: complete ? '100%' : `dari ${ecoRupiah(target)}`,
      pct,
      complete,
      href: c.slug ? `/fundraising/${c.slug}` : '/fundraising',
      imageUrl: c.cover_image_url ?? null,
      ...CAMP_PRESETS[i % CAMP_PRESETS.length],
    };
  });
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
export default function BalaporLandingPage() {
  // FAQ state
  const [activeFaqTab, setActiveFaqTab] = useState(0);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  // Ekosistem live data — init = mock (fallback), fetch real on mount.
  // Kalau fetch gagal → state tetap mock → card gak pernah blank.
  const [articles, setArticles] = useState<ArticleCard[]>(BAKABAR_ARTICLES);
  const [campaigns, setCampaigns] = useState<CampaignCard[]>(BADONASI_CAMPAIGNS);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch(`${ECO_API_BASE}/content/articles?limit=3`, { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        const items = (json?.data ?? json) as RawArticle[];
        if (Array.isArray(items) && items.length > 0) setArticles(mapArticlesToCards(items));
      } catch { /* keep mock fallback */ }
    })();

    (async () => {
      try {
        const res = await fetch(`${ECO_API_BASE}/funding/campaigns?limit=3`, { signal: controller.signal });
        if (!res.ok) return;
        const json = await res.json();
        const items = (json?.data ?? json) as RawCampaign[];
        if (Array.isArray(items) && items.length > 0) setCampaigns(mapCampaignsToCards(items));
      } catch { /* keep mock fallback */ }
    })();

    return () => controller.abort();
  }, []);

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
          1. HERO (LEGEND)
          ════════════════════════════════════════════════════════ */}
      <HeroSection />


      {/* ════════════════════════════════════════════════════════
          2. CARA KERJA BALAPOR (LEGEND)
          ════════════════════════════════════════════════════════ */}
      <CaraKerjaSection />


      {/* ════════════════════════════════════════════════════════
          3. CATEGORIES — Kamu bisa Laporkan Berbagai Hal (Day 13)
          ════════════════════════════════════════════════════════ */}
      <section style={{ background: 'linear-gradient(135deg, #001a13 0%, #003526 100%)', padding: '80px 32px', position: 'relative', overflow: 'hidden' }}>
        {/* Decorative dot pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(149, 211, 186, 0.06) 1px, transparent 0)',
          backgroundSize: '24px 24px', pointerEvents: 'none',
        }} />

        <div className="categories-grid" style={{
          maxWidth: 1200, margin: '0 auto', position: 'relative',
          display: 'grid', gridTemplateColumns: '280px 1fr', gap: 48, alignItems: 'start',
        }}>
          <div>
            <h2 style={{
              fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 800, color: 'white',
              letterSpacing: '-0.8px', lineHeight: 1.2, marginBottom: 12,
            }}>
              Kamu bisa laporkan<br />
              <span style={{ color: 'var(--color-balapor)' }}>berbagai hal</span>
            </h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.65)', lineHeight: 1.6, marginBottom: 20 }}>
              Mulai dari yang kecil hingga yang berdampak besar.
            </p>
            <Link href={FORM_PATH} style={{
              background: 'var(--color-balapor)', border: 'none',
              padding: '12px 20px', borderRadius: 10,
              fontSize: 13, fontWeight: 700, color: 'white',
              display: 'inline-flex', alignItems: 'center', gap: 6,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s ease',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.45)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.35)';
              }}
            >
              Mulai laporkan
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </Link>
          </div>

          <div className="cat-cards-grid" style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12,
          }}>
            {CATEGORIES.map(cat => (
              <div key={cat.key} style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: 14, padding: 16,
                display: 'flex', gap: 12, alignItems: 'start',
                transition: 'all 0.3s ease',
                cursor: 'default',
              }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
                  e.currentTarget.style.transform = 'translateY(-3px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(239, 68, 68, 0.20)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(239, 68, 68, 0.20)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span className="material-symbols-outlined" style={{ color: 'var(--color-balapor)', fontSize: 20 }}>{cat.icon}</span>
                </div>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'white', marginBottom: 2 }}>{cat.label}</p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{cat.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          4. FITUR UTAMA — Dibangun untuk warga (LEGEND)
          ════════════════════════════════════════════════════════ */}
      <FiturUtamaSection />


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

            {/* COL 1: BAKABAR — purple brand identity */}
            <div className="ekosistem-card-anim" style={{
              background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
              border: '1px solid rgba(139, 92, 246, 0.25)',
              borderRadius: 18, padding: 24,
              display: 'flex', flexDirection: 'column',
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.10)',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 36px rgba(139, 92, 246, 0.20)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(139, 92, 246, 0.10)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.25)';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #8B5CF6, #5B21B6)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #8B5CF6, #5B21B6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(139, 92, 246, 0.30)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 22, fontVariationSettings: "'FILL' 1, 'wght' 700" }}>newspaper</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#5B21B6' }}>BAKABAR</p>
                  <p style={{ fontSize: 10, color: '#6b7280' }}>Berita terkini Maluku Utara</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {articles.map((article, i) => (
                  <Link key={i} href={article.href ?? '/bakabar'} style={{
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
                      overflow: 'hidden',
                    }}>
                      {article.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={article.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <span className="material-symbols-outlined" style={{ color: article.iconColor, fontSize: 22, opacity: 0.7 }}>{article.icon}</span>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 9, color: '#6b7280', fontWeight: 700, letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' }}>
                        {article.source}
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#1f2937', lineHeight: 1.4, marginBottom: 4 }}>{article.title}</p>
                      <p style={{ fontSize: 10, color: '#9ca3af' }}>{article.meta}</p>
                    </div>
                  </Link>
                ))}
              </div>

              <Link href="/bakabar" style={{
                marginTop: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                background: 'white', border: '1px solid #003526',
                padding: 10, borderRadius: 10,
                fontSize: 12, fontWeight: 700, color: '#003526', textDecoration: 'none',
              }}>
                Lihat Semua Berita
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
              </Link>
            </div>

            {/* COL 2: PRIVASI — violet purple identity */}
            <div className="ekosistem-card-anim" style={{
              background: 'linear-gradient(135deg, #FAF5FF 0%, #F3E8FF 100%)',
              border: '1px solid rgba(168, 85, 247, 0.25)',
              borderRadius: 18, padding: 24,
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px rgba(168, 85, 247, 0.10)',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 36px rgba(168, 85, 247, 0.20)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(168, 85, 247, 0.10)';
                e.currentTarget.style.borderColor = 'rgba(168, 85, 247, 0.25)';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #A855F7, #7E22CE)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #A855F7, #7E22CE)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(168, 85, 247, 0.30)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>shield</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#7E22CE' }}>Privasi Terjaga</p>
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

            {/* COL 3: BADONASI — pink brand identity */}
            <div className="ekosistem-card-anim" style={{
              background: 'linear-gradient(135deg, #FDF2F8 0%, #FCE7F3 100%)',
              border: '1px solid rgba(236, 72, 153, 0.25)',
              borderRadius: 18, padding: 24,
              display: 'flex', flexDirection: 'column',
              position: 'relative', overflow: 'hidden',
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 14px rgba(236, 72, 153, 0.10)',
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)';
                e.currentTarget.style.boxShadow = '0 16px 36px rgba(236, 72, 153, 0.20)';
                e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.50)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(236, 72, 153, 0.10)';
                e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.25)';
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #EC4899, #BE185D)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: 'linear-gradient(135deg, #EC4899, #BE185D)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(236, 72, 153, 0.30)' }}>
                  <span className="material-symbols-outlined" style={{ color: 'white', fontSize: 22, fontVariationSettings: "'FILL' 1" }}>favorite</span>
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-badonasi)' }}>BADONASI</p>
                  <p style={{ fontSize: 10, color: '#6b7280' }}>Aksi sosial berjalan</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                {campaigns.map((camp, i) => (
                  <Link key={i} href={camp.href ?? '/fundraising'} style={{
                    background: 'white', border: '1px solid #e5e7eb', borderRadius: 10, padding: 12,
                    textDecoration: 'none', transition: 'border-color 0.2s', display: 'block',
                  }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-badonasi)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e7eb')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: camp.bgGrad, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {camp.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={camp.imageUrl} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span className="material-symbols-outlined" style={{ color: camp.iconColor, fontSize: 18 }}>{camp.icon}</span>
                        )}
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
          6. TANTANGAN + MANIFESTO MERGED SLIDE (Day 12 LEGEND)
          ════════════════════════════════════════════════════════ */}
      <TantanganManifestoSlide />


      {/* ════════════════════════════════════════════════════════
          7. KOMUNITAS AWAL — Jadilah Bagian Dari Perubahan (LEGEND)
          ════════════════════════════════════════════════════════ */}
      <KomunitasAwalSection />


      {/* ════════════════════════════════════════════════════════
          8. EKOSISTEM CAROUSEL — 6 Layanan 1 Aplikasi (LEGEND)
          Discovery 6 services TeraLoka full coverage.
          Complement existing 3-col deep content above.
          ════════════════════════════════════════════════════════ */}
      <EkosistemSection />

      {/* ════════════════════════════════════════════════════════
          9. FAQ — Hybrid Tab + Accordion
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
          10. SUARA KECIL — Final pitch banner (LEGEND fix)
          Global <Footer /> dari layout.tsx akan tampil otomatis di bawah.
          ════════════════════════════════════════════════════════ */}
      <section
        style={{
          background: 'linear-gradient(135deg, #001a13 0%, #003526 100%)',
          padding: '40px 32px',
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            gap: 24,
            justifyContent: 'space-between',
            flexWrap: 'wrap',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flex: '1 1 auto',
              minWidth: 280,
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 14,
                background: 'rgba(149, 211, 186, 0.12)',
                border: '1px solid rgba(149, 211, 186, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{
                  color: '#95d3ba',
                  fontSize: 28,
                  fontVariationSettings: "'FILL' 1, 'wght' 600",
                }}
              >
                campaign
              </span>
            </div>

            <div>
              <h2
                style={{
                  fontSize: 'clamp(18px, 2.5vw, 22px)',
                  fontWeight: 800,
                  color: 'white',
                  lineHeight: 1.2,
                  letterSpacing: '-0.5px',
                  marginBottom: 4,
                }}
              >
                Suara kecil bisa membawa{' '}
                <span style={{ color: 'var(--color-balapor)' }}>
                  perubahan besar
                </span>
                .
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: 'rgba(255,255,255,0.65)',
                }}
              >
                Mulai laporan pertamamu sekarang.
              </p>
            </div>
          </div>

          <Link
            href="/balapor/buat-laporan"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'var(--color-balapor)',
              color: 'white',
              padding: '14px 28px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 800,
              textDecoration: 'none',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)',
              flexShrink: 0,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
              add_circle
            </span>
            Buat Laporan Sekarang
          </Link>
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

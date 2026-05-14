// ════════════════════════════════════════════════════════════════
// BAKABAR — Region Data v4 (Phase 1 Sub-Sprint 5D)
// ────────────────────────────────────────────────────────────────
// Updates dari v3:
//   - HERO_SLIDER_ARTICLES REPLACED dengan HERO_CAROUSEL_SLIDES
//   - Each slide = { hero, secondary: [mini1, mini2] }
//   - Total 3 slides × 3 articles = 9 dummy articles (FIFO order)
//   - Kumparan-style: ENTIRE Hero area swaps, bukan cuma bottom cards
// ════════════════════════════════════════════════════════════════

export type ServiceVariant = 'bakos' | 'bapasiar' | 'badonasi' | 'balapor';

export type DummyArticle = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  category: string;
  published_at: string;
  source?: 'editorial' | 'rss' | 'balapor';
  source_name?: string;
  external_url?: string;
  thumb_class?: string;
  cover_image_url?: string | null;
  is_viral?: boolean;
};

export type StackBannerAd = {
  brand_class: string;
  overline: string;
  title: string;
  body: string;
  cta_label: string;
};

export type InlineBannerAdData = {
  brand_class: string;
  badge_label: string;
  badge_style?: 'iklan' | 'teraloka';
  overline: string;
  title: string;
  body: string;
  cta_label: string;
  cta_href?: string;
};

export type RegionConfig = {
  slug: string;
  label: string;
  short_label: string;
  gradient_class: string;
  layanan_variant: ServiceVariant;
  layanan_body: string;
  featured: DummyArticle;
  trending_list: DummyArticle[];
  stack_banner: StackBannerAd;
};

export type LayananListItem = {
  variant: ServiceVariant;
  name: string;
  tagline: string;
  icon: string;
  href: string;
  cta_label: string;
};

// NEW v4: Hero carousel slide structure
export type HeroSlide = {
  hero: DummyArticle;
  secondary: [DummyArticle, DummyArticle];  // exactly 2 mini cards
};

// ─── Top Leaderboard ──────────────────────────────────────────
export const TOP_LEADERBOARD: InlineBannerAdData = {
  brand_class: 'b-toplead-mandiri',
  badge_label: 'Iklan',
  badge_style: 'iklan',
  overline: 'BANK MANDIRI · UMKM Maluku Utara',
  title: 'Pinjaman UMKM hingga Rp 500 Juta',
  body: 'Bunga ringan, proses cepat untuk pelaku usaha Maluku Utara. Cabang Ternate, Tobelo, Tidore.',
  cta_label: 'Ajukan Sekarang',
  cta_href: '#ad-mandiri',
};

// ─── Hero Sidebar Mrec ────────────────────────────────────────
export const SIDEBAR_MREC: StackBannerAd = {
  brand_class: 'b-mrec-bank',
  overline: 'Bank Maluku Utara',
  title: 'Tabungan Dana Bahari',
  body: 'Bunga 5% per tahun, gratis biaya admin selamanya',
  cta_label: 'Buka Tabungan',
};

// ─── Hero Carousel Slides (NEW v4) ────────────────────────────
// 3 slides × 3 articles each = 9 total, FIFO order (newest first).
// Slide 1 hero akan di-override dengan realArticles[0] dari backend
// jika tersedia (di page.tsx).
export const HERO_CAROUSEL_SLIDES: HeroSlide[] = [
  {
    // SLIDE 1 — Berita politik MalUt (most recent)
    hero: {
      id: 'hc-h1',
      title: 'Pertanyaan Besar di Balik Penundaan Pengangkatan Pejabat Maluku Utara',
      slug: 'pertanyaan-besar-penundaan-pejabat-malut',
      excerpt: 'Setelah berbulan-bulan menunggu, masyarakat Maluku Utara mulai mempertanyakan keterlambatan proses pengangkatan pejabat di lingkup pemerintah provinsi. Apa sebenarnya yang terjadi?',
      category: 'politik',
      published_at: new Date(Date.now() - 3600000).toISOString(),
      source: 'editorial',
    },
    secondary: [
      {
        id: 'hc-s1a',
        title: 'Pelabuhan Bastiong Resmi Dilengkapi Sistem Keamanan Modern',
        slug: 'bastiong-keamanan-modern',
        category: 'infrastruktur',
        published_at: new Date(Date.now() - 5400000).toISOString(),
        source: 'editorial',
        thumb_class: 'thumb-9',
      },
      {
        id: 'hc-s1b',
        title: 'Festival Cendera Ternate Sedot Wisatawan Domestik & Mancanegara',
        slug: 'festival-cendera-ternate',
        category: 'budaya',
        published_at: new Date(Date.now() - 7200000).toISOString(),
        source: 'editorial',
        thumb_class: 'thumb-2',
      },
    ],
  },
  {
    // SLIDE 2 — Berita kesehatan + cuaca
    hero: {
      id: 'hc-h2',
      title: 'Bupati Halut Resmikan RSUD Tobelo Tipe B, Kini Layanan 24 Jam dengan 6 Spesialis',
      slug: 'rsud-tobelo-tipe-b',
      excerpt: 'Peresmian RSUD Tobelo menandai babak baru pelayanan kesehatan Halmahera Utara dengan fasilitas lengkap, ruang ICU, dan 6 dokter spesialis bertugas penuh waktu.',
      category: 'kesehatan',
      published_at: new Date(Date.now() - 10800000).toISOString(),
      source: 'editorial',
    },
    secondary: [
      {
        id: 'hc-s2a',
        title: 'BMKG: Potensi Cuaca Ekstrem di Perairan Maluku Utara Pekan Ini',
        slug: 'bmkg-cuaca-ekstrem-malut',
        category: 'cuaca',
        published_at: new Date(Date.now() - 14400000).toISOString(),
        source: 'rss',
        source_name: 'BAKABAR Nasional',
        thumb_class: 'thumb-3',
      },
      {
        id: 'hc-s2b',
        title: 'Hutan Mangrove Sofifi Menyusut 30% dalam 5 Tahun Terakhir, Aktivis Bersuara',
        slug: 'mangrove-sofifi-menyusut',
        category: 'lingkungan',
        published_at: new Date(Date.now() - 18000000).toISOString(),
        source: 'editorial',
        thumb_class: 'thumb-6',
      },
    ],
  },
  {
    // SLIDE 3 — Berita ekonomi + pendidikan
    hero: {
      id: 'hc-h3',
      title: 'PT Antam Umumkan Investasi Rp 8 Triliun untuk Pembangunan Smelter Nikel Halmahera Barat',
      slug: 'antam-smelter-halbar',
      excerpt: 'Smelter senilai Rp 8 triliun direncanakan beroperasi 2028, ditargetkan menyerap 3.000 tenaga kerja lokal dan menghasilkan nikel battery-grade untuk pasar global.',
      category: 'ekonomi',
      published_at: new Date(Date.now() - 21600000).toISOString(),
      source: 'editorial',
    },
    secondary: [
      {
        id: 'hc-s3a',
        title: 'UNKHAIR Ternate Buka Beasiswa Penuh untuk 500 Mahasiswa MalUt 2026/27',
        slug: 'unkhair-beasiswa-2026',
        category: 'pendidikan',
        published_at: new Date(Date.now() - 25200000).toISOString(),
        source: 'editorial',
        thumb_class: 'thumb-4',
      },
      {
        id: 'hc-s3b',
        title: 'Garuda Buka Rute Baru Jakarta–Ternate via Manado Mulai Juli 2026',
        slug: 'garuda-rute-jakarta-ternate',
        category: 'transportasi',
        published_at: new Date(Date.now() - 28800000).toISOString(),
        source: 'rss',
        source_name: 'BAKABAR Nasional',
        thumb_class: 'thumb-1',
      },
    ],
  },
];

// ─── Layanan TeraLoka List (KEEP — untuk cross-promo Col 3) ───
// Tetap ada walaupun Col 3 v9 revert ke stack. Bisa dipakai di Phase 2.
export const LAYANAN_LIST: LayananListItem[] = [
  { variant: 'bakos', name: 'BAKOS', tagline: 'Komunitas warga MalUt. Diskusi & jaringan tetangga.', icon: '💬', href: '/kos', cta_label: 'Gabung' },
  { variant: 'bapasiar', name: 'BAPASIAR', tagline: 'Marketplace MalUt. Jual-beli produk lokal.', icon: '🛒', href: '/speed', cta_label: 'Cek' },
  { variant: 'badonasi', name: 'BADONASI', tagline: 'Galang donasi tetangga. Transparan & verified.', icon: '🤲', href: '/fundraising', cta_label: 'Galang' },
  { variant: 'balapor', name: 'BALAPOR', tagline: 'Lapor masalah sekitar. Identitas terlindungi.', icon: '📢', href: '/balapor', cta_label: 'Lapor' },
];

// ─── Terpopuler list ──────────────────────────────────────────
export const TERPOPULER_LIST: DummyArticle[] = [
  { id: 't1', title: 'Bali United Hajar Malut United 4-1 di Stadion Wijayakusuma', slug: 'bali-united-hajar', category: 'olahraga', published_at: new Date().toISOString() },
  { id: 't2', title: 'Pertanyaan Besar di Balik Penundaan Pengangkatan Pejabat MalUt', slug: 'pertanyaan-pejabat', category: 'politik', published_at: new Date().toISOString() },
  { id: 't3', title: 'Hutan Mangrove Sofifi Menyusut 30% dalam 5 Tahun', slug: 'mangrove-sofifi', category: 'lingkungan', published_at: new Date().toISOString() },
  { id: 't4', title: 'Festival Legu Gam 2026 Diundur ke Akhir Juni', slug: 'festival-legu-gam', category: 'budaya', published_at: new Date().toISOString() },
  { id: 't5', title: 'Pembangunan PLTU Tidore Kepulauan Capai 80% Progress', slug: 'pltu-tidore', category: 'infrastruktur', published_at: new Date().toISOString() },
];

// ─── Inline Banner Ads ────────────────────────────────────────
export const INLINE_BANNERS: InlineBannerAdData[] = [
  { brand_class: 'b-tlkm', badge_label: 'Iklan', badge_style: 'iklan', overline: 'Telkomsel · Halo+ MalUt', title: 'Paket Internet Halo+ 50GB Cuma Rp 99rb/Bulan', body: 'Promo spesial pelanggan Telkomsel Maluku Utara · Sinyal 4G+ di 10 kabupaten/kota', cta_label: 'Aktivasi' },
  { brand_class: 'b-teraloka', badge_label: 'Layanan', badge_style: 'teraloka', overline: 'TeraLoka · BADONASI', title: 'Galang Donasi untuk Tetangga yang Butuh Bantuan', body: 'Platform crowdfunding khusus Maluku Utara · Transparan & terpercaya', cta_label: 'Mulai Galang', cta_href: '/fundraising' },
  { brand_class: 'b-mandiri', badge_label: 'Iklan', badge_style: 'iklan', overline: 'Bank Mandiri', title: 'KPR Ringan untuk Pegawai Maluku Utara — Bunga 4,75%/Tahun', body: 'Tenor hingga 25 tahun, biaya admin 0%, plafon hingga Rp 1.5 Miliar', cta_label: 'Cek Simulasi' },
  { brand_class: 'b-bumn', badge_label: 'Iklan', badge_style: 'iklan', overline: 'PT PLN · UID Maluku-MalUt', title: 'Promo Tambah Daya Hemat 50% — Khusus Pelanggan Maluku Utara', body: 'Periode 1 Mei - 30 Juni 2026 · Daftar online lewat PLN Mobile', cta_label: 'Daftar Promo' },
  { brand_class: 'b-property2', badge_label: 'Iklan', badge_style: 'iklan', overline: 'Sahid Land MalUt', title: 'Perumahan Subsidi Akehuda — DP 5 Juta, Cicil 15 Tahun', body: 'Lokasi strategis Ternate Selatan · Sertifikat SHM · Lingkungan ramah keluarga', cta_label: 'Survey Lokasi' },
];

// ─── HERO_ARTICLE legacy fallback (used only if HERO_CAROUSEL_SLIDES somehow empty) ───
export const HERO_ARTICLE: DummyArticle = HERO_CAROUSEL_SLIDES[0].hero;

// ─── 12 Regions ───────────────────────────────────────────────
export const REGIONS: RegionConfig[] = [
  { slug: 'nasional', label: 'Berita Nasional', short_label: 'Nasional', gradient_class: 't-nasional', layanan_variant: 'bakos', layanan_body: 'Komunitas warga MalUt untuk diskusi & info terkini.', featured: { id: 'nas-f1', title: 'Presiden Sahkan UU Cipta Kerja Daerah, Maluku Utara Termasuk Wilayah Prioritas', slug: 'uu-cipta-kerja-daerah-malut', category: 'nasional', published_at: new Date(Date.now() - 86400000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional' }, trending_list: [
    { id: 'nas-l1', title: 'Pemerintah Pusat Alokasikan Rp 4,2 Triliun untuk Infrastruktur MalUt', slug: 'apbn-malut-4-2-triliun', category: 'nasional', published_at: new Date(Date.now() - 86400000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional', thumb_class: 'thumb-9' },
    { id: 'nas-l2', title: 'Menteri Pariwisata Resmikan Program Wisata Bahari 2026 di Jakarta', slug: 'wisata-bahari-2026', category: 'nasional', published_at: new Date(Date.now() - 172800000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional', thumb_class: 'thumb-5' },
    { id: 'nas-l3', title: 'BI Pertahankan Suku Bunga Acuan di Level 5,25% untuk Mei 2026', slug: 'bi-suku-bunga-mei', category: 'nasional', published_at: new Date(Date.now() - 259200000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional', thumb_class: 'thumb-3' },
    { id: 'nas-l4', title: 'Kemendikbud Luncurkan Program Guru Penggerak Tahap V', slug: 'guru-penggerak-v', category: 'nasional', published_at: new Date(Date.now() - 345600000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional', thumb_class: 'thumb-4' },
    { id: 'nas-l5', title: 'DPR Sahkan RUU Anti Politik Uang, Berlaku Pilkada 2027', slug: 'ruu-anti-politik-uang', category: 'nasional', published_at: new Date(Date.now() - 432000000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional', thumb_class: 'thumb-1' },
    { id: 'nas-l6', title: 'Garuda Buka Rute Baru Jakarta–Ternate via Manado Mulai Juli 2026', slug: 'garuda-rute-jakarta-ternate', category: 'nasional', published_at: new Date(Date.now() - 518400000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional', thumb_class: 'thumb-2' },
    { id: 'nas-l7', title: 'Kementerian ESDM Tinjau Tambang Nikel di Halmahera Tengah', slug: 'esdm-nikel-halteng', category: 'nasional', published_at: new Date(Date.now() - 604800000).toISOString(), source: 'rss', source_name: 'BAKABAR Nasional', thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-telkom', overline: 'Telkomsel Halo+', title: 'Paket 50GB', body: 'Cuma Rp 99rb · Pelanggan MalUt', cta_label: 'Aktivasi' } },
  { slug: 'ternate', label: 'Berita Ternate', short_label: 'Ternate', gradient_class: 't-ternate', layanan_variant: 'bakos', layanan_body: 'Komunitas warga Ternate. Info & jaringan tetangga.', featured: { id: 'tnt-f1', title: 'Walikota Ternate Resmikan Pembangunan Pasar Bahari Berkesan Tahap II Senilai Rp 18 Miliar', slug: 'walikota-ternate-pasar-bahari', category: 'pemerintahan', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'tnt-l1', title: 'Pelabuhan Bastiong Tindak Tegas Pungli, Kapolda Turun Langsung', slug: 'bastiong-pungli', category: 'kriminal', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'tnt-l2', title: 'Festival Cendera Digelar Lebih Meriah di Pelataran Kedaton', slug: 'festival-cendera', category: 'budaya', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'tnt-l3', title: 'Jatiland Mall Buka Outlet H&M Pertama di Maluku Utara', slug: 'jatiland-hm', category: 'ekonomi', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'tnt-l4', title: 'UNKHAIR Buka Program Magister Bidang Maritim 2026/27', slug: 'unkhair-magister-maritim', category: 'pendidikan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'tnt-l5', title: 'Pantai Sulamadaha Bersih Pasca Gotong Royong Pemuda', slug: 'sulamadaha-bersih', category: 'sosial', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'tnt-l6', title: 'Polres Ternate Bongkar Sindikat Penipuan Online di Bastiong', slug: 'penipuan-online-bastiong', category: 'kriminal', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'tnt-l7', title: 'Bandara Sultan Babullah Tambah Rute Penerbangan Domestik', slug: 'babullah-rute-baru', category: 'transportasi', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-bank', overline: 'Bank Mandiri', title: 'KPR Ringan', body: 'Bunga 4,75%/tahun · Tenor 25 tahun', cta_label: 'Ajukan' } },
  { slug: 'sofifi', label: 'Berita Sofifi', short_label: 'Sofifi', gradient_class: 't-sofifi', layanan_variant: 'bapasiar', layanan_body: 'Marketplace MalUt. Jual produk lokal.', featured: { id: 'sof-f1', title: 'DPRD Maluku Utara Sahkan APBD-P 2026: Fokus Infrastruktur Pesisir dan Pendidikan', slug: 'dprd-malut-apbd-p-2026', category: 'politik', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'sof-l1', title: 'Gubernur MalUt Terbitkan Perda Baru tentang Pengelolaan Pesisir', slug: 'perda-pesisir-malut', category: 'pemerintahan', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'sof-l2', title: 'Dinas Kesehatan Provinsi Distribusikan 5.000 Vaksin Polio ke 10 Kabupaten', slug: 'vaksin-polio-malut', category: 'kesehatan', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'sof-l3', title: 'Pelabuhan Sofifi Dibenahi, Target Siap Operasional Penuh Juli 2026', slug: 'pelabuhan-sofifi-2026', category: 'infrastruktur', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'sof-l4', title: 'PNS Sofifi Wajib Lapor LHKPN Tahap II Mulai Mei', slug: 'lhkpn-sofifi-tahap-2', category: 'pemerintahan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'sof-l5', title: 'Pusat Pemerintahan Sofifi Tambah 3 Gedung Dinas Tahun Ini', slug: 'gedung-dinas-sofifi', category: 'infrastruktur', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-7' },
    { id: 'sof-l6', title: 'Anggaran Stunting MalUt Naik 35% di APBD-P 2026', slug: 'anggaran-stunting-malut', category: 'kesehatan', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-8' },
    { id: 'sof-l7', title: 'Sofifi Tuan Rumah Rakorgub Indonesia Timur Bulan Depan', slug: 'rakorgub-sofifi', category: 'politik', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-9' },
  ], stack_banner: { brand_class: 'b-pln', overline: 'PT PLN', title: 'Tambah Daya 50%', body: 'Diskon khusus pelanggan Sofifi', cta_label: 'Cek Promo' } },
  { slug: 'tidore', label: 'Berita Tidore', short_label: 'Tidore', gradient_class: 't-tidore', layanan_variant: 'balapor', layanan_body: 'Lapor masalah lingkungan Tidore.', featured: { id: 'tid-f1', title: 'Festival Legu Gam 2026 Diundur ke Akhir Juni, Panitia Beri Penjelasan Resmi', slug: 'festival-legu-gam-2026', category: 'budaya', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'tid-l1', title: 'Pembangunan PLTU Tidore Kepulauan Capai 80% Progress', slug: 'pltu-tidore-80persen', category: 'infrastruktur', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'tid-l2', title: 'Walikota Tidore Apresiasi Capaian Adipura Berturut-turut', slug: 'tidore-adipura', category: 'pemerintahan', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'tid-l3', title: 'Kesultanan Tidore Rayakan Hari Jadi ke-915 Tahun', slug: 'tidore-915-tahun', category: 'budaya', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'tid-l4', title: 'Petani Cengkeh Tidore Catat Hasil Panen Tertinggi 5 Tahun Terakhir', slug: 'cengkeh-tidore-panen', category: 'ekonomi', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'tid-l5', title: 'Wisata Sejarah Benteng Tahula Direvitalisasi Pemkot', slug: 'benteng-tahula', category: 'wisata', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'tid-l6', title: 'SMA Negeri 1 Tidore Juara Lomba Karya Tulis Ilmiah Provinsi', slug: 'sman1-tidore-kti', category: 'pendidikan', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'tid-l7', title: 'Hutan Mangrove Tidore Ditanami 10.000 Bibit Baru', slug: 'mangrove-tidore-bibit', category: 'lingkungan', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-tourism', overline: 'Dinas Pariwisata', title: 'Festival Bahari', body: '15-20 Juli 2026 · Pantai Goto', cta_label: 'Info' } },
  { slug: 'halbar', label: 'Berita Halbar', short_label: 'Halbar', gradient_class: 't-halbar', layanan_variant: 'badonasi', layanan_body: 'Galang donasi untuk warga Halbar.', featured: { id: 'hbr-f1', title: 'Pemkab Halmahera Barat Buka Sentra Produksi Kopra Modern di Jailolo, Petani Diuntungkan', slug: 'kopra-jailolo-halbar', category: 'ekonomi', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'hbr-l1', title: 'Bupati Halbar Resmikan Jembatan Penghubung Antara Desa Bobaneigo', slug: 'jembatan-bobaneigo', category: 'infrastruktur', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'hbr-l2', title: 'Festival Tanjung Halmahera Sukses, Wisatawan Naik 40%', slug: 'tanjung-halmahera-festival', category: 'wisata', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'hbr-l3', title: 'Air Bersih Capai 95% Desa di Halbar Pasca Program Pamsimas', slug: 'pamsimas-halbar', category: 'sosial', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'hbr-l4', title: 'SMP Jailolo Juara Tingkat Provinsi Karya Tulis Lingkungan', slug: 'smp-jailolo-juara', category: 'pendidikan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'hbr-l5', title: 'Halbar Catat Penurunan Stunting 8% di Triwulan I 2026', slug: 'stunting-halbar-turun', category: 'kesehatan', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'hbr-l6', title: 'Pelabuhan Jailolo Dilengkapi Fasilitas Karantina Modern', slug: 'jailolo-karantina', category: 'infrastruktur', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'hbr-l7', title: 'Petani Halbar Diberi Bantuan Bibit Padi Unggul', slug: 'bibit-padi-halbar', category: 'ekonomi', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-antam', overline: 'PT Antam', title: 'Karir Tambang', body: 'Rekrutmen tenaga lokal Halbar', cta_label: 'Daftar' } },
  { slug: 'halsel', label: 'Berita Halsel', short_label: 'Halsel', gradient_class: 't-halsel', layanan_variant: 'bakos', layanan_body: 'Komunitas warga Halsel.', featured: { id: 'hsl-f1', title: 'Penangkaran Penyu di Pulau Bisa Halmahera Selatan Catat Rekor Tukik Tertinggi Tahun Ini', slug: 'penyu-bisa-halsel', category: 'lingkungan', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'hsl-l1', title: 'Pelabuhan Bacan Tambah Kapasitas Untuk Rute Komersial', slug: 'bacan-pelabuhan-2026', category: 'transportasi', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'hsl-l2', title: 'Halsel Lirik Bisnis Tambang Lemak Baboi sebagai PAD Baru', slug: 'baboi-pad-halsel', category: 'ekonomi', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'hsl-l3', title: 'Petani Pala Bacan Catat Harga Tertinggi 10 Tahun Terakhir', slug: 'pala-bacan-harga', category: 'ekonomi', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'hsl-l4', title: 'Bupati Halsel Resmikan RSUD Bacan Tipe C', slug: 'rsud-bacan', category: 'kesehatan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'hsl-l5', title: 'Sekolah Maritim Bacan Buka 2 Jurusan Baru', slug: 'maritim-bacan', category: 'pendidikan', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'hsl-l6', title: 'Pulau Damar Halsel Jadi Destinasi Wisata Diving Internasional', slug: 'pulau-damar-diving', category: 'wisata', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'hsl-l7', title: 'Pemkab Halsel Salurkan BLT untuk 2.300 KK Terdampak', slug: 'blt-halsel-2300', category: 'sosial', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-indosat', overline: 'Indosat IM3', title: 'Sinyal Kuat Halsel', body: 'Paket lokal & promo Bacan', cta_label: 'Cek' } },
  { slug: 'halut', label: 'Berita Halut', short_label: 'Halut', gradient_class: 't-halut', layanan_variant: 'bapasiar', layanan_body: 'Jual produk lokal Halut.', featured: { id: 'hut-f1', title: 'SMK Tobelo Cetak Juara Lomba Robotik Tingkat Nasional 2026, Bawa Pulang 3 Medali', slug: 'smk-tobelo-robotik-2026', category: 'pendidikan', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'hut-l1', title: 'Tobelo Dinobatkan Sebagai Kota Toleran Tingkat Provinsi', slug: 'tobelo-toleran', category: 'sosial', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'hut-l2', title: 'Pelabuhan Tobelo Tambah Kapasitas Container 50%', slug: 'tobelo-pelabuhan-container', category: 'infrastruktur', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'hut-l3', title: 'Hutan Mangrove Tobelo Ditanami 25.000 Bibit', slug: 'mangrove-tobelo-bibit', category: 'lingkungan', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'hut-l4', title: 'UNIMUDA Tobelo Buka Fakultas Hukum Mulai 2026/27', slug: 'unimuda-fh', category: 'pendidikan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'hut-l5', title: 'Festival Mansa Tobelo Jadi Magnet Wisata Budaya', slug: 'festival-mansa', category: 'wisata', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'hut-l6', title: 'Polres Halut Bongkar Tambang Emas Ilegal di Hutan Lindung', slug: 'tambang-ilegal-halut', category: 'kriminal', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'hut-l7', title: 'RSUD Tobelo Layani 1.200 Pasien per Bulan, Naik 30%', slug: 'rsud-tobelo-pasien', category: 'kesehatan', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-univ', overline: 'UNIMUDA Tobelo', title: 'PMB 2026/27', body: 'Beasiswa penuh tersedia', cta_label: 'Daftar' } },
  { slug: 'halteng', label: 'Berita Halteng', short_label: 'Halteng', gradient_class: 't-halteng', layanan_variant: 'balapor', layanan_body: 'Lapor lingkungan Halteng.', featured: { id: 'hte-f1', title: 'Sidang Korupsi Mantan Bupati Halmahera Tengah Masuki Tahap Pembacaan Dakwaan', slug: 'korupsi-mantan-bupati-halteng', category: 'hukum', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'hte-l1', title: 'PT IWIP Investasi Rp 12 Triliun untuk Pabrik Nikel Halteng', slug: 'iwip-12-triliun', category: 'ekonomi', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'hte-l2', title: 'Weda Bay Buka 800 Lapangan Kerja Baru Lokal', slug: 'weda-bay-800-lapangan-kerja', category: 'ekonomi', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'hte-l3', title: 'Demo Warga Sagea Tolak Aktivitas Tambang yang Cemari Sungai', slug: 'demo-sagea-tambang', category: 'sosial', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'hte-l4', title: 'Sungai Sagea Kembali Berwarna Coklat Pekat, Warga Resah', slug: 'sungai-sagea-tercemar', category: 'lingkungan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'hte-l5', title: 'Pemkab Halteng Bangun 5 Sekolah Baru di Daerah Terpencil', slug: 'sekolah-halteng-terpencil', category: 'pendidikan', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'hte-l6', title: 'Bandara Weda Bay Layani Penerbangan Komersial Mulai Agustus', slug: 'bandara-weda-bay', category: 'transportasi', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'hte-l7', title: 'Halteng Catat Pertumbuhan Ekonomi Tertinggi se-MalUt Triwulan I', slug: 'ekonomi-halteng-tertinggi', category: 'ekonomi', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-eramet', overline: 'PT Eramet', title: 'Beasiswa S1 Tambang', body: 'Putra-putri Halteng terbaik', cta_label: 'Info' } },
  { slug: 'haltim', label: 'Berita Haltim', short_label: 'Haltim', gradient_class: 't-haltim', layanan_variant: 'badonasi', layanan_body: 'Bantu warga Haltim.', featured: { id: 'htm-f1', title: 'PT NHM Investasi Rp 200 Miliar untuk Program Reklamasi Lahan Tambang Halmahera Timur', slug: 'nhm-reklamasi-haltim', category: 'ekonomi', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'htm-l1', title: 'Bupati Haltim Tetapkan Status Siaga Banjir untuk 4 Kecamatan', slug: 'siaga-banjir-haltim', category: 'bencana', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'htm-l2', title: 'Festival Mubia Maba Sedot Ribuan Wisatawan Domestik', slug: 'festival-mubia-maba', category: 'budaya', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'htm-l3', title: 'Pelabuhan Maba Buka Rute Baru ke Sorong Mulai Juni', slug: 'maba-sorong', category: 'transportasi', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'htm-l4', title: 'Aktivis Lingkungan Soroti Dampak Tambang NHM di Lingkungan Sekitar', slug: 'aktivis-nhm-haltim', category: 'lingkungan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'htm-l5', title: 'SMA Negeri Buli Cetak Juara Olimpiade Sains Provinsi', slug: 'sman-buli-olimpiade', category: 'pendidikan', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'htm-l6', title: 'Petani Pala Haltim Ekspor Perdana ke Pasar Eropa', slug: 'pala-haltim-eropa', category: 'ekonomi', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'htm-l7', title: 'RSUD Maba Dilengkapi Alat Hemodialisa Modern', slug: 'rsud-maba-hemodialisa', category: 'kesehatan', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-bni', overline: 'BNI Maba', title: 'Kredit UMKM 8%', body: 'Khusus pelaku usaha Haltim', cta_label: 'Ajukan' } },
  { slug: 'morotai', label: 'Berita Morotai', short_label: 'Morotai', gradient_class: 't-morotai', layanan_variant: 'bakos', layanan_body: 'Komunitas Morotai.', featured: { id: 'mor-f1', title: 'Morotai Promosi Wisata Sejarah Perang Dunia II untuk Wisatawan Mancanegara', slug: 'morotai-pd2-wisata', category: 'wisata', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'mor-l1', title: 'Bandara Pitu Morotai Tambah Frekuensi Penerbangan Jakarta-Manado', slug: 'pitu-jakarta-manado', category: 'transportasi', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'mor-l2', title: 'Festival Bahari Morotai 2026 Resmi Dibuka Bupati', slug: 'festival-bahari-morotai', category: 'budaya', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'mor-l3', title: 'KEK Morotai Sambut 5 Investor Baru di Sektor Pariwisata', slug: 'kek-morotai-investor', category: 'ekonomi', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'mor-l4', title: 'Penanaman 50.000 Bibit Mangrove di Tanjung Sopi', slug: 'mangrove-tanjung-sopi', category: 'lingkungan', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'mor-l5', title: 'Wisata Pulau Dodola Tambah Fasilitas Eco-Lodge', slug: 'dodola-eco-lodge', category: 'wisata', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'mor-l6', title: 'Pemkab Morotai Bangun Pasar Modern di Daruba', slug: 'pasar-daruba', category: 'infrastruktur', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'mor-l7', title: 'Sekolah Kelautan Morotai Buka Program Diving Profesional', slug: 'sekolah-diving-morotai', category: 'pendidikan', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-tourism', overline: 'Dinas Pariwisata', title: 'Tour Sejarah PD II', body: 'Paket 3D2N · Mulai Rp 2,5jt', cta_label: 'Booking' } },
  { slug: 'sula', label: 'Berita Sula', short_label: 'Kep. Sula', gradient_class: 't-sula', layanan_variant: 'bapasiar', layanan_body: 'Jual hasil tangkap nelayan Sula.', featured: { id: 'sul-f1', title: 'Hasil Tangkapan Nelayan Kepulauan Sula Naik 25% di Musim Tenang 2026', slug: 'tangkapan-sula-naik', category: 'ekonomi', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'sul-l1', title: 'Pelabuhan Sanana Diperluas Bisa Sandar Kapal Pelni Tipe Ro-Ro', slug: 'sanana-pelni', category: 'transportasi', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'sul-l2', title: 'Festival Bahari Sula Dimeriahkan Lomba Layar Cadik Tradisional', slug: 'festival-sula-cadik', category: 'budaya', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'sul-l3', title: 'SMP Negeri Sanana Juara Lomba Karya Tulis Maritim', slug: 'smpn-sanana-maritim', category: 'pendidikan', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'sul-l4', title: 'Petani Cengkeh Sula Catat Harga Tertinggi Mei 2026', slug: 'cengkeh-sula-harga', category: 'ekonomi', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'sul-l5', title: 'Hutan Mangrove Sula Dijadikan Kawasan Konservasi Resmi', slug: 'mangrove-sula-konservasi', category: 'lingkungan', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'sul-l6', title: 'RSUD Sanana Mulai Layani Pasien BPJS Online', slug: 'rsud-sanana-bpjs', category: 'kesehatan', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'sul-l7', title: 'Bupati Sula Resmikan Pasar Tradisional Modern di Sanana', slug: 'pasar-sanana-modern', category: 'infrastruktur', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-pertamina', overline: 'Pertamina Sula', title: 'SPBU Mini 24 Jam', body: 'BBM tersedia di Sanana', cta_label: 'Lokasi' } },
  { slug: 'taliabu', label: 'Berita Taliabu', short_label: 'P. Taliabu', gradient_class: 't-taliabu', layanan_variant: 'badonasi', layanan_body: 'Galang dana Taliabu.', featured: { id: 'tlb-f1', title: 'Pulau Taliabu Resmi Punya Puskesmas 24 Jam Pertama, Diresmikan Bupati', slug: 'puskesmas-24jam-taliabu', category: 'kesehatan', published_at: new Date(Date.now() - 86400000).toISOString() }, trending_list: [
    { id: 'tlb-l1', title: 'Pelabuhan Bobong Taliabu Layani Rute Mingguan ke Sanana', slug: 'bobong-sanana-mingguan', category: 'transportasi', published_at: new Date(Date.now() - 172800000).toISOString(), thumb_class: 'thumb-1' },
    { id: 'tlb-l2', title: 'Petani Kakao Taliabu Tembus Pasar Ekspor ke Singapura', slug: 'kakao-taliabu-singapura', category: 'ekonomi', published_at: new Date(Date.now() - 259200000).toISOString(), thumb_class: 'thumb-2' },
    { id: 'tlb-l3', title: 'SDN 1 Bobong Dibantu Pemprov Rehabilitasi Total Pasca Banjir', slug: 'sdn1-bobong-rehab', category: 'pendidikan', published_at: new Date(Date.now() - 345600000).toISOString(), thumb_class: 'thumb-3' },
    { id: 'tlb-l4', title: 'Bupati Taliabu Tetapkan Status Darurat Air Bersih 3 Desa', slug: 'darurat-air-taliabu', category: 'sosial', published_at: new Date(Date.now() - 432000000).toISOString(), thumb_class: 'thumb-4' },
    { id: 'tlb-l5', title: 'Hutan Lindung Taliabu Dijaga Tim Patroli Sipil Sukarela', slug: 'patroli-hutan-taliabu', category: 'lingkungan', published_at: new Date(Date.now() - 518400000).toISOString(), thumb_class: 'thumb-5' },
    { id: 'tlb-l6', title: 'Festival Adat Taliabu Diramaikan Tarian Cakalele Klasik', slug: 'cakalele-taliabu', category: 'budaya', published_at: new Date(Date.now() - 604800000).toISOString(), thumb_class: 'thumb-6' },
    { id: 'tlb-l7', title: 'Listrik PLN Tembus 80% Desa di Pulau Taliabu', slug: 'pln-taliabu-80', category: 'infrastruktur', published_at: new Date(Date.now() - 691200000).toISOString(), thumb_class: 'thumb-7' },
  ], stack_banner: { brand_class: 'b-property', overline: 'Pemkab Taliabu', title: 'Rumah Layak Huni', body: '500 KK terdampak banjir', cta_label: 'Daftar' } },
];

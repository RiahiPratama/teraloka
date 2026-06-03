/**
 * TeraLoka ADS — POSITION_RENDER_METADATA
 * SESI 11 Phase 1B (29 Mei 2026) — REALITY-VERIFIED REWRITE
 * ────────────────────────────────────────────────────────────────
 * Source-of-truth mapping antara position key (DB) → frontend render reality.
 *
 * Phase 1B (29 Mei 2026) HONEST REWRITE:
 *   - DROP `homepage_hero_fallback` — gak ada consumer di frontend (HeroWithSidebar
 *     selalu render editorial slides, gak ada empty state ke ads).
 *   - DROP `homepage` — never mounted (sudah didrop Phase 1).
 *   - KEEP `homepage_hero_banner` key (match DB + frontend fetch existing) tapi
 *     LABEL diganti "Carousel Pilihan Sponsor" (admin UX clarity). Rename serentak
 *     di Phase 2 (db UPDATE + frontend fetch + backend route + metadata key).
 *   - Tambah field `mountStatus`: 'active' | 'dormant' — biar admin tau iklan
 *     yang upload ke posisi dormant GAK BAKAL TAYANG di frontend sampai mount.
 *   - Label semua diganti bahasa praktis non-jargon (bukan "Top Leaderboard",
 *     bukan "Inline 8:1" — admin gak ngerti CSS code).
 *   - displayLocation diperjelas dengan referensi visual konkret yang admin
 *     bisa cocokin dengan halaman BAKABAR aktual.
 *
 * Render Type semantics:
 *   - SINGLE_FIXED   : 1 visible slot, frontend pick random 1 ad dari pool aktif
 *                      Konsekuensi: more ads = more variety rotation per pageview
 *   - CAROUSEL_MULTI : SEMUA ads render simultaneous, focused index rotate
 *                      Konsekuensi: 5 ads = 5 visible cards di carousel
 *   - LIST_STACKED   : N visual slots tetap, top N ads render
 *                      Konsekuensi: visual capacity = visualSlotCount, sisanya queue
 *
 * Mount Status:
 *   - active   : Ada komponen di-import + di-render di halaman BAKABAR
 *   - dormant  : Komponen ada di codebase tapi belum di-mount. Upload iklan
 *                ke posisi dormant = GAK TAYANG sampai mount dieksekusi.
 *
 * Total posisi: 12 active + 1 dormant = 13 posisi (31 Mei: +service_carousel, inline_banner mounted)
 * Phase 2 tasks (defer):
 *   - Rename `homepage_hero_banner` → `pilihan_sponsor_carousel` serentak (3 layer)
 *   - Mount `inline_banner` + `banner` ke frontend kalau mau pakai
 *
 * History:
 *   - 19 Mei 2026: initial NEW file (SESI 5D-2 Phase 1)
 *   - 29 Mei 2026 (Phase 1): split + add fields (now superseded)
 *   - 29 Mei 2026 (Phase 1B): reality-verified rewrite (this version)
 */

export type PositionRenderType = 'SINGLE_FIXED' | 'CAROUSEL_MULTI' | 'LIST_STACKED';
export type PositionMountStatus = 'active' | 'dormant';

export interface PositionRenderMetadata {
  /** DB position key */
  key:                  string;
  /** UI display label — bahasa praktis Indonesia, bukan CSS/jargon */
  label:                string;
  /** Render category — drives capacity interpretation */
  renderType:           PositionRenderType;
  /** Visual slot count — see comment above */
  visualSlotCount:      number;
  /** Recommended max active ads (null = unlimited) */
  recommendedMaxActive: number | null;
  /** Frontend component yang render position ini */
  component:            string;
  /** Rendered size (px), single source of truth (sama dengan recommendedImageDim) */
  realDim:              string;
  /** Recommended image asset dimension untuk upload — = realDim, no multiplier */
  recommendedImageDim:  string;
  /** Aspect ratio hint untuk image upload */
  aspectRatio:          string;
  /**
   * Bahasa Indonesia praktis untuk admin/advertiser — referensi visual konkret
   * yang bisa dicocokin dengan halaman BAKABAR aktual.
   */
  displayLocation:      string;
  /** Device scope visibility */
  deviceScope:          'all' | 'desktop' | 'mobile';
  /**
   * Phase 1B: status mount di frontend.
   * dormant = upload iklan ke sini GAK BAKAL TAYANG sampai komponen di-import
   * di halaman publik (Phase 2 task).
   */
  mountStatus:          PositionMountStatus;
  /** Mount status note (kalau dormant, jelasin kenapa) */
  mountNote?:           string;
  /** Support advertorial text format? */
  supportsTextFormat:   boolean;
  /** Optional advertorial-specific dim override */
  textFormatDim?:       string;
  /** Optional advertorial-specific aspect ratio override */
  textFormatAspectRatio?: string;
  /** Group semantik untuk Targeting UI */
  pageGroup:            'banner_area' | 'sidebar' | 'in_article_native' | 'hero_special';
  /** Optional: politisi-only constraint (KPU compliance) */
  politisiOnly?:        boolean;
  /** Tooltip detail "muncul di mana di public" */
  description:          string;
  /** URL untuk live preview di Bakabar */
  frontendUrl:          string;
}

// ════════════════════════════════════════════════════════════════
// METADATA MATRIX — 13 Position Keys (12 active + 1 dormant)
// ════════════════════════════════════════════════════════════════

export const POSITION_RENDER_METADATA: Record<string, PositionRenderMetadata> = {

  // ─── HOMEPAGE: TOP AREA (paling atas, premium) ──────────────────
  top_leaderboard: {
    key:                  'top_leaderboard',
    label:                'Banner Utama Atas Homepage',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCATopLeaderboard',
    realDim:              '888×220px',
    recommendedImageDim:  '888×220px',
    aspectRatio:          '4:1 horizontal',
    displayLocation:      'Homepage BAKABAR, tepat di bawah ticker shalat (paling atas, slot premium #1)',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Slot pertama yang dilihat user saat buka BAKABAR. Above-the-fold premium.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: ANTAR SECTION (banner full-width horizontal) ─────
  inline_banner: {
    key:                  'inline_banner',
    label:                'Banner Lebar Antar Section',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCAInlineBanner',
    realDim:              '1600×200px',
    recommendedImageDim:  '1600×200px',
    aspectRatio:          '8:1 horizontal panjang',
    displayLocation:      'Homepage BAKABAR, banner lebar mendatar setelah section wilayah ke-2 (Tidore). Slot full-width — kalau ada iklan bayar, tampil di sini; kalau kosong, slot disembunyikan.',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Banner lebar mendatar 8:1 di antara section wilayah. Money-first: kalau ada advertiser bayar, iklannya tayang; kalau gak ada, slot kosong (hidden). Statis / DCA / Motion.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: NATIVE / FEED (DORMANT) ──────────────────────────
  banner: {
    key:                  'banner',
    label:                'Banner Square Kecil (Belum Aktif)',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCABanner',
    realDim:              '52×52px',
    recommendedImageDim:  '52×52px',
    aspectRatio:          '1:1 square',
    displayLocation:      '(BELUM TAYANG) Rencana: thumbnail kecil di feed homepage',
    deviceScope:          'all',
    mountStatus:          'dormant',
    mountNote:            'Komponen DCABanner.tsx ada tapi gak ada consumer (grep zero hits). Upload iklan ke sini GAK BAKAL TAYANG sampai mount dieksekusi (Phase 2 TD-ADS-MOUNT-BANNER).',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'DORMANT. Thumbnail kecil 52×52 untuk feed item. Phase 2.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: CAROUSEL SETELAH BERITA NASIONAL ─────────────────
  // SESI 11 Phase 1B (29 Mei 2026): KEY tetap `homepage_hero_banner` untuk
  // match DB + frontend fetch yang aktif. Cuma LABEL yang diganti praktis.
  // Phase 2 (defer): rename serentak (db UPDATE + LaIndieMoviePoliticalBanner.tsx
  // fetch + backend route enum + metadata key).
  homepage_hero_banner: {
    key:                  'homepage_hero_banner',
    label:                'Carousel Pilihan Sponsor',
    renderType:           'CAROUSEL_MULTI',
    visualSlotCount:      5,
    recommendedMaxActive: 5,
    component:            'LaIndieMoviePoliticalBanner (fallback mode)',
    realDim:              '160×240px',
    recommendedImageDim:  '160×240px',
    aspectRatio:          '2:3 poster vertikal',
    displayLocation:      'Homepage BAKABAR, tepat setelah section "Berita Nasional", sebelum section wilayah berikutnya',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Carousel poster vertikal 2:3 (kayak poster film). Muncul setelah section pertama Berita Nasional kalau gak ada iklan politisi aktif. NOTE: nama internal key masih homepage_hero_banner (legacy), di-rename serentak di Phase 2.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: CAROUSEL LAYANAN TERALOKA (PALING BAWAH) ─────────
  // 31 Mei 2026 — eks komponen LaIndieMovieServiceCarousel (dulu hardcoded
  // 5 layanan gradient+emoji) jadi ADS-driven. Optimal 5, maks 6 (animasi).
  // Fallback hidden: belum ada banner = carousel disembunyikan.
  service_carousel: {
    key:                  'service_carousel',
    label:                'Carousel Layanan TeraLoka',
    renderType:           'CAROUSEL_MULTI',
    visualSlotCount:      5,
    recommendedMaxActive: 5,
    component:            'LaIndieMovieServiceCarousel',
    realDim:              '165×220px',
    recommendedImageDim:  '165×220px',
    aspectRatio:          '3:4 poster vertikal',
    displayLocation:      'Homepage BAKABAR, paling bawah — setelah semua section wilayah + section Viral, sebelum widget langganan WhatsApp. Carousel 5 poster yang berputar otomatis.',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Carousel "Layanan TeraLoka" — poster vertikal 3:4 berputar otomatis (optimal 5, maks 6). Banner statis ATAU motion (.webM). Tiap banner punya link tujuan sendiri. Kalau belum ada banner aktif, carousel disembunyikan.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: SKYSCRAPER KIRI-KANAN ────────────────────────────
  skyscraper_left: {
    key:                  'skyscraper_left',
    label:                'Banner Vertikal Kiri (Sidebar)',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCASkyscraper (side="left")',
    realDim:              '160×600px',
    recommendedImageDim:  '160×600px',
    aspectRatio:          '160:600 vertikal',
    displayLocation:      'Homepage BAKABAR, sidebar kiri (di luar area konten, hanya tampil di desktop >= 1400px)',
    deviceScope:          'desktop',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'sidebar',
    description:          'Banner vertikal panjang di kiri konten utama. Fixed position, hide saat scroll mencapai footer.',
    frontendUrl:          '/bakabar',
  },
  skyscraper_right: {
    key:                  'skyscraper_right',
    label:                'Banner Vertikal Kanan (Sidebar)',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCASkyscraper (side="right")',
    realDim:              '160×600px',
    recommendedImageDim:  '160×600px',
    aspectRatio:          '160:600 vertikal',
    displayLocation:      'Homepage BAKABAR, sidebar kanan (di luar area konten, hanya tampil di desktop >= 1400px)',
    deviceScope:          'desktop',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'sidebar',
    description:          'Banner vertikal panjang di kanan konten utama. Fixed position, hide saat scroll mencapai footer.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: TRENDING NATIVE PER WILAYAH ──────────────────────
  trending_native: {
    key:                  'trending_native',
    label:                'Iklan Menyamar di List Trending Wilayah',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'TrendingArticleAd',
    realDim:              '60×60px',
    recommendedImageDim:  '60×60px',
    aspectRatio:          '1:1 thumbnail',
    displayLocation:      'Homepage BAKABAR, diselip di list "Trending di [Wilayah]" — sengaja kelihatan mirip kartu artikel editorial (badge "IKLAN" tetap ditampilkan)',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   true,
    textFormatDim:        '60×60px',
    textFormatAspectRatio:'1:1 thumbnail',
    pageGroup:            'in_article_native',
    description:          'Native ad: bentuk iklan mirror artikel editorial (thumbnail 60×60 + judul + author "BAKABAR [Wilayah]"). Tujuan: blend dengan konten supaya user lebih engage. Tetap ada badge "IKLAN" untuk transparansi UU Pers.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: STACK BANNER PER WILAYAH ─────────────────────────
  region_stack: {
    key:                  'region_stack',
    label:                'Banner Kolom Kanan Section Wilayah',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCAStackBanner',
    realDim:              '320×200px',
    recommendedImageDim:  '320×200px',
    aspectRatio:          '8:5 horizontal',
    displayLocation:      'Homepage BAKABAR, kolom ke-3 (paling kanan) dari setiap section wilayah — banner landscape, bisa tampil 1–2 banner ditumpuk per section',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Banner landscape 8:5 di kolom ke-3 section wilayah. Bisa 1–2 banner stack per section (2 banner di section tanpa kartu data, 1 banner di bawah kartu Kampanye/Suara Warga). Per-wilayah targeting.',
    frontendUrl:          '/bakabar',
  },

  // ─── HOMEPAGE: POLITICAL BANNER (KPU COMPLIANCE) ────────────────
  political_banner: {
    key:                  'political_banner',
    label:                'Banner Politisi (Pemilu)',
    renderType:           'CAROUSEL_MULTI',
    visualSlotCount:      5,
    recommendedMaxActive: 5,
    component:            'LaIndieMoviePoliticalBanner (primary mode)',
    realDim:              '160×240px',
    recommendedImageDim:  '160×240px',
    aspectRatio:          '2:3 poster vertikal',
    displayLocation:      'Homepage BAKABAR, posisi sama dengan Carousel Pilihan Sponsor (setelah Berita Nasional). Prioritas tertinggi — kalau ada politisi aktif, slot ini muncul; kalau gak ada, fallback ke Pilihan Sponsor.',
    deviceScope:          'all',
    mountStatus:          'active',
    politisiOnly:         true,
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'KPU compliance — wajib disclaimer "Dana kampanye". Format poster 2:3 carousel.',
    frontendUrl:          '/bakabar',
  },

  // ─── ARTICLE SLUG: BANNER DI TENGAH ARTIKEL ─────────────────────
  in_article: {
    key:                  'in_article',
    label:                'Banner di Tengah Artikel',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdInArticle',
    realDim:              '640×360px',
    recommendedImageDim:  '640×360px',
    aspectRatio:          '16:9 horizontal',
    displayLocation:      'Halaman detail artikel BAKABAR, diselip di tengah body paragraf (setelah ~50% scroll)',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   true,
    textFormatDim:        '640×360px',
    textFormatAspectRatio:'16:9 horizontal',
    pageGroup:            'in_article_native',
    description:          'Banner 16:9 mid-article. High engagement karena user lagi fokus baca. Support advertorial mode (text + image).',
    frontendUrl:          '/bakabar/sample-article',
  },

  // ─── ARTICLE SLUG: NATIVE CARD DI RELATED ARTICLES ──────────────
  native: {
    key:                  'native',
    label:                'Iklan Menyamar di Artikel Terkait',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdNativeSlug',
    realDim:              '56×56px',
    recommendedImageDim:  '56×56px',
    aspectRatio:          '1:1 icon',
    displayLocation:      'Halaman detail artikel BAKABAR, di section "Artikel Terkait" di bawah artikel — sengaja kelihatan mirip kartu artikel rekomendasi (badge "IKLAN" tetap ditampilkan)',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   true,
    textFormatDim:        '56×56px',
    textFormatAspectRatio:'1:1 icon',
    pageGroup:            'in_article_native',
    description:          'Native ad: card iklan di section "Artikel Terkait" footer artikel. Icon advertiser 56×56 + judul + body. Variety untuk artikel yang punya 2+ ad slots. Tetap ada badge "IKLAN" untuk transparansi.',
    frontendUrl:          '/bakabar/sample-article',
  },

  // ─── KANAL/KATEGORI: NATIVE CARD DI TENGAH DAFTAR ──────────────
  // 2 Jun 2026 — ArchiveInFeedAd: kartu iklan niru ArticleCard, diselip
  // tiap 6 artikel di grid arsip Kanal/Kategori. Image + advertorial.
  // Langkah 2 (defer): +render <video> → baru masuk VIDEO_ELIGIBLE_POSITIONS.
  kanal_infeed: {
    key:                  'kanal_infeed',
    label:                'Iklan di Tengah Daftar Kanal/Kategori',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'ArchiveInFeedAd',
    realDim:              '300×169px',
    recommendedImageDim:  '600×338px',
    aspectRatio:          '16:9 horizontal',
    displayLocation:      'Halaman Kanal/Kategori BAKABAR (mis. /bakabar/kanal/nasional). Kartu iklan yang sengaja mirip kartu artikel, diselip tiap 6 artikel di daftar. Badge "IKLAN" tetap tampil (transparansi UU Pers).',
    deviceScope:          'all',
    mountStatus:          'active',
    supportsTextFormat:   true,
    textFormatDim:        '600×338px',
    textFormatAspectRatio:'16:9 horizontal',
    pageGroup:            'in_article_native',
    description:          'Native ad: kartu iklan di daftar Kanal/Kategori, mirror kartu artikel (cover 16:9 + judul + advertiser). Diselip tiap 6 artikel. Kosong → sel disembunyikan (grid tetap rapi). Statis / advertorial. Motion menyusul (Langkah 2).',
    frontendUrl:          '/bakabar/kanal/nasional',
  },

  // ─── ARTICLE SLUG: SIDEBAR PANEL ────────────────────────────────
  sidebar: {
    key:                  'sidebar',
    label:                'Banner Sidebar Artikel (Halaman Detail)',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdSidebarSlug',
    realDim:              '300×208px',
    recommendedImageDim:  '300×208px',
    aspectRatio:          '~1.44:1 horizontal',
    displayLocation:      'Halaman detail artikel BAKABAR (saat user baca artikel), kolom sidebar kanan — beda dari "Sidebar Kanan Section Wilayah" yang di homepage',
    deviceScope:          'desktop',
    mountStatus:          'active',
    supportsTextFormat:   false,
    pageGroup:            'sidebar',
    description:          'Banner MREC horizontal-ish (300×208) di sidebar artikel. Desktop only (sidebar hide di mobile). Beda lokasi dengan region_stack yang di homepage.',
    frontendUrl:          '/bakabar/sample-article',
  },
};

// ════════════════════════════════════════════════════════════════
// FORMAT-AWARE HELPERS (preserved from Phase 1)
// ════════════════════════════════════════════════════════════════

export type AdFormatKind = 'image' | 'text' | 'animated' | 'video';

/**
 * Get recommended image dimension untuk position + ad_format pair.
 * - ad_format='text' + position support text + has textFormatDim → textFormatDim
 * - else → recommendedImageDim
 */
export function getRecommendedDimForFormat(
  meta: PositionRenderMetadata,
  ad_format: AdFormatKind,
): string {
  if (ad_format === 'text' && meta.supportsTextFormat && meta.textFormatDim) {
    return meta.textFormatDim;
  }
  return meta.recommendedImageDim;
}

export function getAspectRatioForFormat(
  meta: PositionRenderMetadata,
  ad_format: AdFormatKind,
): string {
  if (ad_format === 'text' && meta.supportsTextFormat && meta.textFormatAspectRatio) {
    return meta.textFormatAspectRatio;
  }
  return meta.aspectRatio;
}

export function isPositionCompatibleWithFormat(
  meta: PositionRenderMetadata,
  ad_format: AdFormatKind,
): boolean {
  if (ad_format === 'text') return meta.supportsTextFormat;
  return true;
}

// ════════════════════════════════════════════════════════════════
// CAPACITY STATUS HELPERS (preserved from Phase 1)
// ════════════════════════════════════════════════════════════════

export type CapacityStatus = 'available' | 'optimal' | 'near_full' | 'over_capacity' | 'unlimited_ok';

export function computeCapacityStatus(
  activeCount: number,
  recommendedMaxActive: number | null,
): CapacityStatus {
  if (recommendedMaxActive === null) {
    return activeCount === 0 ? 'available' : 'unlimited_ok';
  }
  if (activeCount === 0) return 'available';
  if (activeCount >= recommendedMaxActive) return 'over_capacity';
  const ratio = activeCount / recommendedMaxActive;
  if (ratio >= 0.7) return 'near_full';
  return 'optimal';
}

export function formatCapacityDisplay(
  metadata: PositionRenderMetadata,
  activeCount: number,
): string {
  switch (metadata.renderType) {
    case 'SINGLE_FIXED':
      if (activeCount === 0) return '0 di pool';
      if (activeCount === 1) return '1 active (no rotation)';
      return `${activeCount} di pool (rotate per view)`;

    case 'CAROUSEL_MULTI': {
      const carouselMax = metadata.recommendedMaxActive ?? metadata.visualSlotCount;
      return `${activeCount}/${carouselMax} di carousel`;
    }

    case 'LIST_STACKED': {
      const listMax = metadata.recommendedMaxActive ?? metadata.visualSlotCount;
      return `${activeCount}/${listMax} slot terisi`;
    }

    default:
      return `${activeCount} active`;
  }
}

/**
 * Get all position keys grouped by page semantic.
 * SESI 11 Phase 1B (29 Mei 2026): no longer hardcodes group keys —
 * derive dari Object.values to auto-include any new pageGroup additions.
 */
export function getPositionsByGroup(): Record<string, PositionRenderMetadata[]> {
  const groups: Record<string, PositionRenderMetadata[]> = {};
  for (const meta of Object.values(POSITION_RENDER_METADATA)) {
    if (!groups[meta.pageGroup]) groups[meta.pageGroup] = [];
    groups[meta.pageGroup].push(meta);
  }
  return groups;
}

// ════════════════════════════════════════════════════════════════
// DERIVED CONSTANTS
// ════════════════════════════════════════════════════════════════

export const ALL_POSITION_KEYS = Object.keys(POSITION_RENDER_METADATA);

export const ACTIVE_POSITION_KEYS = ALL_POSITION_KEYS.filter(
  (k) => POSITION_RENDER_METADATA[k].mountStatus === 'active'
);

export const DORMANT_POSITION_KEYS = ALL_POSITION_KEYS.filter(
  (k) => POSITION_RENDER_METADATA[k].mountStatus === 'dormant'
);

/** Helper: get metadata for a position key, with fallback to Unknown */
export function getPositionMetadata(key: string): PositionRenderMetadata {
  return POSITION_RENDER_METADATA[key] ?? {
    key,
    label:                `Unknown (${key})`,
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'Unknown',
    realDim:              'Unknown',
    recommendedImageDim:  'Unknown',
    aspectRatio:          'Unknown',
    displayLocation:      'Posisi tidak dikenali — kemungkinan position lama yang sudah dihapus dari metadata.',
    deviceScope:          'all',
    mountStatus:          'dormant',
    mountNote:            'Position key tidak ditemukan di metadata. Cek DB untuk migrate.',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Unknown position',
    frontendUrl:          '/bakabar',
  };
}

/** Helper: is position safe untuk advertiser upload (active mount)? */
export function isPositionActive(key: string): boolean {
  return POSITION_RENDER_METADATA[key]?.mountStatus === 'active';
}

// ════════════════════════════════════════════════════════════════
// SESI 11 Batch 5 (31 Mei 2026): Banner Motion (video) eligibility —
// SINGLE SOURCE OF TRUTH. Mirror backend VIDEO_AD_POSITIONS.
// Dipakai PositionCreativeModal (tab Banner Motion) + AdsBottomPanels
// (badge Slot Inventory) biar dua tempat CERITA SAMA — gak ada lagi
// label "Banner Statis" nyasar di posisi yang sebenernya bisa Motion.
// Native/in-article dikecualikan (kartu kecil, bukan banner video).
// ════════════════════════════════════════════════════════════════
// SESI 11 Batch 8 (31 Mei 2026) — TRUTH-FIX: cuma posisi yang komponen
// publiknya BENERAN render <video> (verified vs dispatcher).
//   ✅ sidebar              → AdSidebarSlug
//   ✅ in_article           → AdInArticle
//   ✅ region_stack         → DCAStackBanner (webM bg)
//   ✅ homepage_hero_banner → LaIndieMoviePoliticalBanner (focused-only)
//   ✅ political_banner     → LaIndieMoviePoliticalBanner (focused-only)
//   ✅ top_leaderboard      → DCATopLeaderboard (webM fill)
//   ✅ skyscraper_left      → DCASkyscraper (webM fill)
//   ✅ skyscraper_right     → DCASkyscraper (webM fill)
//   ✅ inline_banner        → DCAInlineBanner (webM fill, dormant—belum di-mount)
//   ⛔ banner 52×52         → skip (helper thumbnail, kekecilan buat video)
// ⚠️ political_banner = slot KPU — video iklan kampanye = keputusan compliance founder.
export const VIDEO_ELIGIBLE_POSITIONS: readonly string[] = [
  'sidebar',
  'in_article',
  'region_stack',
  'homepage_hero_banner',
  'political_banner',
  'top_leaderboard',
  'skyscraper_left',
  'skyscraper_right',
  'inline_banner',
  'service_carousel',
];

/** True kalau posisi boleh pakai Banner Motion (video webM/mp4). */
export function supportsVideoFormat(positionKey: string): boolean {
  return VIDEO_ELIGIBLE_POSITIONS.includes(positionKey);
}

// ════════════════════════════════════════════════════════════════
// MATERI CAPABILITY — Single Source (SESI 11 Batch 7, 31 Mei 2026)
// ────────────────────────────────────────────────────────────────
// Daftar materi yang didukung satu posisi. SATU sumber kebenaran dipakai
// badge Slot Inventory (AdsBottomPanels) + chip Layout Iklan
// (AdsLayoutDocumentation) — biar gak drift antar halaman.
//
// Logika: Motion NAMBAH opsi (Statis tetap bisa). Advertorial = text-based,
// non-advertorial = banner gambar (Statis + DCA). Final materi ngikut paket.
// ════════════════════════════════════════════════════════════════
export function buildMateriFormats(opts: {
  supportsAdvertorial: boolean;
  supportsVideo:       boolean;
}): string[] {
  const formats: string[] = [];
  if (opts.supportsAdvertorial) formats.push('Advertorial');
  formats.push('Statis');
  if (!opts.supportsAdvertorial) formats.push('DCA');
  if (opts.supportsVideo) formats.push('Motion');
  return formats;
}

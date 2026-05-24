/**
 * TeraLoka ADS — POSITION_RENDER_METADATA
 * SESI 5D-2 (19 Mei 2026)
 * ────────────────────────────────────────────────────────────────
 * Source-of-truth mapping antara position key (DB) → frontend render reality.
 *
 * Untuk solve gap: "1 AKTIF di dashboard" tidak akurat representasikan
 * kapasitas slot real (e.g., political_banner = carousel multi-slot,
 * top_leaderboard = single pool-pick).
 *
 * Render Type semantics:
 *   - SINGLE_FIXED   : 1 visible slot, frontend pick random 1 ad dari pool aktif
 *                      Konsekuensi: more ads = more variety rotation per pageview
 *   - CAROUSEL_MULTI : SEMUA ads render simultaneous, focused index rotate
 *                      Konsekuensi: 5 ads = 5 visible cards di carousel
 *   - LIST_STACKED   : N visual slots tetap, top N ads render
 *                      Konsekuensi: visual capacity = visualSlotCount, sisanya queue
 *
 * Dim source-of-truth: extracted dari grep w-[]/h-[]/aspectRatio di komponen
 * frontend di ~/teraloka/src/components/bakabar/ + ~/teraloka/src/components/ads/.
 *
 * History:
 *   - 19 Mei 2026: initial NEW file (SESI 5D-2 Phase 1)
 */

export type PositionRenderType = 'SINGLE_FIXED' | 'CAROUSEL_MULTI' | 'LIST_STACKED';

export interface PositionRenderMetadata {
  /** DB position key */
  key:                  string;
  /** UI display label */
  label:                string;
  /** Render category — drives capacity interpretation */
  renderType:           PositionRenderType;
  /**
   * Visual slot count:
   *   - SINGLE_FIXED   : 1 (always)
   *   - CAROUSEL_MULTI : N visible simultaneous (typical 3-7)
   *   - LIST_STACKED   : exact list capacity
   */
  visualSlotCount:      number;
  /** Recommended max active ads (null = unlimited, soft hint untuk admin) */
  recommendedMaxActive: number | null;
  /** Frontend component yang render position ini */
  component:            string;
  /** Real CSS dimension (sumber: grep audit komponen) */
  realDim:              string;
  /** Recommended image asset dimension untuk upload (e.g., "888×220px") */
  recommendedImageDim:  string;
  /** Aspect ratio hint untuk image upload */
  aspectRatio:          string;
  /**
   * SESI 8 (24 Mei 2026): Apakah posisi support advertorial (ad_format='text').
   * Whitelist: in_article, native, trending_native. Lainnya = false.
   */
  supportsTextFormat:   boolean;
  /**
   * SESI 8 (24 Mei 2026): Recommended image dim khusus advertorial mode.
   * Optional — kalau undefined, fallback ke recommendedImageDim (banner dim).
   * Used untuk format-aware UI hint (Option A: switch dim by ad_format).
   */
  textFormatDim?:       string;
  /**
   * SESI 8 (24 Mei 2026): Aspect ratio hint khusus advertorial mode.
   * Optional — fallback ke aspectRatio kalau undefined.
   */
  textFormatAspectRatio?: string;
  /** Group semantik untuk Targeting UI */
  pageGroup:            'banner_area' | 'sidebar' | 'in_article_native' | 'hero_special';
  /** Optional: politisi-only constraint */
  politisiOnly?:        boolean;
  /** Optional: tooltip "muncul di mana di public" */
  description:          string;
  /**
   * SESI 5D-2: Frontend URL untuk live preview di Bakabar.
   * Format: path relatif (mis. '/bakabar' atau '/bakabar/sample-article-slug')
   * Atau '#section-anchor' kalau scroll spesifik.
   * Render: tombol "Lihat di Bakabar" → window.open(BAKABAR_BASE + frontendUrl)
   */
  frontendUrl:          string;
}

// ════════════════════════════════════════════════════════════════
// METADATA MATRIX — 13 Position Keys
// ────────────────────────────────────────────────────────────────
// SESI 5D-2 (19 Mei 2026): realDim + recommendedImageDim hasil audit
// dari komponen frontend (grep w-[]/h-[]/aspectRatio).
// Sumber: ~/teraloka/src/components/bakabar/*.tsx + components/ads/*.tsx
// ════════════════════════════════════════════════════════════════
export const POSITION_RENDER_METADATA: Record<string, PositionRenderMetadata> = {
  // ─── Banner Area (horizontal high visibility) ─────────────────
  top_leaderboard: {
    key:                  'top_leaderboard',
    label:                'Top Billboard',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCATopLeaderboard',
    realDim:              'w-full h-[220px], inner brand area w-[180px]',
    recommendedImageDim:  '888×220px',
    aspectRatio:          'Horizontal 4:1',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Banner paling atas, di bawah header navigasi. Pool rotation per pageview.',
    frontendUrl:          '/bakabar',
  },
  inline_banner: {
    key:                  'inline_banner',
    label:                'Inline 8:1',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'InlineBannerAd',
    realDim:              'aspectRatio 8:1 (full-width responsive)',
    recommendedImageDim:  '1600×200px',
    aspectRatio:          'Horizontal 8:1',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Banner di antar region homepage, ratio 8:1 (panjang horizontal).',
    frontendUrl:          '/bakabar',
  },
  banner: {
    key:                  'banner',
    label:                'Banner Generic',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCABanner',
    realDim:              'w-[52px] h-[52px] thumbnail (compact feed item)',
    recommendedImageDim:  '104×104px',
    aspectRatio:          'Square 1:1',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'Banner kompak feed item, thumbnail 52×52 dengan side content.',
    frontendUrl:          '/bakabar',
  },
  homepage_hero_banner: {
    key:                  'homepage_hero_banner',
    label:                'Hero Fallback + Pilihan Sponsor',
    renderType:           'CAROUSEL_MULTI',
    visualSlotCount:      9,
    recommendedMaxActive: 9,
    component:            'HeroWithSidebar + LaIndieMoviePoliticalBanner (fallback)',
    realDim:              'Hero size (variable) ATAU 160×240 carousel base (fallback mode)',
    recommendedImageDim:  '160×240px',
    aspectRatio:          'Vertical poster 2:3',
    supportsTextFormat:   false,
    pageGroup:            'banner_area',
    description:          'DUAL USAGE: (1) Backup hero kalau slot utama kosong, (2) Carousel "Pilihan Sponsor" homepage saat tidak ada iklan politik. 1 upload muncul di kedua tempat.',
    frontendUrl:          '/bakabar',
  },

  // ─── Sidebar (vertical) ───────────────────────────────────────
  skyscraper_left: {
    key:                  'skyscraper_left',
    label:                'Sidebar Slot Kiri',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCASkyscraper / SkyscraperBanner',
    realDim:              'w-[160px] h-[600px] fixed',
    recommendedImageDim:  '160×600px',
    aspectRatio:          'Vertikal 1:3.75',
    supportsTextFormat:   false,
    pageGroup:            'sidebar',
    description:          'Skyscraper kiri artikel BAKABAR (desktop xl+ only).',
    frontendUrl:          '/bakabar',
  },
  skyscraper_right: {
    key:                  'skyscraper_right',
    label:                'Sidebar Slot Kanan',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCASkyscraper / SkyscraperBanner',
    realDim:              'w-[160px] h-[600px] fixed',
    recommendedImageDim:  '160×600px',
    aspectRatio:          'Vertikal 1:3.75',
    supportsTextFormat:   false,
    pageGroup:            'sidebar',
    description:          'Skyscraper kanan artikel BAKABAR (desktop xl+ only).',
    frontendUrl:          '/bakabar',
  },
  sidebar: {
    key:                  'sidebar',
    label:                'Sidebar Generic',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdSidebarSlug',
    realDim:              'h-52 w-full (~300×208 container)',
    recommendedImageDim:  '300×200px',
    aspectRatio:          'Card landscape 3:2',
    supportsTextFormat:   false,
    pageGroup:            'sidebar',
    description:          'Sidebar fleksibel slug artikel, random pick dari pool aktif.',
    frontendUrl:          '/bakabar/sample-article',
  },

  // ─── In-Article & Native (inline) ─────────────────────────────
  in_article: {
    key:                  'in_article',
    label:                'In Article',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdInArticle (via BodyWithAds)',
    realDim:              'h-48 w-full (~700×192 responsive)',
    recommendedImageDim:  '700×192px',
    aspectRatio:          'Horizontal 4:1',
    // SESI 8 (24 Mei 2026): advertorial render = LEFT panel 192×192 square crop
    supportsTextFormat:   true,
    textFormatDim:        '192×192px',
    textFormatAspectRatio: 'Square 1:1 (LEFT panel)',
    pageGroup:            'in_article_native',
    description:          'Banner di tengah artikel. Auto-inject 1-3x per artikel (BodyWithAds).',
    frontendUrl:          '/bakabar/sample-article',
  },
  native: {
    key:                  'native',
    label:                'Native In-Article',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdNativeSlug',
    realDim:              'w-14 h-14 icon (56×56) + side text content',
    recommendedImageDim:  '112×112px',
    aspectRatio:          'Square 1:1 (icon/logo)',
    // SESI 8 (24 Mei 2026): advertorial render = 80×80 icon replace logo
    supportsTextFormat:   true,
    textFormatDim:        '112×112px',
    textFormatAspectRatio: 'Square 1:1 (icon advertorial)',
    pageGroup:            'in_article_native',
    description:          'Advertorial yang menyatu dengan flow artikel. Icon kiri + headline + CTA.',
    frontendUrl:          '/bakabar/sample-article',
  },
  trending_native: {
    key:                  'trending_native',
    label:                'Trending Native',
    renderType:           'LIST_STACKED',
    visualSlotCount:      3,
    recommendedMaxActive: 3,
    component:            'TrendingArticleAd',
    realDim:              'w-[52px] h-[52px] thumbnail + side content',
    recommendedImageDim:  '104×104px',
    aspectRatio:          'Square 1:1 thumbnail',
    // SESI 8 (24 Mei 2026): advertorial render = 52×52 thumbnail replace logo
    supportsTextFormat:   true,
    textFormatDim:        '104×104px',
    textFormatAspectRatio: 'Square 1:1 (thumbnail trending)',
    pageGroup:            'in_article_native',
    description:          'Sticky di section "Trending Now", 3 visible slot stacked.',
    frontendUrl:          '/bakabar',
  },

  // ─── Hero & Special ───────────────────────────────────────────
  political_banner: {
    key:                  'political_banner',
    label:                'Politisi Banner',
    renderType:           'CAROUSEL_MULTI',
    visualSlotCount:      9,
    recommendedMaxActive: 9,
    component:            'LaIndieMoviePoliticalBanner',
    realDim:              '160×240 base (POSTER_W × POSTER_H), focused scale 1.30× = 208×312',
    recommendedImageDim:  '208×312px',
    aspectRatio:          'Vertikal poster 2:3',
    supportsTextFormat:   false,
    pageGroup:            'hero_special',
    politisiOnly:         true,
    description:          'Carousel banner politisi KPU compliance. Up to 9 ads visible, fokus rotate auto.',
    frontendUrl:          '/bakabar',
  },
  region_stack: {
    key:                  'region_stack',
    label:                'Stack Banner Region',
    renderType:           'LIST_STACKED',
    visualSlotCount:      5,
    recommendedMaxActive: 5,
    component:            'DCAStackBanner / RegionSection',
    realDim:              'w-[52px] h-[52px] thumbnail per-region',
    recommendedImageDim:  '104×104px',
    aspectRatio:          'Square 1:1 thumbnail',
    supportsTextFormat:   false,
    pageGroup:            'hero_special',
    description:          'Banner di section per-kabupaten homepage, 1 thumbnail per region stack.',
    frontendUrl:          '/bakabar',
  },
  homepage: {
    key:                  'homepage',
    label:                'Homepage Generic',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'Generic (varies)',
    realDim:              'Responsive cross-section (no fixed CSS)',
    recommendedImageDim:  '888×220px',
    aspectRatio:          'Horizontal responsive',
    supportsTextFormat:   false,
    pageGroup:            'hero_special',
    description:          'Banner fleksibel cross-section homepage, generic fallback.',
    frontendUrl:          '/bakabar',
  },
};

// ════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ════════════════════════════════════════════════════════════════

/**
 * Get metadata untuk position key. Fallback ke generic safe default.
 */
export function getPositionMetadata(key: string): PositionRenderMetadata {
  return POSITION_RENDER_METADATA[key] ?? {
    key,
    label:                key,
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'Unknown',
    realDim:              'Unknown',
    recommendedImageDim:  'Variabel',
    aspectRatio:          'Responsive',
    supportsTextFormat:   false,  // SESI 8: safe default
    pageGroup:            'banner_area',
    description:          'Metadata belum di-define untuk posisi ini.',
    frontendUrl:          '/bakabar',
  };
}

// ════════════════════════════════════════════════════════════════
// SESI 8 (24 Mei 2026) — Format-Aware Dim Helpers
// ────────────────────────────────────────────────────────────────
// Option A pattern: switch dim by ad_format (image vs text).
// Used by AdFormSectionTargeting (checkbox card) +
// PositionCreativeModal (upload header + label).
// ════════════════════════════════════════════════════════════════

export type AdFormatKind = 'image' | 'text' | 'animated';

/**
 * Get recommended image dimension untuk position + ad_format pair.
 *
 * Logic:
 *   - ad_format='text' AND position support text + has textFormatDim
 *     → return textFormatDim (advertorial-specific dim)
 *   - else → return recommendedImageDim (banner dim default)
 *
 * Example:
 *   - in_article + 'image' → "700×192px"
 *   - in_article + 'text'  → "192×192px"
 *   - native     + 'text'  → "112×112px" (same as banner — both square)
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

/**
 * Get aspect ratio hint untuk position + ad_format pair.
 * Same waterfall pattern sebagai getRecommendedDimForFormat.
 */
export function getAspectRatioForFormat(
  meta: PositionRenderMetadata,
  ad_format: AdFormatKind,
): string {
  if (ad_format === 'text' && meta.supportsTextFormat && meta.textFormatAspectRatio) {
    return meta.textFormatAspectRatio;
  }
  return meta.aspectRatio;
}

/**
 * Check apakah position support ad_format yang dipilih.
 * Used untuk disable checkbox di Targeting kalau format mismatch.
 *
 * Logic:
 *   - ad_format='text' → cek meta.supportsTextFormat
 *   - else → always true (image/animated support semua position)
 */
export function isPositionCompatibleWithFormat(
  meta: PositionRenderMetadata,
  ad_format: AdFormatKind,
): boolean {
  if (ad_format === 'text') return meta.supportsTextFormat;
  return true;
}

/**
 * Compute capacity status untuk dashboard display.
 *
 * Returns:
 *   - 'available'     : slot kosong, bisa accept ad baru
 *   - 'optimal'       : fill rate ideal, masih ada room
 *   - 'near_full'     : mendekati recommendedMaxActive
 *   - 'over_capacity' : melebihi recommended (pool/carousel saturated)
 *   - 'unlimited_ok'  : null capacity, always healthy
 */
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

/**
 * Format capacity display text untuk dashboard.
 *
 * Examples:
 *   - SINGLE_FIXED with 5 active, unlimited: "5 di pool (rotate)"
 *   - CAROUSEL_MULTI with 3 active, max 7: "3/7 di carousel"
 *   - LIST_STACKED with 2 active, max 3: "2/3 slot terisi"
 */
export function formatCapacityDisplay(
  metadata: PositionRenderMetadata,
  activeCount: number,
): string {
  switch (metadata.renderType) {
    case 'SINGLE_FIXED':
      if (activeCount === 0) return '0 di pool';
      if (activeCount === 1) return '1 active (no rotation)';
      return `${activeCount} di pool (rotate per view)`;

    case 'CAROUSEL_MULTI':
      const carouselMax = metadata.recommendedMaxActive ?? metadata.visualSlotCount;
      return `${activeCount}/${carouselMax} di carousel`;

    case 'LIST_STACKED':
      const listMax = metadata.recommendedMaxActive ?? metadata.visualSlotCount;
      return `${activeCount}/${listMax} slot terisi`;

    default:
      return `${activeCount} active`;
  }
}

/**
 * Get all position keys grouped by page semantic.
 */
export function getPositionsByGroup(): Record<string, PositionRenderMetadata[]> {
  const groups: Record<string, PositionRenderMetadata[]> = {
    banner_area:        [],
    sidebar:            [],
    in_article_native: [],
    hero_special:      [],
  };
  for (const meta of Object.values(POSITION_RENDER_METADATA)) {
    groups[meta.pageGroup].push(meta);
  }
  return groups;
}

/**
 * All position keys (for backend validation list).
 */
export const ALL_POSITION_KEYS = Object.keys(POSITION_RENDER_METADATA);

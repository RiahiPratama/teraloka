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
  /** Aspect ratio hint untuk image upload */
  aspectRatio:          string;
  /** Group semantik untuk Targeting UI */
  pageGroup:            'banner_area' | 'sidebar' | 'in_article_native' | 'hero_special';
  /** Optional: politisi-only constraint */
  politisiOnly?:        boolean;
  /** Optional: tooltip "muncul di mana di public" */
  description:          string;
}

// ════════════════════════════════════════════════════════════════
// METADATA MATRIX — 13 Position Keys
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
    realDim:              'Full-width × 220px (max-w-[480px] text area)',
    aspectRatio:          'Horizontal panjang (responsive height 220px)',
    pageGroup:            'banner_area',
    description:          'Banner paling atas, di bawah header navigasi. Pool rotation per pageview.',
  },
  inline_banner: {
    key:                  'inline_banner',
    label:                'Inline 8:1',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'InlineBannerAd',
    realDim:              'aspectRatio 8:1 (full-width)',
    aspectRatio:          'Horizontal 8:1 — image min 1600×200',
    pageGroup:            'banner_area',
    description:          'Banner di antar region homepage, ratio 8:1 (panjang horizontal).',
  },
  banner: {
    key:                  'banner',
    label:                'Banner Generic',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCABanner',
    realDim:              'Responsive (varies per slot)',
    aspectRatio:          'Responsive horizontal',
    pageGroup:            'banner_area',
    description:          'Banner fleksibel, dipakai sebagai fallback generic.',
  },
  homepage_hero_banner: {
    key:                  'homepage_hero_banner',
    label:                'Hero Fallback',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'HeroWithSidebar (fallback slot)',
    realDim:              'Hero size (variable)',
    aspectRatio:          'Horizontal 16:9 atau 21:9',
    pageGroup:            'banner_area',
    description:          'Backup hero kalau slot hero utama kosong.',
  },

  // ─── Sidebar (vertical) ───────────────────────────────────────
  skyscraper_left: {
    key:                  'skyscraper_left',
    label:                'Sidebar Slot Kiri',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCASkyscraper / SkyscraperBanner',
    realDim:              '160×600 (fixed)',
    aspectRatio:          'Vertikal 1:3.75',
    pageGroup:            'sidebar',
    description:          'Skyscraper kiri artikel BAKABAR (desktop xl+ only).',
  },
  skyscraper_right: {
    key:                  'skyscraper_right',
    label:                'Sidebar Slot Kanan',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'DCASkyscraper / SkyscraperBanner',
    realDim:              '160×600 (fixed)',
    aspectRatio:          'Vertikal 1:3.75',
    pageGroup:            'sidebar',
    description:          'Skyscraper kanan artikel BAKABAR (desktop xl+ only).',
  },
  sidebar: {
    key:                  'sidebar',
    label:                'Sidebar Generic',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdSidebarSlug',
    realDim:              '~300×200 (placeholder hint)',
    aspectRatio:          'Card 3:2 landscape',
    pageGroup:            'sidebar',
    description:          'Sidebar fleksibel slug artikel, random pick dari pool aktif.',
  },

  // ─── In-Article & Native (inline) ─────────────────────────────
  in_article: {
    key:                  'in_article',
    label:                'In Article',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdInArticle (via BodyWithAds)',
    realDim:              'h-48 w-full (~192px height, full-width)',
    aspectRatio:          'Horizontal 16:9 atau 4:3',
    pageGroup:            'in_article_native',
    description:          'Banner di tengah artikel. Auto-inject 1-3x per artikel (BodyWithAds).',
  },
  native: {
    key:                  'native',
    label:                'Native In-Article',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'AdNativeSlug',
    realDim:              'Card style w-14 h-14 icon + content',
    aspectRatio:          'Native auto-match (card layout)',
    pageGroup:            'in_article_native',
    description:          'Advertorial yang menyatu dengan flow artikel (styled card).',
  },
  trending_native: {
    key:                  'trending_native',
    label:                'Trending Native',
    renderType:           'LIST_STACKED',
    visualSlotCount:      3,
    recommendedMaxActive: 3,
    component:            'TrendingArticleAd',
    realDim:              'Thumb 52×52 + content',
    aspectRatio:          'Card thumbnail 1:1',
    pageGroup:            'in_article_native',
    description:          'Sticky di section "Trending Now", 3 visible slot stacked.',
  },

  // ─── Hero & Special ───────────────────────────────────────────
  political_banner: {
    key:                  'political_banner',
    label:                'Politisi Banner',
    renderType:           'CAROUSEL_MULTI',
    visualSlotCount:      5,
    recommendedMaxActive: 7,
    component:            'LaIndieMoviePoliticalBanner',
    realDim:              '160×240 base (POSTER_W × POSTER_H), focused scale 1.3×',
    aspectRatio:          'Vertical poster 2:3',
    pageGroup:            'hero_special',
    politisiOnly:         true,
    description:          'Carousel banner politisi (KPU compliance). Semua ads tampil simultan, fokus rotate auto.',
  },
  region_stack: {
    key:                  'region_stack',
    label:                'Stack Banner Region',
    renderType:           'LIST_STACKED',
    visualSlotCount:      5,
    recommendedMaxActive: 5,
    component:            'DCAStackBanner / RegionSection',
    realDim:              'Card responsive per-region',
    aspectRatio:          'Card 4:3',
    pageGroup:            'hero_special',
    description:          'Banner di section per-kabupaten homepage, 1 per region stack.',
  },
  homepage: {
    key:                  'homepage',
    label:                'Homepage Generic',
    renderType:           'SINGLE_FIXED',
    visualSlotCount:      1,
    recommendedMaxActive: null,
    component:            'Generic (varies)',
    realDim:              'Responsive cross-section',
    aspectRatio:          'Responsive',
    pageGroup:            'hero_special',
    description:          'Banner fleksibel cross-section homepage, generic fallback.',
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
    aspectRatio:          'Responsive',
    pageGroup:            'banner_area',
    description:          'Metadata belum di-define untuk posisi ini.',
  };
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

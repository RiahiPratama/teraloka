'use client';

/**
 * TeraLoka — BodyWithAds (v3)
 * Mission 8 Sub-Phase 8-D Phase 2 Turn 2
 * ────────────────────────────────────────────────────────────────
 * Wrapper yang split artikel HTML jadi block-level elements, lalu
 * inject 1-3 banner `<AdInArticle />` di posisi smart-spaced.
 *
 * v3 Changes (16 Mei 2026 Phase 2 Turn 2):
 *   - Accept `enabled?` prop: editor disable body inject via OFFICE form
 *   - Accept `formatFilter?` prop: forward ke AdInArticle untuk format filter
 *   - Backward compat 100%: props baru optional, default behavior identical v2
 *
 * Threshold (v2 preserved):
 *   - < 4 block    → 0 ad
 *   - 4-9 block    → 1 ad di ~30% mark
 *   - 10-15 block  → 2 ad di ~30% + ~65% mark
 *   - > 15 block   → 3 ad di ~25% + ~50% + ~80% mark
 *
 * Admin override (content.articles.ad_position):
 *   - null/undefined → Auto multi-inject (per threshold di atas)
 *   - 0              → Disable iklan tengah completely (legacy disable)
 *   - N >= 1         → SINGLE ad mode di block N (honor admin intent)
 *
 * Editor override (content.articles.ad_settings.body_inject_enabled):
 *   - true (default) → Multi-inject active
 *   - false          → Skip multi-inject, render plain article
 *   Takes precedence over adPosition: kalau enabled=false, semua mode di-skip.
 *
 * History:
 *   - v1 (15 Mei 2026): single-ad inject + smart clamp
 *   - v2 (16 Mei 2026 Phase 1): multi-inject 1-3 ad smart spacing
 *   - v3 (16 Mei 2026 Phase 2 Turn 2): enabled + formatFilter props
 */

import AdInArticle from './AdInArticle';
import type { AdFormatFilter } from '@/lib/ad-settings';

// ────────────────────────────────────────────────────────────────
// CONSTANTS — Multi-inject threshold (Phase 1 v2 preserved)
// ────────────────────────────────────────────────────────────────

const MIN_BLOCKS_FOR_AD       = 4;
const THRESHOLD_DOUBLE_INJECT = 10;
const THRESHOLD_TRIPLE_INJECT = 16;

const SPACING_SINGLE = [0.30];
const SPACING_DOUBLE = [0.30, 0.65];
const SPACING_TRIPLE = [0.25, 0.50, 0.80];

// ────────────────────────────────────────────────────────────────
// HELPER — Split HTML jadi block-level elements
// ────────────────────────────────────────────────────────────────

function splitIntoBlocks(html: string): string[] {
  if (!html) return [];

  const blockRegex = /<(p|h[1-6]|ul|ol|blockquote|figure|pre|div)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const blocks: string[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    if (match.index > lastIdx) {
      const gap = html.slice(lastIdx, match.index).trim();
      if (gap) blocks.push(gap);
    }
    blocks.push(match[0]);
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < html.length) {
    const rest = html.slice(lastIdx).trim();
    if (rest) blocks.push(rest);
  }

  if (blocks.length === 0 && html.trim()) return [html];

  return blocks;
}

// ────────────────────────────────────────────────────────────────
// HELPER — Calculate insertion indices
// ────────────────────────────────────────────────────────────────

function calculateInsertionIndices(totalBlocks: number): number[] {
  if (totalBlocks < MIN_BLOCKS_FOR_AD) return [];

  let spacing: number[];

  if (totalBlocks >= THRESHOLD_TRIPLE_INJECT) {
    spacing = SPACING_TRIPLE;
  } else if (totalBlocks >= THRESHOLD_DOUBLE_INJECT) {
    spacing = SPACING_DOUBLE;
  } else {
    spacing = SPACING_SINGLE;
  }

  const rawIndices = spacing.map(pct => Math.floor(totalBlocks * pct));
  const clamped = rawIndices.map(idx => Math.min(Math.max(idx, 1), totalBlocks - 1));
  const unique  = Array.from(new Set(clamped)).sort((a, b) => a - b);

  const spaced: number[] = [];
  for (const idx of unique) {
    if (spaced.length === 0 || idx - spaced[spaced.length - 1] >= 2) {
      spaced.push(idx);
    }
  }

  return spaced;
}

// ────────────────────────────────────────────────────────────────
// COMPONENT
// ────────────────────────────────────────────────────────────────

interface Props {
  html: string;
  /**
   * Admin override dari field content.articles.ad_position:
   *   - null/undefined → Auto multi-inject (threshold-based)
   *   - 0              → Disable iklan tengah completely
   *   - N >= 1         → SINGLE ad mode di block N (honor admin intent)
   */
  adPosition?: number | null;
  /** @deprecated since v2, use threshold-based auto-spacing. */
  adAfterIndex?: number;
  /** Default minimum block (v2 const) */
  minBlocksForAd?: number;
  /**
   * Phase 2 Turn 2: Editor override via content.articles.ad_settings.body_inject_enabled.
   * Default true (backward compat). Kalau false → render plain article (skip multi-inject).
   */
  enabled?: boolean;
  /**
   * Phase 2 Turn 2: Format filter forwarded ke <AdInArticle />.
   * Default undefined (= 'all' = no filter).
   */
  formatFilter?: AdFormatFilter;
}

export default function BodyWithAds({
  html,
  adPosition,
  adAfterIndex,
  minBlocksForAd = MIN_BLOCKS_FOR_AD,
  enabled = true,       // Phase 2 Turn 2: default true (backward compat)
  formatFilter,         // Phase 2 Turn 2: forward to AdInArticle
}: Props) {
  const blocks = splitIntoBlocks(html);

  // ═══ Artikel kosong ═══
  if (blocks.length === 0) {
    return <div className="article-body" />;
  }

  // ═══ Phase 2 Turn 2: Editor disable via ad_settings ═══
  // Highest priority — kalau enabled=false, skip semua mode
  if (!enabled) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // ═══ Admin explicitly disable iklan tengah (ad_position = 0) ═══
  if (adPosition === 0) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // ═══ Artikel kependekan — skip iklan ═══
  if (blocks.length < minBlocksForAd) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // ═══ MODE A: Admin override single ad (adPosition >= 1) ═══
  if (adPosition && adPosition >= 1) {
    const safeIndex = Math.min(Math.max(adPosition, 1), blocks.length - 1);
    const beforeAd  = blocks.slice(0, safeIndex).join('');
    const afterAd   = blocks.slice(safeIndex).join('');

    return (
      <div className="article-body">
        <div dangerouslySetInnerHTML={{ __html: beforeAd }} />
        <AdInArticle formatFilter={formatFilter} />
        <div dangerouslySetInnerHTML={{ __html: afterAd }} />
      </div>
    );
  }

  // ═══ MODE B: Auto multi-inject (smart spacing) ═══
  let insertionIndices = calculateInsertionIndices(blocks.length);

  if (
    adAfterIndex !== undefined &&
    blocks.length < THRESHOLD_DOUBLE_INJECT &&
    insertionIndices.length === 1
  ) {
    const safeLegacy = Math.min(Math.max(adAfterIndex, 1), blocks.length - 1);
    insertionIndices = [safeLegacy];
  }

  if (insertionIndices.length === 0) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  const segments: string[] = [];
  let lastIdx = 0;
  for (const idx of insertionIndices) {
    segments.push(blocks.slice(lastIdx, idx).join(''));
    lastIdx = idx;
  }
  segments.push(blocks.slice(lastIdx).join(''));

  // Random key prefix untuk force fresh fetch per render
  const keyPrefix = Math.random().toString(36).slice(2, 8);

  return (
    <div className="article-body">
      {segments.map((segment, i) => (
        <div key={`seg-${i}`}>
          <div dangerouslySetInnerHTML={{ __html: segment }} />
          {i < segments.length - 1 && (
            <AdInArticle key={`${keyPrefix}-slot-${i}`} formatFilter={formatFilter} />
          )}
        </div>
      ))}
    </div>
  );
}

'use client';

/**
 * TeraLoka — BodyWithAds (v4)
 * Mission 8 Sub-Phase 8-D Phase 2 v3 (Turn 3a Refine)
 * ────────────────────────────────────────────────────────────────
 * Wrapper yang split artikel HTML jadi block-level elements, lalu
 * inject N banner `<AdInArticle />` di posisi smart-spaced.
 *
 * v4 Changes (16 Mei 2026 Turn 3a):
 *   - Replace `enabled?: boolean` prop → `count?: number` prop (0-3)
 *   - Render N instances per editor count setting
 *   - count=0 → skip semua inject (replace enabled=false behavior)
 *   - count=1/2/3 → inject N instances dengan smart spacing per N
 *
 * Smart spacing (count-based, replace Phase 1 threshold-based):
 *   - count=0       → 0 ad (skip)
 *   - count=1       → 1 ad di ~30% mark
 *   - count=2       → 2 ad di ~30% + ~65% mark
 *   - count=3       → 3 ad di ~25% + ~50% + ~80% mark
 *
 * Constraint: artikel < 4 block tetap skip (avoid ad spam di artikel pendek).
 *
 * Admin override (content.articles.ad_position):
 *   - null/undefined → Auto multi-inject (count-based)
 *   - 0              → Disable iklan tengah (legacy disable, force count=0)
 *   - N >= 1         → SINGLE ad mode di block N (override count, render 1 only)
 *
 * Backward compat:
 *   - count=undefined → fallback ke 2 (preserve current behavior)
 *
 * History:
 *   - v1 (15 Mei 2026): single-ad inject
 *   - v2 (16 Mei Phase 1): multi-inject 1-3 ad threshold-based
 *   - v3 (16 Mei Phase 2 Turn 2): enabled boolean prop
 *   - v4 (16 Mei Phase 2 v3 Turn 3a): count integer prop (replace boolean)
 */

import AdInArticle from './AdInArticle';
import type { AdFormatFilter } from '@/lib/ad-settings';

// ────────────────────────────────────────────────────────────────
// CONSTANTS
// ────────────────────────────────────────────────────────────────

const MIN_BLOCKS_FOR_AD = 4;  // < 4 block = artikel pendek, skip
const MAX_COUNT = 3;          // hard cap supaya UX gak overwhelm

const SPACING_BY_COUNT: Record<number, number[]> = {
  0: [],
  1: [0.30],
  2: [0.30, 0.65],
  3: [0.25, 0.50, 0.80],
};

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
// HELPER — Calculate insertion indices berdasarkan count
// ────────────────────────────────────────────────────────────────

function calculateInsertionIndices(totalBlocks: number, count: number): number[] {
  if (totalBlocks < MIN_BLOCKS_FOR_AD) return [];
  if (count <= 0) return [];

  const clampedCount = Math.min(Math.max(count, 0), MAX_COUNT);
  const spacing = SPACING_BY_COUNT[clampedCount] || SPACING_BY_COUNT[1];

  const rawIndices = spacing.map(pct => Math.floor(totalBlocks * pct));
  const clamped = rawIndices.map(idx => Math.min(Math.max(idx, 1), totalBlocks - 1));
  const unique  = Array.from(new Set(clamped)).sort((a, b) => a - b);

  // Safety: ensure minimum 2 block gap antar ad
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
   *   - null/undefined → Auto count-based inject
   *   - 0              → Disable iklan tengah (force skip)
   *   - N >= 1         → SINGLE ad mode di block N (override count, render 1)
   */
  adPosition?: number | null;
  /** Legacy prop (v2 Phase 1), kept for backward compat. */
  adAfterIndex?: number;
  /**
   * Phase 2 v3 (Turn 3a): jumlah ad di body (0-3).
   * Replace `enabled` boolean dari v3.
   * Default: 2 (preserve current behavior kalau prop tidak di-set).
   */
  count?: number;
  /**
   * Phase 2 Turn 2: Format filter forwarded ke <AdInArticle />.
   */
  formatFilter?: AdFormatFilter;
}

export default function BodyWithAds({
  html,
  adPosition,
  adAfterIndex,
  count = 2,            // default 2 (backward compat current behavior)
  formatFilter,
}: Props) {
  const blocks = splitIntoBlocks(html);

  // ═══ Artikel kosong ═══
  if (blocks.length === 0) {
    return <div className="article-body" />;
  }

  // ═══ Phase 2 v3: count=0 → skip semua inject ═══
  if (count === 0) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // ═══ Admin legacy disable (ad_position = 0) ═══
  if (adPosition === 0) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // ═══ Artikel pendek — skip iklan ═══
  if (blocks.length < MIN_BLOCKS_FOR_AD) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // ═══ MODE A: Admin override single ad (adPosition >= 1) ═══
  // Honor admin intent: skip count-based multi-inject, render 1 ad di block N
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

  // ═══ MODE B: Auto count-based multi-inject ═══
  const insertionIndices = calculateInsertionIndices(blocks.length, count);

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

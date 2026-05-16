'use client';

/**
 * TeraLoka — BodyWithAds (v2)
 * Mission 8 Sub-Phase 8-D Phase 1 (Multi-Inject Enhancement)
 * ────────────────────────────────────────────────────────────────
 * Wrapper yang split artikel HTML jadi block-level elements, lalu
 * inject 1-3 banner `<AdInArticle />` di posisi smart-spaced.
 *
 * v2 Changes (16 Mei 2026):
 *   - Multi-inject: artikel pendek (1 ad), medium (2 ad), panjang (3 ad)
 *   - Smart spacing 30% / 65% / 80% article length (auto-calc)
 *   - Admin override (ad_position N >= 1) = single ad mode (honor intent)
 *   - Random key per slot = force re-fetch (3 instance bisa show 3 ad random)
 *
 * Threshold:
 *   - < 4 block    → 0 ad (artikel kependekan, skip)
 *   - 4-9 block    → 1 ad di ~30% mark
 *   - 10-15 block  → 2 ad di ~30% + ~65% mark
 *   - > 15 block   → 3 ad di ~25% + ~50% + ~80% mark
 *
 * Admin override (content.articles.ad_position):
 *   - null/undefined → Auto multi-inject (per threshold di atas)
 *   - 0              → Disable iklan tengah completely
 *   - N >= 1         → SINGLE ad mode di block N (honor admin intent,
 *                      skip multi-inject feature)
 *
 * History:
 *   - v1 (15 Mei 2026): single-ad inject + smart clamp
 *   - v2 (16 Mei 2026): multi-inject 1-3 ad smart spacing
 */

import AdInArticle from './AdInArticle';

// ────────────────────────────────────────────────────────────────
// CONSTANTS — Multi-inject threshold
// ────────────────────────────────────────────────────────────────
// Tuned berdasarkan industry pattern (Kumparan, Detik, CNN Indo):
//   - Artikel pendek = 1 ad cukup (gak overload)
//   - Artikel panjang = 3 ad spread, hindari ad fatigue concentrated

const MIN_BLOCKS_FOR_AD       = 4;   // < 4 block = artikel kependekan, skip
const THRESHOLD_DOUBLE_INJECT = 10;  // 10+ block = inject 2 ad
const THRESHOLD_TRIPLE_INJECT = 16;  // 16+ block = inject 3 ad

// Spacing percentages (relative to article length)
const SPACING_SINGLE = [0.30];                  // 1 ad mode
const SPACING_DOUBLE = [0.30, 0.65];            // 2 ad mode
const SPACING_TRIPLE = [0.25, 0.50, 0.80];      // 3 ad mode

// ────────────────────────────────────────────────────────────────
// HELPER — Split HTML jadi block-level elements
// ────────────────────────────────────────────────────────────────

/**
 * Split HTML body jadi block-level elements (p, h1-h6, ul, ol, blockquote, figure, pre, div).
 * Dipakai untuk inject iklan di tengah artikel tanpa merusak struktur HTML.
 */
function splitIntoBlocks(html: string): string[] {
  if (!html) return [];

  const blockRegex = /<(p|h[1-6]|ul|ol|blockquote|figure|pre|div)\b[^>]*>[\s\S]*?<\/\1>/gi;
  const blocks: string[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = blockRegex.exec(html)) !== null) {
    // Kalau ada text di antara blocks (safety net buat HTML tidak standar)
    if (match.index > lastIdx) {
      const gap = html.slice(lastIdx, match.index).trim();
      if (gap) blocks.push(gap);
    }
    blocks.push(match[0]);
    lastIdx = match.index + match[0].length;
  }

  // Sisa text setelah match terakhir
  if (lastIdx < html.length) {
    const rest = html.slice(lastIdx).trim();
    if (rest) blocks.push(rest);
  }

  // Fallback: kalau regex tidak match apapun (HTML aneh), treat as 1 block utuh
  if (blocks.length === 0 && html.trim()) return [html];

  return blocks;
}

// ────────────────────────────────────────────────────────────────
// HELPER — Calculate insertion indices berdasarkan threshold
// ────────────────────────────────────────────────────────────────

/**
 * Determine multi-inject insertion indices.
 *
 * @param totalBlocks Jumlah block dalam artikel
 * @returns Array of indices (sorted ascending) where ads should be inserted.
 *          Empty array kalau artikel kependekan.
 */
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

  // Calculate raw indices dari percentages
  const rawIndices = spacing.map(pct => Math.floor(totalBlocks * pct));

  // Clamp + dedupe + sort
  const clamped = rawIndices.map(idx => Math.min(Math.max(idx, 1), totalBlocks - 1));
  const unique  = Array.from(new Set(clamped)).sort((a, b) => a - b);

  // Safety: ensure minimum 2 block gap antar ad (avoid adjacent ads)
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
  /**
   * Default auto position kalau adPosition tidak di-set DAN artikel pendek
   * (< THRESHOLD_DOUBLE_INJECT). Currently superseded oleh smart spacing,
   * disimpan untuk backward compat saja.
   * @deprecated since v2, use threshold-based auto-spacing.
   */
  adAfterIndex?: number;
  /**
   * Minimum jumlah block supaya iklan tengah muncul.
   * Default: MIN_BLOCKS_FOR_AD (4).
   */
  minBlocksForAd?: number;
}

export default function BodyWithAds({
  html,
  adPosition,
  adAfterIndex,         // v2: deprecated, kept for backward compat
  minBlocksForAd = MIN_BLOCKS_FOR_AD,
}: Props) {
  const blocks = splitIntoBlocks(html);

  // ═══ Artikel kosong ═══
  if (blocks.length === 0) {
    return <div className="article-body" />;
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
  // Honor admin intent: kalau super admin set ad_position manual,
  // pakai itu sebagai single ad slot. Skip multi-inject feature.
  if (adPosition && adPosition >= 1) {
    const safeIndex = Math.min(Math.max(adPosition, 1), blocks.length - 1);
    const beforeAd  = blocks.slice(0, safeIndex).join('');
    const afterAd   = blocks.slice(safeIndex).join('');

    return (
      <div className="article-body">
        <div dangerouslySetInnerHTML={{ __html: beforeAd }} />
        <AdInArticle />
        <div dangerouslySetInnerHTML={{ __html: afterAd }} />
      </div>
    );
  }

  // ═══ MODE B: Auto multi-inject (smart spacing) ═══
  // Threshold-based: 4-9 = 1 ad, 10-15 = 2 ad, 16+ = 3 ad

  // Backward compat: kalau adAfterIndex di-set legacy (numeric),
  // dan article cuma medium length (4-9), pakai single inject di adAfterIndex.
  // Saat ini di-call dari slug page dengan adAfterIndex={3} → fallback ke
  // single inject untuk artikel pendek-medium.
  let insertionIndices = calculateInsertionIndices(blocks.length);

  // Legacy adAfterIndex respect — kalau artikel pendek-medium (< 10 block)
  // dan caller pass adAfterIndex explicitly, pakai itu untuk slot pertama
  if (
    adAfterIndex !== undefined &&
    blocks.length < THRESHOLD_DOUBLE_INJECT &&
    insertionIndices.length === 1
  ) {
    const safeLegacy = Math.min(Math.max(adAfterIndex, 1), blocks.length - 1);
    insertionIndices = [safeLegacy];
  }

  // Edge case safety: kalau tidak ada index valid, render plain article
  if (insertionIndices.length === 0) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // ═══ Render dengan multi-inject ═══
  // Strategi: split blocks ke segment per insertion point,
  // inject <AdInArticle /> antar segment.
  //
  // Example untuk insertionIndices = [4, 8, 13] di artikel 16 block:
  //   Segment 1: blocks[0..4]   → <AdInArticle key="slot-0" />
  //   Segment 2: blocks[4..8]   → <AdInArticle key="slot-1" />
  //   Segment 3: blocks[8..13]  → <AdInArticle key="slot-2" />
  //   Segment 4: blocks[13..end]

  const segments: string[] = [];
  let lastIdx = 0;
  for (const idx of insertionIndices) {
    segments.push(blocks.slice(lastIdx, idx).join(''));
    lastIdx = idx;
  }
  segments.push(blocks.slice(lastIdx).join(''));

  // Random key prefix untuk force fresh fetch per render (avoid same ad 3x)
  // Note: AdInArticle fetch dipanggil di useEffect mount; React Strict Mode
  // mungkin double-mount, tapi key prop tetap memastikan tiap slot independent.
  const keyPrefix = Math.random().toString(36).slice(2, 8);

  return (
    <div className="article-body">
      {segments.map((segment, i) => (
        <div key={`seg-${i}`}>
          <div dangerouslySetInnerHTML={{ __html: segment }} />
          {/* Inject ad setelah segment, kecuali segment terakhir */}
          {i < segments.length - 1 && (
            <AdInArticle key={`${keyPrefix}-slot-${i}`} />
          )}
        </div>
      ))}
    </div>
  );
}

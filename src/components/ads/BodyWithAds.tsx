'use client';

import AdInArticle from './AdInArticle';

/**
 * Split HTML body jadi block-level elements (p, h1-h6, ul, ol, blockquote, figure, pre).
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

interface Props {
  html: string;
  /** Inject iklan SETELAH block index ini (1-based). Default: 3. */
  adAfterIndex?: number;
  /** Minimum jumlah block supaya iklan tengah muncul. Default: 4. */
  minBlocksForAd?: number;
}

export default function BodyWithAds({ html, adAfterIndex = 3, minBlocksForAd = 4 }: Props) {
  const blocks = splitIntoBlocks(html);

  // Artikel kosong
  if (blocks.length === 0) {
    return <div className="article-body" />;
  }

  // Artikel pendek — tidak cukup panjang untuk iklan tengah
  if (blocks.length < minBlocksForAd) {
    return <div className="article-body" dangerouslySetInnerHTML={{ __html: html }} />;
  }

  // Split body jadi "sebelum iklan" + "sesudah iklan"
  // adAfterIndex = 3 artinya iklan muncul SETELAH block ke-3 (yaitu sebelum block ke-4)
  const safeIndex = Math.min(adAfterIndex, blocks.length - 1);
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

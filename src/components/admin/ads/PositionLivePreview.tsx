/**
 * ════════════════════════════════════════════════════════════════════════
 * PositionLivePreview — Mini-player preview untuk PositionCreativeModal
 * ────────────────────────────────────────────────────────────────────────
 * SESI 5E Phase 3c (19 Mei 2026)
 *
 * Render live preview banner/native dengan:
 *   - Responsive aspect-ratio per position (sync ke position-render-metadata)
 *   - Static mode: single image render
 *   - DCA mode: rotate frames via useAdRotation hook (sama dengan production)
 *   - Pause-on-hover: freeze rotation untuk detail check
 *   - Dots indicator untuk DCA variants
 *   - IKLAN badge + advertiser name + headline overlay
 *
 * Filosofi: MIRROR visual structure production tanpa fetch API.
 * Komponen ini self-contained — terima props dari form state, gak fetch backend.
 *
 * Layout adaptif by aspect ratio (parsed dari recommendedImageDim):
 *   - Wide (ratio > 2.5):    BANNER_WIDE — horizontal banner full-width
 *   - Tall (ratio < 0.5):    SKYSCRAPER — vertical tall (160×600)
 *   - Square (~0.9-1.1):     SQUARE — compact card
 *   - Portrait (0.5-0.9):    PORTRAIT — hero/native card
 *   - Standard (1.1-2.5):    CARD — sidebar/standard card
 * ════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo } from 'react';
import { ExternalLink, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAdRotation, type AdFrame } from '@/hooks/useAdRotation';
import { getPositionMetadata } from './position-render-metadata';
// SESI 5E Phase 3c: Mirror production Kumparan-style disclosure logic
import { getAdLabel } from '@/lib/ads/getAdLabel';

interface Props {
  positionKey: string;
  mode: 'static' | 'dca';
  /** Image untuk static mode (atau fallback default kalau DCA frames kosong) */
  imageUrl?: string;
  /** Frames untuk DCA mode */
  frames?: AdFrame[];
  /** Headline overlay (static mode pakai state.title, DCA pakai frame.headline) */
  headline?: string;
  /** Advertiser name untuk badge */
  advertiserName?: string;
  /** SESI 5E Phase 3c: Advertiser type untuk Kumparan-style conditional disclosure */
  advertiserType?: 'umum' | 'komersial' | 'premium' | 'pemerintah' | 'politisi' | string;
  /** Ad format — text mode render advertorial card style */
  adFormat?: 'image' | 'text' | 'animated';
  /** Body untuk text mode preview */
  body?: string;
  /** Slug untuk Bakabar external link */
  slug?: string;
}

/** Parse "888×220px" → { w: 888, h: 220 } */
function parseDim(dim: string): { w: number; h: number } | null {
  const match = dim.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (!match) return null;
  return { w: parseInt(match[1], 10), h: parseInt(match[2], 10) };
}

/** Layout type dispatch by aspect ratio */
type LayoutType = 'banner_wide' | 'skyscraper' | 'square' | 'portrait' | 'card';

function getLayoutType(ratio: number): LayoutType {
  if (ratio > 2.5) return 'banner_wide';   // 888×220 (4:1), 1600×200 (8:1)
  if (ratio < 0.5) return 'skyscraper';     // 160×600 (1:3.75)
  if (ratio >= 0.9 && ratio <= 1.1) return 'square';  // 104×104, 112×112
  if (ratio < 0.9) return 'portrait';       // 208×312, 160×240
  return 'card';                            // 300×200, 700×192
}

export default function PositionLivePreview({
  positionKey,
  mode,
  imageUrl,
  frames,
  headline,
  advertiserName,
  advertiserType,
  adFormat = 'image',
  body,
  slug,
}: Props) {
  const [paused, setPaused] = useState(false);

  const meta = getPositionMetadata(positionKey);

  // SESI 5E Phase 3c: Compute label SAMA seperti production (mirror behavior)
  const adLabel = getAdLabel({ advertiser_type: advertiserType, ad_format: adFormat });
  // Parse aspect ratio
  const parsedDim = useMemo(() => parseDim(meta.recommendedImageDim), [meta.recommendedImageDim]);
  const ratio = parsedDim ? parsedDim.w / parsedDim.h : 4 / 1; // fallback wide banner
  const layoutType = getLayoutType(ratio);

  // DCA rotation — hanya aktif kalau mode='dca' + frames ≥ 2
  const rotationValue = mode === 'dca' && frames && frames.length > 0 ? frames : null;
  const { active, index, total, isDCA } = useAdRotation(rotationValue, positionKey, paused);

  // Determine current frame data
  const currentImage = mode === 'dca' && active?.image_url ? active.image_url : imageUrl;
  const currentHeadline = mode === 'dca' && active?.headline ? active.headline : headline;

  // Bakabar live preview URL
  const bakabarUrl = meta.frontendUrl
    ? slug
      ? `https://teraloka.vercel.app${meta.frontendUrl}/${slug}`
      : `https://teraloka.vercel.app${meta.frontendUrl}`
    : null;

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
          👀 Live Preview
        </p>
        <div className="flex items-center gap-2">
          {isDCA && (
            <span className="text-[9px] font-semibold text-ads">
              DCA · {index + 1}/{total}
            </span>
          )}
          {paused && isDCA && (
            <span className="flex items-center gap-1 text-[9px] text-amber-500 font-bold">
              <Pause size={8} />
              Paused
            </span>
          )}
        </div>
      </div>

      {/* Preview Container — responsive aspect ratio */}
      <div
        className={cn(
          'relative w-full mx-auto overflow-hidden rounded-md bg-surface-muted',
          'border border-border/60',
          // Max width sesuai layout type — biar gak ke-stretch di modal
          layoutType === 'banner_wide' && 'max-w-full',
          layoutType === 'skyscraper' && 'max-w-[160px]',
          layoutType === 'square' && 'max-w-[180px]',
          layoutType === 'portrait' && 'max-w-[220px]',
          layoutType === 'card' && 'max-w-[320px]',
        )}
        style={{ aspectRatio: `${parsedDim?.w ?? 4} / ${parsedDim?.h ?? 1}` }}
        onMouseEnter={() => isDCA && setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* SESI 5E Phase 3c: Kumparan-style conditional disclosure
            (mirror production behavior — null untuk banner umum/komersial/premium) */}
        {adLabel && (
          <span className="absolute top-1.5 right-1.5 z-20 text-[8px] font-extrabold uppercase tracking-wider bg-amber-500 text-white px-1.5 py-0.5 rounded shadow-sm">
            {adLabel}
          </span>
        )}

        {adFormat === 'text' ? (
          // ─── Advertorial text mode preview ───
          <div className="absolute inset-0 p-3 flex flex-col gap-1.5 bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-900/20">
            {advertiserName && (
              <p className="text-[9px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 truncate">
                {advertiserName}
              </p>
            )}
            {currentHeadline && (
              <p className="text-[12px] font-bold text-amber-950 dark:text-amber-100 line-clamp-2 leading-tight">
                {currentHeadline}
              </p>
            )}
            {body && (
              <p className="text-[10px] text-amber-900/80 dark:text-amber-200/80 line-clamp-3 leading-snug">
                {body}
              </p>
            )}
          </div>
        ) : currentImage ? (
          // ─── Image mode ───
          <>
            <img
              src={currentImage}
              alt={currentHeadline ?? advertiserName ?? 'Ad preview'}
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-300"
            />
            {/* Headline overlay — gradient bottom */}
            {(currentHeadline || advertiserName) && layoutType !== 'square' && (
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 via-black/40 to-transparent">
                {advertiserName && (
                  <p className="text-[8px] font-bold uppercase tracking-wider text-white/90 mb-0.5 truncate">
                    {advertiserName}
                  </p>
                )}
                {currentHeadline && (
                  <p className="text-[11px] font-bold text-white line-clamp-2 leading-tight">
                    {currentHeadline}
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          // ─── Empty placeholder ───
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-subtle">
            <p className="text-[10px] font-semibold uppercase tracking-wider">No Image</p>
            <p className="text-[9px] mt-0.5">{meta.recommendedImageDim}</p>
          </div>
        )}
      </div>

      {/* DCA Dots Indicator */}
      {isDCA && (
        <div className="flex justify-center gap-1.5 mt-2">
          {Array.from({ length: total }).map((_, i) => (
            <span
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === index ? 'bg-ads w-4' : 'bg-text-subtle/40 w-1.5',
              )}
            />
          ))}
        </div>
      )}

      {/* Footer info */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <p className="text-[9px] text-text-subtle">
          📐 {meta.recommendedImageDim}
          {isDCA && ` · ${active?.duration_ms ?? 5000}ms/variant`}
        </p>
        {bakabarUrl && (
          <a
            href={bakabarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[9px] text-ads hover:underline font-semibold"
          >
            Buka di Bakabar
            <ExternalLink size={9} />
          </a>
        )}
      </div>

      {/* Hover hint untuk DCA */}
      {isDCA && !paused && (
        <p className="text-[8px] text-text-subtle text-center mt-1.5 italic">
          Hover preview untuk pause rotation
        </p>
      )}
    </div>
  );
}

/**
 * ════════════════════════════════════════════════════════════════════════
 * PositionLivePreview — Mini-player preview untuk PositionCreativeModal
 * ────────────────────────────────────────────────────────────────────────
 * SESI 5E Phase 3c (19 Mei 2026)
 * SESI 11 L4 (30 Mei 2026): IN-CONTEXT preview
 *
 * SESI 11 L4 — kenapa di-upgrade:
 *   Versi lama render banner MELAYANG SENDIRI (kotak + gambar) tanpa konteks.
 *   Admin lihat banner-nya, tapi gak ngerti DI MANA dia nempel di BAKABAR →
 *   "Banner di Tengah Artikel maksudnya gimana?".
 *
 *   Sekarang banner dibungkus MOCK HALAMAN sesuai pageGroup:
 *     - in_article_native → mock artikel: judul + teks, banner di tengah teks
 *     - sidebar           → mock 2-kolom: artikel kiri, banner di kolom kanan
 *     - banner_area/hero  → mock homepage: bar BAKABAR atas, banner, grid kartu
 *   Creative beneran tetap dirender + DCA rotate beneran (mirror production).
 *
 *   Link "Buka di Bakabar" (footer) DIBUANG — polanya nembak
 *   teraloka.vercel.app/bakabar/sample-article/... (artikel fiktif). Preview
 *   inline udah cukup; gak perlu link keluar yang nyasar.
 *
 * Filosofi: MIRROR visual structure production tanpa fetch API. Self-contained.
 * ════════════════════════════════════════════════════════════════════════
 */

import { useState, useMemo, type ReactNode } from 'react';
import { Pause } from 'lucide-react';
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
  /** Slug untuk Bakabar external link (tidak dipakai lagi sejak SESI 11 L4) */
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

/** SESI 11 L4: konteks halaman tempat banner nempel */
type ContextType = 'article' | 'sidebar' | 'homepage';

function getContextType(pageGroup: string): ContextType {
  switch (pageGroup) {
    case 'sidebar':           return 'sidebar';
    case 'banner_area':       return 'homepage';
    case 'hero_special':      return 'homepage';
    case 'in_article_native':
    default:                  return 'article';
  }
}

function getScopeText(ctx: ContextType): string {
  switch (ctx) {
    case 'homepage': return 'homepage / atas halaman';
    case 'sidebar':  return 'kolom samping artikel';
    case 'article':
    default:         return 'dalam badan artikel';
  }
}

/** SESI 11 L4: route path BAKABAR per posisi (biar admin lihat URL-nya) */
function getRouteLabel(pageGroup: string): string {
  switch (pageGroup) {
    case 'in_article_native': return '/bakabar/[slug-artikel]';
    case 'sidebar':           return '/bakabar/[slug-artikel]';
    case 'hero_special':      return '/bakabar';
    case 'banner_area':       return '/bakabar  +  /bakabar/[slug]';
    default:                  return '/bakabar';
  }
}

/** SESI 11 L4: baris teks palsu (placeholder konteks) */
function FauxLines({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-2 rounded bg-text-subtle/15"
          style={{ width: i === count - 1 ? '65%' : '100%' }}
        />
      ))}
    </div>
  );
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
}: Props) {
  const [paused, setPaused] = useState(false);

  const meta = getPositionMetadata(positionKey);

  // SESI 5E Phase 3c: Compute label SAMA seperti production (mirror behavior)
  const adLabel = getAdLabel({ advertiser_type: advertiserType, ad_format: adFormat });

  // Parse aspect ratio
  const parsedDim = useMemo(() => parseDim(meta.recommendedImageDim), [meta.recommendedImageDim]);
  const ratio = parsedDim ? parsedDim.w / parsedDim.h : 4 / 1; // fallback wide banner
  const layoutType = getLayoutType(ratio);

  // SESI 11 L4: konteks halaman
  const ctx = getContextType(meta.pageGroup);
  const scopeText = getScopeText(ctx);
  const routeLabel = getRouteLabel(meta.pageGroup);

  // DCA rotation — hanya aktif kalau mode='dca' + frames ≥ 2
  const rotationValue = mode === 'dca' && frames && frames.length > 0 ? frames : null;
  const { active, index, total, isDCA } = useAdRotation(rotationValue, positionKey, paused);

  // Determine current frame data
  const currentImage = mode === 'dca' && active?.image_url ? active.image_url : imageUrl;
  const currentHeadline = mode === 'dca' && active?.headline ? active.headline : headline;

  // ─── BANNER BOX (creative beneran — dibungkus konteks di bawah) ───
  const bannerBox: ReactNode = (
    <div className="flex flex-col items-center w-full">
      <div
        className={cn(
          'relative w-full mx-auto overflow-hidden rounded-md bg-surface-muted',
          'border border-border/60 shadow-sm',
          layoutType === 'banner_wide' && 'max-w-full',
          layoutType === 'skyscraper' && 'max-w-[140px]',
          layoutType === 'square' && 'max-w-[150px]',
          layoutType === 'portrait' && 'max-w-[180px]',
          layoutType === 'card' && 'max-w-[300px]',
        )}
        style={{ aspectRatio: `${parsedDim?.w ?? 4} / ${parsedDim?.h ?? 1}` }}
        onMouseEnter={() => isDCA && setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {/* Kumparan-style conditional disclosure (mirror production) */}
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
          <div className="absolute inset-0 flex flex-col items-center justify-center text-text-subtle gap-0.5">
            <p className="text-[10px] font-semibold">Banner lo tampil di sini</p>
            <p className="text-[9px]">{meta.recommendedImageDim}</p>
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
    </div>
  );

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-text-muted">
            👀 Preview — tampil di {scopeText}
          </p>
          <span className="inline-flex items-center text-[9px] font-mono px-1.5 py-0.5 rounded bg-bakabar/10 text-bakabar border border-bakabar/30">
            {routeLabel}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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

      {/* ─── KONTEKS HALAMAN (mock) ─── */}
      {ctx === 'homepage' ? (
        // Mock homepage: bar BAKABAR + banner atas + grid kartu berita
        <div className="rounded-md border border-border/60 bg-surface-muted/20 p-2.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[10px] font-extrabold tracking-wide text-bakabar">BAKABAR</span>
            <div className="flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-1.5 w-5 rounded bg-text-subtle/25" />
              ))}
            </div>
          </div>
          {bannerBox}
          <div className="grid grid-cols-3 gap-2 mt-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="aspect-video rounded bg-text-subtle/15" />
                <div className="h-1.5 w-full rounded bg-text-subtle/20" />
                <div className="h-1.5 w-2/3 rounded bg-text-subtle/15" />
              </div>
            ))}
          </div>
        </div>
      ) : ctx === 'sidebar' ? (
        // Mock 2-kolom: artikel kiri, banner di kolom kanan
        <div className="rounded-md border border-border/60 bg-surface-muted/20 p-3">
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <div className="h-3 w-3/4 rounded bg-text-subtle/25 mb-2.5" />
              <FauxLines count={8} />
            </div>
            <div className="shrink-0 pt-1">
              {bannerBox}
              <p className="text-[8px] text-text-subtle text-center mt-1">↑ banner samping</p>
            </div>
          </div>
        </div>
      ) : (
        // Mock artikel: judul + teks, banner nempel di TENGAH badan artikel
        <div className="rounded-md border border-border/60 bg-surface-muted/20 p-3 mx-auto max-w-[440px]">
          <div className="h-3 w-4/5 rounded bg-text-subtle/25 mb-1.5" />
          <div className="h-2 w-1/3 rounded bg-text-subtle/15 mb-3" />
          <FauxLines count={3} className="mb-3" />
          <div className="flex justify-center">{bannerBox}</div>
          <FauxLines count={3} className="mt-3" />
        </div>
      )}

      {/* Footer info (link "Buka di Bakabar" dibuang — SESI 11 L4) */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/40">
        <p className="text-[9px] text-text-subtle">
          📐 {meta.recommendedImageDim}
          {isDCA && ` · ${active?.duration_ms ?? 5000}ms/variant`}
        </p>
        {isDCA && !paused && (
          <p className="text-[8px] text-text-subtle italic">Hover preview untuk pause rotation</p>
        )}
      </div>
    </div>
  );
}

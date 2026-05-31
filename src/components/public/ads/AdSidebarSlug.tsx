'use client';

/**
 * TeraLoka — AdSidebarSlug (v6)
 * Mission 8 Sub-Phase 8-D Phase 2 Turn 2 + SESI 5H Phase 5B
 * ────────────────────────────────────────────────────────────────
 * Sidebar ad untuk slug page BAKABAR.
 *
 * v6 Changes (21 Mei 2026 SESI 5H Phase 5B):
 *   - Support ad_format='animated' (GSAP DCA-Aligned variant carousel)
 *   - Resolve animation_timeline['sidebar'] from Record shape
 *   - Render AdAnimatedBanner kalau variants[] available
 *   - Static fallback ke image branch kalau variants empty/invalid
 *
 * History:
 *   - v1-v5: see git log
 *   - v6 (21 Mei 2026 SESI 5H Phase 5B): animated DCA-Aligned support
 */

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { Newspaper } from 'lucide-react';
import { useAdRotation, type AdFrame } from '@/hooks/useAdRotation';
import { useRegion, buildRegionParam } from '@/contexts/RegionContext';
// SESI 5E Phase 3c: Kumparan-style disclosure label
import { getAdLabel, isLabelMandatory } from '@/lib/ads/getAdLabel';
import type { AdFormatFilter } from '@/lib/ad-settings';
import { buildFormatFilterParam } from '@/lib/ad-settings';
// SESI 5H Phase 5B (21 Mei 2026): GSAP animated banner DCA-Aligned
import AdAnimatedBanner, {
  type AnimationTimelineConfig,
} from '@/components/public/ads/AdAnimatedBanner';
// SESI 10 (24 Mei 2026): Video banner (MP4+WebM per-position)
import AdVideoBanner, {
  type AdVideoSource,
} from '@/components/public/ads/AdVideoBanner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

// Sidebar position dimensions (MPU square-ish)
const SIDEBAR_WIDTH  = 300;
const SIDEBAR_HEIGHT = 250;

interface Ad {
  id: string;
  title: string;
  body?: string;
  image_url?: string | null;
  link_url: string;
  // SESI 5H Phase 5B: +animated format
  // SESI 10: +video format
  ad_format?: 'image' | 'text' | 'animated' | 'video';
  slug?: string;
  advertiser_name?: string;
  advertiser_logo_url?: string | null;
  advertiser_type?: 'umum' | 'politisi' | 'pemerintah' | 'komersial';
  disclaimer_text?: string | null;
  creative_frames?: AdFrame[] | null;
  // SESI 5H Phase 5B: Per-position animation timelines (Record shape)
  animation_timeline?: Record<string, AnimationTimelineConfig> | null;
  // SESI 10: Per-position video sources (Record shape)
  video_sources?: Record<string, AdVideoSource> | null;
}

interface Props {
  formatFilter?: AdFormatFilter;
}

async function fetchActiveAd(
  position: string,
  region: string | null,
  formatFilter?: AdFormatFilter,
): Promise<Ad | null> {
  try {
    const url = `${API}/public/ads?position=${position}${buildRegionParam(region)}${buildFormatFilterParam(formatFilter)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) return null;
    const ads = data.data ?? [];
    if (!ads.length) return null;
    return ads[Math.floor(Math.random() * ads.length)];
  } catch {
    return null;
  }
}

function trackAdClick(adId: string) {
  fetch(`${API}/public/ads/${adId}/click`, { method: 'POST' }).catch(() => {});
}

const ADVERTISER_TYPE_LABEL: Record<string, string> = {
  pemerintah: 'Pemerintah',
  politisi:   'Kampanye Politik',
  komersial:  'Mitra Bisnis',
  umum:       'Konten Mitra',
};

function truncate(text: string, max: number): string {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

export default function AdSidebarSlug({ formatFilter }: Props = {}) {
  const { region } = useRegion();

  const [ad,      setAd]      = useState<Ad | null>(null);
  const [loaded,  setLoaded]  = useState(false);
  const [visible, setVisible] = useState(false);
  const [refEl,   setRefEl]   = useState<HTMLElement | null>(null);

  // Re-fetch saat region atau formatFilter berubah
  useEffect(() => {
    setLoaded(false);
    fetchActiveAd('sidebar', region, formatFilter).then(a => { setAd(a); setLoaded(true); });
  }, [region, formatFilter]);

  useEffect(() => {
    if (!refEl) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    obs.observe(refEl);
    return () => obs.disconnect();
  }, [refEl]);

  const setRef = useCallback((el: HTMLElement | null) => {
    setRefEl(el);
  }, []);

  // DCA rotation (SESI 5E Phase 2: pass positionKey untuk Hybrid C support)
  // SESI 5E Phase 3c: dots indicator hidden — only `active` frame needed
  const { active: activeFrame } =
    useAdRotation(ad?.creative_frames, 'sidebar');

  const animStyle: React.CSSProperties = {
    opacity:    visible ? 1 : 0,
    transform:  visible ? 'translateY(0)' : 'translateY(16px)',
    transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
    willChange: 'opacity, transform',
  };

  // ═══ Skeleton loading ═══
  if (!loaded) {
    return (
      <>
        <style>{`
          @keyframes bk-sb-shimmer {
            0%   { background-position: -200% 0; }
            100% { background-position:  200% 0; }
          }
          .bk-sb-skel {
            background: linear-gradient(90deg, #F3F4F6 0%, #E5E7EB 50%, #F3F4F6 100%);
            background-size: 200% 100%;
            animation: bk-sb-shimmer 1.8s ease-in-out infinite;
          }
        `}</style>
        <div ref={setRef} className="bk-sb-skel rounded-xl h-52 w-full" style={animStyle} />
      </>
    );
  }

  // ═══ Fallback placeholder ═══
  if (!ad) {
    return (
      <div ref={setRef} className="bg-gray-50 border border-dashed border-gray-200 rounded-xl h-52 flex items-center justify-center"
        style={animStyle}>
        <div className="text-center">
          <p className="text-xs text-gray-400 font-bold uppercase">IKLAN MITRA</p>
          <p className="text-xs text-gray-300 mt-1">300 × 200</p>
        </div>
      </div>
    );
  }

  // ═══ VIDEO BANNER (SESI 10) ═══
  // Branch SEBELUM animated/text/image. Resolve video_sources['sidebar'].
  // Fallback ke image branch kalau source absent (graceful).
  // SESI 11 (31 Mei): ad_format = HINT. Masuk branch kalau posisi sidebar PUNYA
  // video_sources, apa pun global ad_format-nya (dukung iklan mixed).
  if (ad.video_sources?.['sidebar']) {
    const sidebarVideo = ad.video_sources?.['sidebar'];

    if (sidebarVideo && sidebarVideo.mp4) {
      return (
        <div ref={setRef as any} style={animStyle}>
          <AdVideoBanner
            ad={{
              id:                  ad.id,
              link_url:            ad.link_url,
              advertiser_name:     ad.advertiser_name ?? 'Sponsor',
              advertiser_logo_url: ad.advertiser_logo_url ?? null,
              disclaimer_text:     ad.disclaimer_text ?? null,
              video_sources:       ad.video_sources ?? null,
              image_url:           ad.image_url ?? null,
            }}
            positionKey="sidebar"
            width={SIDEBAR_WIDTH}
            height={SIDEBAR_HEIGHT}
            onClick={trackAdClick}
          />
        </div>
      );
    }
    // Fallback: lanjut ke image branch
  }

  // ═══ ANIMATED BANNER (SESI 5H Phase 5B DCA-Aligned) ═══
  // Branch SEBELUM text/image karena ad_format='animated' bisa override visual mode.
  // Resolve timeline dari Record per-position. Cek variants[] (Phase 5B shape).
  // Fallback ke image branch kalau timeline empty/invalid (graceful degradation).
  if (ad.ad_format === 'animated') {
    const sidebarTimeline = ad.animation_timeline?.['sidebar'];

    if (sidebarTimeline && Array.isArray(sidebarTimeline.variants) && sidebarTimeline.variants.length > 0) {
      return (
        <div ref={setRef as any} style={animStyle}>
          <AdAnimatedBanner
            ad={{
              id:                  ad.id,
              slug:                ad.slug ?? null,
              title:               ad.title,
              body:                ad.body ?? null,
              image_url:           ad.image_url ?? null,
              link_url:            ad.link_url,
              advertiser_name:     ad.advertiser_name ?? 'Sponsor',
              advertiser_logo_url: ad.advertiser_logo_url ?? null,
              disclaimer_text:     ad.disclaimer_text ?? null,
              animation_timeline:  sidebarTimeline,
            }}
            width={SIDEBAR_WIDTH}
            height={SIDEBAR_HEIGHT}
            onClick={trackAdClick}
          />
        </div>
      );
    }
    // Fallback: lanjut ke image branch
  }

  // ═══ TEXT ADVERTORIAL — sidebar card ═══
  if (ad.ad_format === 'text' && ad.slug) {
    const typeLabel = ADVERTISER_TYPE_LABEL[ad.advertiser_type || 'umum'] || 'Konten Mitra';
    const preview = truncate(ad.body || '', 90);

    return (
      <Link
        ref={setRef as any}
        href={`/bakabar/sponsored/${ad.slug}`}
        onClick={() => trackAdClick(ad.id)}
        className="block rounded-xl overflow-hidden border hover:shadow-md transition-all"
        style={{
          ...animStyle,
          background: 'linear-gradient(to bottom right, #FFFBEB, #FEF3C7)',
          borderColor: '#FDE68A',
        }}>
        <div className="p-4">
          <div className="flex items-center gap-1.5 mb-2 flex-wrap">
            <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded uppercase tracking-wide border border-amber-300">
              {typeLabel}
            </span>
          </div>

          {ad.advertiser_logo_url && (
            <img src={ad.advertiser_logo_url} alt={ad.advertiser_name}
              className="w-10 h-10 rounded-full object-cover mb-2 bg-white" />
          )}

          <p className="text-xs font-semibold text-amber-900 mb-1 truncate">{ad.advertiser_name}</p>

          <h4 className="text-sm font-bold text-gray-900 leading-snug mb-1.5 line-clamp-2">
            {ad.title}
          </h4>

          <p className="text-[11px] text-gray-700 leading-relaxed line-clamp-3 mb-2">
            {preview}
          </p>

          <p className="text-[11px] font-bold text-amber-900">Baca selengkapnya →</p>

          {ad.disclaimer_text && (
            <p className="mt-2 pt-2 border-t border-amber-200 text-[9px] text-amber-800 italic leading-tight line-clamp-3">
              {ad.disclaimer_text}
            </p>
          )}
        </div>
      </Link>
    );
  }

  // ═══ IMAGE BANNER — DCA + disclaimer ═══
  const displayImage = activeFrame?.image_url || ad.image_url;
  const displayTitle = activeFrame?.headline  || ad.title;

  return (
    <>
      <style>{`
        @keyframes bk-sb-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.7); }
          50%      { box-shadow: 0 0 0 5px rgba(251, 191, 36, 0); }
        }
        .bk-sb-label-pulse {
          animation: bk-sb-pulse 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
      <a ref={setRef} href={ad.link_url} target="_blank" rel="noopener noreferrer sponsored"
        onClick={() => trackAdClick(ad.id)}
        className="block rounded-xl overflow-hidden relative h-52 hover:opacity-95 transition-opacity"
        style={animStyle}>
        {displayImage ? (
          <img
            key={displayImage}
            src={displayImage}
            alt={displayTitle}
            className="w-full h-full object-cover transition-opacity duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4"
            style={{ background: 'linear-gradient(to bottom, #1B6B4A, #0891B2)' }}>
            <p className="text-white font-bold text-sm text-center">{displayTitle}</p>
            {ad.body && <p className="text-white/80 text-xs mt-1 text-center line-clamp-2">{ad.body}</p>}
          </div>
        )}

        {/* SESI 5E Phase 3c: Kumparan-style conditional disclosure */}
        {(() => {
          // SESI 5H Phase 5B: Coerce 'animated' → 'image' untuk getAdLabel compat
          const formatForLabel = ad.ad_format === 'animated' ? 'image' : ad.ad_format;
          const label = getAdLabel({
            advertiser_type: ad.advertiser_type,
            ad_format: formatForLabel,
          });
          if (!label) return null;
          const isMandatory = isLabelMandatory({
            advertiser_type: ad.advertiser_type,
          });
          return (
            <span
              className={`absolute top-2 right-2 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded uppercase tracking-wider z-10 ${
                isMandatory ? 'bk-sb-label-pulse' : ''
              }`}
            >
              {label}
            </span>
          );
        })()}

        {/* SESI 5E Phase 3c: DCA dots indicator REMOVED dari banner public
            (natural feel — sesuai pattern Kumparan). Rotation tetap aktif
            via useAdRotation hook, visual indicator dihide. */}

        {ad.disclaimer_text && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/85 to-transparent p-2 pt-6 z-[5]">
            <p className="text-[9px] text-white/95 italic leading-tight line-clamp-2">
              {ad.disclaimer_text}
            </p>
          </div>
        )}
      </a>
    </>
  );
}

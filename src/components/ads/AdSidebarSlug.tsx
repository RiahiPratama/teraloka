'use client';

/**
 * TeraLoka — AdSidebarSlug (v3)
 * Mission 8 Sub-Phase 8-D Batch C2 refactor
 * ------------------------------------------------------------
 * Sidebar ad component untuk slug page BAKABAR.
 * Container-agnostic: parent decides desktop sidebar vs mobile section.
 *
 * v3 Changes (16 Mei 2026):
 *   - Refactor pakai shared useAdRotation hook (Batch C2)
 *   - Remove inline useFrameRotation (extracted to @/hooks/useAdRotation)
 *   - ZERO regression dari v2: same compliance + DCA + advertorial branching
 *
 * Endpoint: GET /public/ads?position=sidebar
 *
 * History:
 *   - v1 (15 Mei 2026): basic image banner + click track
 *   - v2 (16 Mei 2026 Batch C1): compliance + DCA inline hook + advertorial
 *   - v3 (16 Mei 2026 Batch C2): refactor pakai shared hook
 */

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { useAdRotation, type AdFrame } from '@/hooks/useAdRotation';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

interface Ad {
  id: string;
  title: string;
  body?: string;
  image_url?: string | null;
  link_url: string;
  ad_format?: 'image' | 'text';
  // Advertorial fields (Mission 5+)
  slug?: string;
  advertiser_name?: string;
  advertiser_logo_url?: string | null;
  advertiser_type?: 'umum' | 'politisi' | 'pemerintah' | 'komersial';
  disclaimer_text?: string | null;
  // DCA fields (Mission 7)
  creative_frames?: AdFrame[] | null;
}

async function fetchActiveAd(position: string): Promise<Ad | null> {
  try {
    const res = await fetch(`${API}/public/ads?position=${position}`);
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

export default function AdSidebarSlug() {
  const [ad,      setAd]      = useState<Ad | null>(null);
  const [loaded,  setLoaded]  = useState(false);
  const [visible, setVisible] = useState(false);
  const [refEl,   setRefEl]   = useState<HTMLElement | null>(null);

  useEffect(() => {
    fetchActiveAd('sidebar').then(a => { setAd(a); setLoaded(true); });
  }, []);

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

  // DCA frame rotation via shared hook (Batch C2 refactor)
  const { active: activeFrame, index: activeIdx, total, isDCA } =
    useAdRotation(ad?.creative_frames);

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
        <div className="text-center px-4">
          <p className="text-xs text-gray-400 font-bold uppercase">IKLAN MITRA</p>
          <p className="text-xs text-gray-300 mt-1">300 × 200</p>
          <a href="mailto:ads@teraloka.com"
            className="inline-block mt-2 text-[10px] text-gray-400 hover:text-gray-600 underline">
            Pasang iklan di sini
          </a>
        </div>
      </div>
    );
  }

  // ═══ TEXT ADVERTORIAL — link ke /sponsored/[slug] ═══
  // Sidebar dukung advertorial untuk politisi/pemerintah/komersial
  if (ad.ad_format === 'text' && ad.slug) {
    const typeLabel = ADVERTISER_TYPE_LABEL[ad.advertiser_type || 'umum'] || 'Konten Mitra';
    const preview = truncate(ad.body || '', 90);

    return (
      <>
        <style>{`
          @keyframes bk-sb-pulse-amber {
            0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.55); }
            50%      { box-shadow: 0 0 0 4px rgba(251, 191, 36, 0); }
          }
          .bk-sb-advertorial-badge {
            animation: bk-sb-pulse-amber 2.2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
          }
        `}</style>
        <Link
          ref={setRef as any}
          href={`/sponsored/${ad.slug}`}
          onClick={() => trackAdClick(ad.id)}
          className="block rounded-xl overflow-hidden border hover:shadow-md transition-all"
          style={{
            ...animStyle,
            background: 'linear-gradient(to bottom right, #FFFBEB, #FEF3C7)',
            borderColor: '#FDE68A',
          }}>
          <div className="p-4">
            {/* Header — badge + advertiser */}
            <div className="flex items-center gap-1.5 mb-2 flex-wrap">
              <span className="bk-sb-advertorial-badge text-[9px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-300">
                {typeLabel}
              </span>
            </div>

            {/* Advertiser name */}
            <div className="flex items-center gap-1.5 mb-2">
              {ad.advertiser_logo_url && (
                <img src={ad.advertiser_logo_url} alt={ad.advertiser_name}
                  className="w-4 h-4 rounded-full object-cover shrink-0" />
              )}
              <span className="text-[10px] font-semibold text-amber-900 truncate">
                {ad.advertiser_name}
              </span>
            </div>

            {/* Title */}
            <h3 className="text-sm font-bold text-gray-900 leading-snug mb-2 line-clamp-3">
              {ad.title}
            </h3>

            {/* Preview body */}
            <p className="text-[11px] text-gray-700 leading-relaxed line-clamp-3 mb-2">
              {preview}
            </p>

            {/* CTA */}
            <p className="text-[10px] font-bold text-amber-900">
              Baca selengkapnya →
            </p>

            {/* Disclaimer politisi (KPU compliance) */}
            {ad.disclaimer_text && (
              <p className="mt-2 pt-2 border-t border-amber-200 text-[9px] text-amber-800 italic leading-tight">
                {ad.disclaimer_text}
              </p>
            )}
          </div>
        </Link>
      </>
    );
  }

  // ═══ IMAGE BANNER (with optional DCA rotation) ═══
  const displayImage    = activeFrame?.image_url || ad.image_url;
  const displayHeadline = activeFrame?.headline  || ad.title;

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
        className="block rounded-xl overflow-hidden relative h-52 hover:opacity-95 transition-all"
        style={animStyle}>
        {displayImage ? (
          <img
            key={displayImage} /* force re-mount on frame change for smooth crossfade */
            src={displayImage}
            alt={displayHeadline}
            className="w-full h-full object-cover transition-opacity duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4"
            style={{ background: 'linear-gradient(to bottom, #1B6B4A, #0891B2)' }}>
            <p className="text-white font-bold text-sm text-center line-clamp-3">{displayHeadline}</p>
            {ad.body && !activeFrame && (
              <p className="text-white/80 text-xs mt-1 text-center line-clamp-2">{ad.body}</p>
            )}
          </div>
        )}

        {/* IKLAN badge (top right, pulsing) */}
        <span className="bk-sb-label-pulse absolute top-2 right-2 text-[9px] font-bold text-white bg-black/50 px-1.5 py-0.5 rounded uppercase tracking-wider z-10">
          Iklan
        </span>

        {/* DCA frame indicator (bottom-right, dots small) */}
        {isDCA && total > 0 && (
          <div className="absolute bottom-2 right-2 flex gap-1 z-10">
            {Array.from({ length: total }).map((_, i) => (
              <span
                key={i}
                className={`block w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIdx ? 'bg-white' : 'bg-white/40'
                }`}
              />
            ))}
          </div>
        )}

        {/* Disclaimer politisi overlay (KPU compliance untuk image banner) */}
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

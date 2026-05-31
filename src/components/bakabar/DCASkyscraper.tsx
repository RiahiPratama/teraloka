'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — DCA Skyscraper v1.0 (Mission 7 Sub-Phase 7-B-1)
// PATH: src/components/bakabar/DCASkyscraper.tsx
// ────────────────────────────────────────────────────────────────
// Vertical sidebar ad 160×600 (Skyscraper format), sticky top:228.
// Fetch dari public.ads via /by-position/skyscraper_left atau
// /by-position/skyscraper_right. Auto DCA mode kalau ad punya
// creative_frames 2+, else static.
//
// Pattern reuse: rotation logic dari DCABanner + visual layout dari
// inline SkyscraperAd existing di page.tsx (yang di-migrate).
//
// Empty state: gak ada ad → return null (LEAN — slot hilang, layout
// gak break karena sticky aside).
//
// PRD: 02-PRD-DCA-v1.1
// Date: 15 Mei 2026
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
// SESI 5E Phase 3c: Kumparan-style disclosure label
import { getAdLabel } from '@/lib/ads/getAdLabel';
// SESI 11 Batch 8 (31 Mei 2026): Banner Motion (webM fill)
import { type AdVideoSource } from '@/components/public/ads/AdVideoBanner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

export interface SkyscraperFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

interface SkyscraperAd {
  id:                  string;
  title:               string | null;
  body:                string | null;
  link_url:            string | null;
  image_url:           string | null;
  advertiser_name:     string;
  advertiser_logo_url: string | null;
  disclaimer_text:     string | null;
  advertiser_type:     'umum' | 'politisi' | 'pemerintah' | 'komersial';
  creative_frames:     SkyscraperFrame[] | null;
  // SESI 11 Batch 8: Banner Motion (webM/mp4 fill)
  ad_format?:          'image' | 'text' | 'animated' | 'video';
  video_sources?:      Record<string, AdVideoSource> | null;
}

type Props = {
  side: 'left' | 'right';
};

const HOVER_GRACE_MS = 1500;

// Per-side default gradient (matches Mission 6 SkyscraperAd hardcoded)
const SIDE_GRADIENT: Record<'left' | 'right', string> = {
  left:  'linear-gradient(180deg, #003526 0%, #001a13 100%)',
  right: 'linear-gradient(180deg, #DC2626 0%, #7F1D1D 100%)',
};

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export default function DCASkyscraper({ side }: Props) {
  const [ad, setAd] = useState<SkyscraperAd | null>(null);
  const [loading, setLoading] = useState(true);
  const [hideNearFooter, setHideNearFooter] = useState(false);

  // Fetch ad on mount
  useEffect(() => {
    let cancelled = false;
    const position = side === 'left' ? 'skyscraper_left' : 'skyscraper_right';

    (async () => {
      try {
        const res = await fetch(`${API}/public/ads/by-position/${position}?limit=1`);
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data) && json.data[0]) {
          setAd(json.data[0] as SkyscraperAd);
        }
      } catch {
        // Empty state — gak ada ad nongol (fixed aside hides cleanly)
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [side]);

  // Footer-hide: pantau elemen footer, hide skyscraper saat footer in-viewport
  useEffect(() => {
    const footer = document.querySelector('footer');
    if (!footer) return;
    const io = new IntersectionObserver(
      ([entry]) => setHideNearFooter(entry.isIntersecting),
      { rootMargin: '0px 0px 100px 0px' } // trigger 100px before footer enters
    );
    io.observe(footer);
    return () => io.disconnect();
  }, []);

  // Hide section if loading or empty
  if (loading || !ad) return null;

  const isDCA = Array.isArray(ad.creative_frames) && ad.creative_frames.length >= 2;

  // Posisi horizontal: fixed di dalam container 1400px centered
  // Container: max-w-[1400px] mx-auto px-4 → real content 1400-32=1368
  // Skyscraper 160px lebar, gap 20px ke main → ada di edge container
  const horizontalStyle = side === 'left'
    ? { left: 'max(16px, calc((100vw - 1400px) / 2 + 16px))' }
    : { right: 'max(16px, calc((100vw - 1400px) / 2 + 16px))' };

  return (
    <aside
      className="hidden min-[1400px]:block"
      style={{
        position: 'fixed',
        top: 180,
        width: 160,
        height: 600,
        zIndex: 40,
        opacity: hideNearFooter ? 0 : 1,
        pointerEvents: hideNearFooter ? 'none' : 'auto',
        transition: 'opacity 0.25s ease',
        ...horizontalStyle,
      }}
    >
      <a
        href={ad.link_url ?? '#'}
        target="_blank"
        rel="sponsored noopener noreferrer"
        aria-label={`Iklan dari ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`}
        data-ad-id={ad.id}
        data-ad-position={side === 'left' ? 'skyscraper_left' : 'skyscraper_right'}
        data-ad-mode={isDCA ? 'dca' : 'static'}
        style={{ display: 'block', height: '100%' }}
      >
        <SkyscraperInner ad={ad} side={side} isDCA={isDCA} />
      </a>
    </aside>
  );
}

// ────────────────────────────────────────────────────────────────

function SkyscraperInner({
  ad,
  side,
  isDCA,
}: {
  ad: SkyscraperAd;
  side: 'left' | 'right';
  isDCA: boolean;
}) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const rotationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const frames = ad.creative_frames ?? [];
  const currentFrame = isDCA ? frames[currentIdx] : null;
  const currentDuration = currentFrame?.duration_ms || 5000;

  // Auto-rotate (only when DCA mode + not paused + motion allowed)
  useEffect(() => {
    if (!isDCA || reducedMotion || isPaused || frames.length < 2) return;
    rotationRef.current = setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % frames.length);
    }, currentDuration);
    return () => {
      if (rotationRef.current) clearTimeout(rotationRef.current);
    };
  }, [currentIdx, currentDuration, isPaused, reducedMotion, isDCA, frames.length]);

  useEffect(() => {
    return () => {
      if (graceRef.current) clearTimeout(graceRef.current);
    };
  }, []);

  const handleMouseEnter = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    setIsPaused(true);
  };

  const handleMouseLeave = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = setTimeout(() => setIsPaused(false), HOVER_GRACE_MS);
  };

  // Display values — switch based on DCA mode
  const displayTitle = isDCA && currentFrame ? currentFrame.headline : (ad.title ?? '');
  const displayImage = isDCA && currentFrame ? currentFrame.image_url : ad.image_url;
  const overline = ad.advertiser_name.toUpperCase();
  const ctaLabel = 'Lihat Detail';

  // SESI 11 Batch 8: Banner Motion — video fill (ganti gradient card)
  // SESI 11 (31 Mei 2026): ad_format = HINT, BUKAN gerbang render. Tampilin video
  // kalau posisi ini PUNYA video_sources, apa pun global ad_format-nya — bikin
  // iklan mixed (kiri statis + kanan video) render video di posisi yg tepat.
  const posKey = side === 'left' ? 'skyscraper_left' : 'skyscraper_right';
  const video = ad.video_sources?.[posKey] ?? null;
  const hasVideo = !!(video && (video.webm || video.mp4));
  if (hasVideo) {
    const vLabel = getAdLabel({ advertiser_type: ad.advertiser_type, ad_format: 'image' });
    return (
      <div className="relative rounded-lg overflow-hidden bg-black" style={{ height: 600 }}>
        {!reducedMotion ? (
          <video className="w-full h-full object-cover" autoPlay loop muted playsInline poster={video!.poster || undefined}>
            {video!.webm && <source src={video!.webm} type="video/webm" />}
            {video!.mp4  && <source src={video!.mp4}  type="video/mp4" />}
          </video>
        ) : video!.poster ? (
          <img src={video!.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
        {vLabel && (
          <span className="absolute z-10 px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-[0.6px] uppercase"
            style={{ top: 8, right: 8, background: '#F59E0B', color: '#fff' }}>
            {vLabel}
          </span>
        )}
        {ad.disclaimer_text && (
          <div className="absolute bottom-0 left-0 right-0 bg-amber-100/95 px-2 py-1 text-[8px] leading-tight text-amber-900 z-10">
            {ad.disclaimer_text}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="rounded-lg overflow-hidden text-white relative cursor-pointer"
      style={{
        // 29 Mei sore rev 5: sticky pindah ke OUTER aside (cleaner pattern).
        // Inner div = plain block, height 600.
        height: 600,
        background: SIDE_GRADIENT[side]
      }}
    >
      {/* Background image (if exists, overlay gradient via radial below) */}
      {displayImage && (
        <img
          key={`sky-img-${currentIdx}`}
          src={displayImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-40 animate-sky-fade"
          loading="lazy"
        />
      )}

      {/* Radial overlay decoration */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 50% 100%, rgba(255,255,255,0.12) 0%, transparent 60%)',
      }} />

      {/* SESI 5E Phase 3c: Kumparan-style conditional disclosure */}
      {(() => {
        const label = getAdLabel({
          advertiser_type: ad.advertiser_type,
          ad_format: 'image',
        });
        if (!label) return null;
        return (
          <span
            className="absolute z-10 px-1.5 py-0.5 rounded text-[8px] font-extrabold tracking-[0.6px] uppercase"
            style={{ top: 8, right: 8, background: '#F59E0B', color: '#fff' }}
          >
            {label}
          </span>
        );
      })()}

      {/* Content */}
      <div className="relative z-[2] p-5 flex flex-col h-full justify-between">
        <div>
          <p className="text-[9px] font-extrabold uppercase tracking-[1.2px] opacity-85 mb-2 truncate">
            {overline}
          </p>
          <h3
            key={`sky-title-${currentIdx}`}
            className="text-[17px] font-bold leading-[1.2] mb-2.5 animate-sky-fade"
            style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
          >
            {displayTitle}
          </h3>
          {!isDCA && ad.body && (
            <p className="text-[11px] leading-[1.45] opacity-85 line-clamp-4">
              {ad.body}
            </p>
          )}
        </div>

        <button
          type="button"
          className="self-start px-3 py-1.5 rounded-md text-[10px] font-extrabold flex items-center gap-1"
          style={{ background: '#F59E0B', color: '#fff' }}
        >
          {ctaLabel} →
        </button>

        {/* SESI 5E Phase 3c: DCA pagination dots REMOVED — natural feel.
            Rotation tetap aktif. */}
      </div>

      <style jsx>{`
        @keyframes sky-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-sky-fade {
          animation: sky-fade 0.6s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-sky-fade {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

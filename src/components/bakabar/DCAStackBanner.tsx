'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — DCA Stack Banner v1.0 (Mission 7 Sub-Phase 7-B-3)
// PATH: src/components/bakabar/DCAStackBanner.tsx
// ────────────────────────────────────────────────────────────────
// Block banner di Col 3 RegionSection (bawah Layanan TeraLoka card).
// Replace hardcoded stack_banner inline → fetch public.ads
// /by-position/region_stack?region=<slug>. DCA-ready.
//
// Target_regions logic (carry-over Mission 6 Phase 6 hotfix):
//   - target_regions specific match (e.g., ['ternate']) → prioritas
//   - target_regions NULL → fallback all-region
//
// PRD: 02-PRD-DCA-v1.1
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

export interface StackFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

export interface StackBannerAd {
  id:                  string;
  title:               string | null;
  body:                string | null;
  link_url:            string | null;
  image_url:           string | null;
  advertiser_name:     string;
  advertiser_type:     'umum' | 'politisi' | 'pemerintah' | 'komersial';
  creative_frames:     StackFrame[] | null;
}

type Props = {
  regionSlug: string;
  ad?:        StackBannerAd | null;  // optional pre-fetched (parent fetcher pattern)
};

const HOVER_GRACE_MS = 1500;

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

export default function DCAStackBanner({ regionSlug, ad: preFetchedAd }: Props) {
  const [ad, setAd] = useState<StackBannerAd | null>(preFetchedAd ?? null);
  const [loading, setLoading] = useState(!preFetchedAd);

  // Self-fetch only if no pre-fetched ad provided (defensive)
  useEffect(() => {
    if (preFetchedAd !== undefined) {
      setAd(preFetchedAd);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/public/ads/by-position/region_stack?region=${encodeURIComponent(regionSlug)}&limit=1`
        );
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data) && json.data[0]) {
          setAd(json.data[0] as StackBannerAd);
        }
      } catch {
        // Empty state — gracefully hide
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [regionSlug, preFetchedAd]);

  if (loading || !ad) return null;

  const isDCA = Array.isArray(ad.creative_frames) && ad.creative_frames.length >= 2;

  return (
    <a
      href={ad.link_url ?? '#'}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={`Iklan dari ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`}
      data-ad-id={ad.id}
      data-ad-position="region_stack"
      data-region={regionSlug}
      data-ad-mode={isDCA ? 'dca' : 'static'}
      className="flex-1 rounded-lg p-3.5 text-white relative overflow-hidden flex flex-col cursor-pointer"
      style={{ minHeight: 0 }}
    >
      <StackInner ad={ad} isDCA={isDCA} />
    </a>
  );
}

function StackInner({ ad, isDCA }: { ad: StackBannerAd; isDCA: boolean }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const rotationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();

  const frames = ad.creative_frames ?? [];
  const currentFrame = isDCA ? frames[currentIdx] : null;
  const currentDuration = currentFrame?.duration_ms || 5000;

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

  const displayTitle = isDCA && currentFrame ? currentFrame.headline : (ad.title ?? '');
  const displayImage = isDCA && currentFrame ? currentFrame.image_url : ad.image_url;
  const overline = ad.advertiser_name.toUpperCase();

  // Solid neutral background fallback — image overlay on top
  const fallbackBg = 'linear-gradient(135deg, #1F2937 0%, #111827 100%)';

  return (
    <div
      onMouseEnter={() => {
        if (graceRef.current) clearTimeout(graceRef.current);
        setIsPaused(true);
      }}
      onMouseLeave={() => {
        if (graceRef.current) clearTimeout(graceRef.current);
        graceRef.current = setTimeout(() => setIsPaused(false), HOVER_GRACE_MS);
      }}
      className="w-full h-full relative flex flex-col"
      style={{ background: fallbackBg }}
    >
      {/* Background image with fade */}
      {displayImage && (
        <img
          key={`stack-img-${currentIdx}`}
          src={displayImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-50 animate-stack-fade"
          loading="lazy"
        />
      )}

      {/* Radial overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 15% 100%, rgba(0,0,0,0.4) 0%, transparent 60%)',
      }} />

      {/* IKLAN badge top-right */}
      <span className="absolute z-10 px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-[0.8px] uppercase"
        style={{ top: 6, right: 6, background: '#F59E0B', color: '#fff' }}>
        Iklan
      </span>

      {/* Content */}
      <div className="relative z-[2] flex-1 flex flex-col min-h-0 p-1">
        <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1 opacity-85 truncate">
          {overline}
        </p>
        <h4
          key={`stack-h-${currentIdx}`}
          className="text-[13px] font-bold leading-[1.15] mb-1 line-clamp-2 animate-stack-fade"
          style={{ fontFamily: "'Lora', Georgia, serif" }}
        >
          {displayTitle}
        </h4>
        {!isDCA && ad.body && (
          <p className="text-[9px] leading-[1.35] opacity-85 line-clamp-2 mb-auto">
            {ad.body}
          </p>
        )}
        <span className="self-start mt-auto px-2.5 py-1 rounded text-[9px] font-extrabold flex items-center gap-1"
          style={{ background: '#fff', color: '#1F2937' }}>
          Lihat Detail
          <ArrowRight size={9} strokeWidth={2.8} />
        </span>
      </div>

      {/* DCA pagination dots */}
      {isDCA && frames.length > 1 && (
        <div className="absolute bottom-1.5 left-0 right-0 flex justify-center gap-1 z-[2]">
          {frames.map((_, idx) => (
            <span
              key={idx}
              className="transition-all duration-300"
              style={{
                width: idx === currentIdx ? 12 : 3,
                height: 3,
                borderRadius: 2,
                background: idx === currentIdx ? '#F59E0B' : 'rgba(255,255,255,0.5)',
              }}
            />
          ))}
        </div>
      )}

      <style jsx>{`
        @keyframes stack-fade {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-stack-fade { animation: stack-fade 0.6s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .animate-stack-fade { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

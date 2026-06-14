'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — DCA Inline Banner v1.0 (Mission 7 Sub-Phase 7-B-4)
// PATH: src/components/bakabar/DCAInlineBanner.tsx
// ────────────────────────────────────────────────────────────────
// 8:1 aspect ratio inline banner, antar region atau di mana saja.
// Fetch dari public.ads /by-position/inline_banner. DCA-ready.
//
// ✅ ACTIVE — sudah di-mount: BelowFold.tsx (homepage) + BakabarArchive.tsx
//   (kanal/kategori). Empty state graceful (return null kalau gak ada ad).
//   Phase 2a V3: mobile creative terpisah (statis <picture> + video viewport-switch),
//   container aspect 8:1 desktop → 3:1 mobile.
//
// PRD: 02-PRD-DCA-v1.1
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
// SESI 5E Phase 3c: Kumparan-style disclosure label
import { getAdLabel } from '@/lib/ads/getAdLabel';
// SESI 11 Batch 8 (31 Mei 2026): Banner Motion (webM fill)
import { type AdVideoSource } from '@/components/public/ads/AdVideoBanner';
// SESI 11 (31 Mei 2026): viewability impression + click beacon
import { useAdView } from '@/hooks/useAdView';
import { queueClick } from '@/lib/adTracking';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

export interface InlineBannerFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

interface InlineBannerAd {
  id:                  string;
  title:               string | null;
  body:                string | null;
  link_url:            string | null;
  image_url:           string | null;
  image_url_mobile?:   string | null;  // Phase 2a V3: creative mobile terpisah (statis)
  advertiser_name:     string;
  advertiser_type:     'umum' | 'politisi' | 'pemerintah' | 'komersial';
  disclaimer_text?:    string | null;
  creative_frames:     InlineBannerFrame[] | null;
  // SESI 11 Batch 8: Banner Motion (webM/mp4 fill)
  ad_format?:          'image' | 'text' | 'animated' | 'video';
  video_sources?:      Record<string, AdVideoSource> | null;
  // Phase 2a V3: video mobile terpisah (viewport-switch, fallback desktop kalau null)
  video_sources_mobile?: Record<string, AdVideoSource> | null;
}

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

// Phase 2a V3: viewport detection client-side (SSR-safe — default false = desktop).
// Mirror DCATopLeaderboard: server & initial-client render desktop → no hydration mismatch.
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width:767px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isMobile;
}

export default function DCAInlineBanner() {
  const [ad, setAd] = useState<InlineBannerAd | null>(null);
  // SESI 11: sensor impresi viewability (IAB 50%/1s, fire 1x)
  const viewRef = useAdView<HTMLElement>(ad?.id ?? null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/public/ads/by-position/inline_banner?limit=1`);
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data) && json.data[0]) {
          setAd(json.data[0] as InlineBannerAd);
        }
      } catch {
        // Empty state — gracefully hide
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading || !ad) return null;

  const isDCA = Array.isArray(ad.creative_frames) && ad.creative_frames.length >= 2;

  return (
    <a
      ref={viewRef as any}
      onClick={() => queueClick(ad.id)}
      href={ad.link_url ?? '#'}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={`Iklan dari ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`}
      data-ad-id={ad.id}
      data-ad-position="inline_banner"
      data-ad-mode={isDCA ? 'dca' : 'static'}
      className="block my-10"
    >
      <InlineInner ad={ad} isDCA={isDCA} />
    </a>
  );
}

function InlineInner({ ad, isDCA }: { ad: InlineBannerAd; isDCA: boolean }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const rotationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reducedMotion = useReducedMotion();
  const isMobile = useIsMobile();  // Phase 2a V3: viewport-switch
  // 🔑 Container aspect switch — 8:1 di HP terlalu tipis → 3:1 di mobile.
  const containerAspect = isMobile ? '3 / 1' : '8 / 1';

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
  const overline = ad.advertiser_name.toUpperCase();

  // SESI 11 Batch 8: Banner Motion — video fill (ganti gradient card)
  // SESI 11 (31 Mei): ad_format = HINT. Render video kalau posisi punya source, apa pun global format.
  // Phase 2a V3: viewport-switch — HP nampilin video mobile, desktop nampilin desktop.
  const videoDesktop = ad.video_sources?.['inline_banner'] ?? null;
  const videoMobile  = ad.video_sources_mobile?.['inline_banner'] ?? null;
  const video = (isMobile && videoMobile) ? videoMobile : videoDesktop;  // 🛡️ fallback desktop (mobile opsional)
  const hasVideo = !!(video && (video.webm || video.mp4));
  if (hasVideo) {
    const vLabel = getAdLabel({ advertiser_type: ad.advertiser_type, ad_format: 'image' });
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: containerAspect }}>
        {!reducedMotion ? (
          <video key={video!.webm || video!.mp4} className="w-full h-full object-cover" autoPlay loop muted playsInline poster={video!.poster || undefined}>
            {video!.webm && <source src={video!.webm} type="video/webm" />}
            {video!.mp4  && <source src={video!.mp4}  type="video/mp4" />}
          </video>
        ) : video!.poster ? (
          <img src={video!.poster} alt="" className="w-full h-full object-cover" loading="lazy" />
        ) : null}
        {vLabel && (
          <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-sm text-[10px] font-extrabold tracking-widest uppercase"
            style={{ background: '#F59E0B', color: '#fff' }}>
            {vLabel}
          </span>
        )}
      </div>
    );
  }

  // SESI 11 (31 Mei 2026): Banner statis/DCA = creative penuh, tampil FULL tanpa overlay.
  const displayImage = isDCA && currentFrame ? currentFrame.image_url : ad.image_url;
  const hasImage = !!displayImage;
  if (hasImage) {
    const iLabel = getAdLabel({ advertiser_type: ad.advertiser_type, ad_format: 'image' });
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: containerAspect }}>
        {/* Phase 2a V3: mobile creative via <picture>; fallback ke displayImage kalau null */}
        <picture key={`inline-full-${currentIdx}`}>
          <source media="(max-width:767px)" srcSet={ad.image_url_mobile || displayImage!} />
          <img
            src={displayImage!}
            alt={ad.title ?? ''}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        </picture>
        {iLabel && (
          <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-sm text-[10px] font-extrabold tracking-widest uppercase"
            style={{ background: '#F59E0B', color: '#fff' }}>
            {iLabel}
          </span>
        )}
        {ad.disclaimer_text && (
          <div className="absolute bottom-0 left-0 right-0 bg-amber-100/95 px-3 py-1 text-[9px] leading-tight text-amber-900 z-10">
            {ad.disclaimer_text}
          </div>
        )}
      </div>
    );
  }

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
      className="relative w-full rounded-xl overflow-hidden flex items-center justify-between px-12 text-white cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4c1d95 100%)',
        aspectRatio: containerAspect,
      }}
    >
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%)',
      }} />

      {/* SESI 5E Phase 3c: Kumparan-style conditional disclosure */}
      {(() => {
        const label = getAdLabel({
          advertiser_type: ad.advertiser_type,
          ad_format: 'image',
        });
        if (!label) return null;
        return (
          <span className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-sm text-[10px] font-extrabold tracking-widest uppercase"
            style={{ background: '#F59E0B', color: '#fff' }}>
            {label}
          </span>
        );
      })()}

      <div className="relative z-[2] flex-1 max-w-[60%]">
        <p className="text-[10px] font-extrabold tracking-[1.5px] uppercase opacity-75 mb-2 truncate">
          {overline}
        </p>
        <h3
          key={`inline-${currentIdx}`}
          className="text-[24px] font-bold leading-[1.15] tracking-[-0.4px] mb-1.5 animate-inline-fade"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          {displayTitle}
        </h3>
        {!isDCA && ad.body && (
          <p className="text-[12px] leading-[1.4] opacity-85 line-clamp-1">{ad.body}</p>
        )}
      </div>

      <span className="relative z-[2] inline-flex items-center gap-2 px-5 py-2 rounded-md bg-white text-[#1e3a8a] text-[12px] font-extrabold uppercase tracking-[0.6px]">
        Lihat
        <ArrowRight size={12} strokeWidth={2.8} />
      </span>

      {/* SESI 5E Phase 3c: DCA pagination dots REMOVED — natural feel. */}

      <style jsx>{`
        @keyframes inline-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-inline-fade { animation: inline-fade 0.6s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .animate-inline-fade { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

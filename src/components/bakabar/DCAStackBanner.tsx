'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — DCA Stack Banner v2.0 (Phase 4 — Multi-Ad region_stack)
// PATH: src/components/bakabar/DCAStackBanner.tsx
// ────────────────────────────────────────────────────────────────
// v2.0 (31 Mei 2026): support 1–2 banner ADS per slot (revenue inventory).
//   - prop `maxAds` (default 1) → fetch limit=maxAds, render up to N banner.
//   - Tiap banner = rasio PATEN 8:5 (aspect-[8/5]) biar foto Canva tampil
//     sesuai desain (gak ke-crop). Canva size rekomendasi: 1080×675.
//   - Backward compat: tanpa maxAds = 1 banner (perilaku lama).
//   - Logic DCA / video (Banner Motion) / Editorial-ADS Firewall:
//     StackInner UNCHANGED (di-reuse per banner).
//
// v1.0 PRIOR (Mission 7-B-3): single banner region_stack, flex-1.
//
// Slot zona-bawah Col 3 RegionSection. Fetch public.ads
// /by-position/region_stack?region=<slug>. DCA + video ready.
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
// SESI 5E Phase 3c: Kumparan-style disclosure label
import { getAdLabel } from '@/lib/ads/getAdLabel';
// SESI 11 Batch 8 (31 Mei 2026): Banner Motion (webM/mp4) sebagai bg kartu region
import { type AdVideoSource } from '@/components/public/ads/AdVideoBanner';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

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
  // SESI 11 Batch 8: Banner Motion (webM/mp4 loop sebagai bg kartu)
  ad_format?:          'image' | 'text' | 'animated' | 'video';
  video_sources?:      Record<string, AdVideoSource> | null;
}

type Props = {
  regionSlug: string;
  maxAds?:    number;   // v2.0: 1 (default) atau 2 (ADS-murni stack)
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

export default function DCAStackBanner({ regionSlug, maxAds = 1 }: Props) {
  const [ads, setAds] = useState<StackBannerAd[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API}/public/ads/by-position/region_stack?region=${encodeURIComponent(regionSlug)}&limit=${maxAds}`
        );
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          setAds((json.data as StackBannerAd[]).slice(0, maxAds));
        }
      } catch {
        // Empty state — gracefully hide
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [regionSlug, maxAds]);

  if (loading || ads.length === 0) return null;

  return (
    <>
      {ads.map((ad) => (
        <StackAdCard key={ad.id} ad={ad} regionSlug={regionSlug} />
      ))}
    </>
  );
}

// ─── Single banner card (rasio paten 8:5) ───────────────────────
function StackAdCard({ ad, regionSlug }: { ad: StackBannerAd; regionSlug: string }) {
  const isDCA = Array.isArray(ad.creative_frames) && ad.creative_frames.length >= 2;
  const regionVideo = ad.ad_format === 'video' ? (ad.video_sources?.['region_stack'] ?? null) : null;
  const hasVideo = !!(regionVideo && (regionVideo.webm || regionVideo.mp4));

  return (
    <a
      href={ad.link_url ?? '#'}
      target="_blank"
      rel="sponsored noopener noreferrer"
      aria-label={`Iklan dari ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`}
      data-ad-id={ad.id}
      data-ad-position="region_stack"
      data-region={regionSlug}
      data-ad-mode={hasVideo ? 'video' : isDCA ? 'dca' : 'static'}
      className="w-full shrink-0 aspect-[8/5] rounded-lg p-3.5 text-white relative overflow-hidden flex flex-col cursor-pointer"
    >
      <StackInner ad={ad} isDCA={isDCA} videoSource={hasVideo ? regionVideo : null} />
    </a>
  );
}

function StackInner({ ad, isDCA, videoSource }: { ad: StackBannerAd; isDCA: boolean; videoSource: AdVideoSource | null }) {
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
      {/* Background layer: Banner Motion (webM/mp4 loop) > image DCA */}
      {videoSource && !reducedMotion ? (
        <video
          key="stack-video"
          className="absolute inset-0 w-full h-full object-cover opacity-50"
          autoPlay
          loop
          muted
          playsInline
          poster={videoSource.poster || undefined}
        >
          {/* webM-first (lebih ringan), mp4 fallback universal */}
          {videoSource.webm && <source src={videoSource.webm} type="video/webm" />}
          {videoSource.mp4  && <source src={videoSource.mp4}  type="video/mp4" />}
        </video>
      ) : videoSource && reducedMotion ? (
        // Hormati prefers-reduced-motion → poster statis (gak autoplay)
        videoSource.poster ? (
          <img
            src={videoSource.poster}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-50"
            loading="lazy"
          />
        ) : null
      ) : displayImage ? (
        <img
          key={`stack-img-${currentIdx}`}
          src={displayImage}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-50 animate-stack-fade"
          loading="lazy"
        />
      ) : null}

      {/* Radial overlay */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse at 15% 100%, rgba(0,0,0,0.4) 0%, transparent 60%)',
      }} />

      {/* SESI 5E Phase 3c: Kumparan-style conditional disclosure */}
      {(() => {
        const label = getAdLabel({
          advertiser_type: ad.advertiser_type,
          ad_format: 'image',
        });
        if (!label) return null;
        return (
          <span className="absolute z-10 px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-[0.8px] uppercase"
            style={{ top: 6, right: 6, background: '#F59E0B', color: '#fff' }}>
            {label}
          </span>
        );
      })()}

      {/* Content */}
      <div className="relative z-[2] flex-1 flex flex-col min-h-0 p-1">
        <p className="text-[8px] font-extrabold tracking-[1.2px] uppercase mb-1 opacity-85 truncate">
          {overline}
        </p>
        <h4
          key={`stack-h-${currentIdx}`}
          className="text-[13px] font-bold leading-[1.15] mb-1 line-clamp-2 animate-stack-fade"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
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

      {/* SESI 5E Phase 3c: DCA pagination dots REMOVED — natural feel. */}

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

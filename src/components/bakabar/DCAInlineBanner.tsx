'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — DCA Inline Banner v1.0 (Mission 7 Sub-Phase 7-B-4)
// PATH: src/components/bakabar/DCAInlineBanner.tsx
// ────────────────────────────────────────────────────────────────
// 8:1 aspect ratio inline banner, antar region atau di mana saja.
// Fetch dari public.ads /by-position/inline_banner. DCA-ready.
//
// 🛡️ DORMENT FILE — Mission 7 closeout:
//   Component INI TIDAK di-import di page.tsx atau RegionSection.
//   Ready untuk Mission 8 (Super Admin SMART) — admin bisa enable
//   placement via UI tanpa nge-touch code lagi.
//
//   Saat lo decide untuk enable di future, tinggal import + render
//   <DCAInlineBanner /> di tempat yang lo mau. Empty state graceful.
//
// PRD: 02-PRD-DCA-v1.1
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
import { ArrowRight } from 'lucide-react';
// SESI 5E Phase 3c: Kumparan-style disclosure label
import { getAdLabel } from '@/lib/ads/getAdLabel';
// SESI 11 Batch 8 (31 Mei 2026): Banner Motion (webM fill)
import { type AdVideoSource } from '@/components/public/ads/AdVideoBanner';

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
  advertiser_name:     string;
  advertiser_type:     'umum' | 'politisi' | 'pemerintah' | 'komersial';
  creative_frames:     InlineBannerFrame[] | null;
  // SESI 11 Batch 8: Banner Motion (webM/mp4 fill)
  ad_format?:          'image' | 'text' | 'animated' | 'video';
  video_sources?:      Record<string, AdVideoSource> | null;
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

export default function DCAInlineBanner() {
  const [ad, setAd] = useState<InlineBannerAd | null>(null);
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
  const video = ad.video_sources?.['inline_banner'] ?? null;
  const hasVideo = !!(video && (video.webm || video.mp4));
  if (hasVideo) {
    const vLabel = getAdLabel({ advertiser_type: ad.advertiser_type, ad_format: 'image' });
    return (
      <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '8 / 1' }}>
        {!reducedMotion ? (
          <video className="w-full h-full object-cover" autoPlay loop muted playsInline poster={video!.poster || undefined}>
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
        aspectRatio: '8 / 1',
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

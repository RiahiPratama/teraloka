'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — Service Carousel v2.0 (Phase 4 — ADS-driven service_carousel)
// PATH: src/components/bakabar/LaIndieMovieServiceCarousel.tsx
// ────────────────────────────────────────────────────────────────
// v2.0 (31 Mei 2026): SUMBER DATA dari ADS (posisi `service_carousel`),
//   bukan lagi array hardcoded.
//   - Fetch /public/ads/by-position/service_carousel?limit=6 (client).
//   - Banner portrait 3:4 (Canva 810×1080). Statis (image) ATAU motion
//     (.webM/.mp4 via video_sources['service_carousel']).
//   - Optimal 5 banner, cap 6 (constraint animasi).
//   - Fallback = HIDDEN: kalau 0 ad → return null (gak balik ke gradient).
//   - Banner = full-bleed (gak ditimpa overlay teks; banner Canva udah
//     punya teks sendiri). Disclosure "Iklan" + corner bracket dipertahanin.
//   - Animasi (rotate/hover/scale/dots/CTA) UNCHANGED dari v1.1.
//   - Link per banner = link_url dari ADS.
//
// v1.1 PRIOR (15 Mei): lean header, 5 service hardcoded gradient+emoji.
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react';
import { getAdLabel } from '@/lib/ads/getAdLabel';
import { type AdVideoSource } from '@/components/public/ads/AdVideoBanner';
// SESI 11 (31 Mei 2026): viewability impression + click beacon
import { useAdView } from '@/hooks/useAdView';
import { queueClick } from '@/lib/adTracking';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

interface CarouselAd {
  id:               string;
  title:            string | null;
  body:             string | null;
  link_url:         string | null;
  image_url:        string | null;
  advertiser_name:  string;
  advertiser_type:  'umum' | 'politisi' | 'pemerintah' | 'komersial';
  ad_format?:       'image' | 'text' | 'animated' | 'video';
  video_sources?:   Record<string, AdVideoSource> | null;
}

const MAX_CARDS       = 6;     // hard cap (constraint animasi); optimal 5
const AUTO_ROTATE_MS  = 5000;
const HOVER_GRACE_MS  = 1500;
const POSTER_W        = 165;
const POSTER_H        = 220;   // 3:4 match banner Canva 810×1080
const FOCUSED_SCALE   = 1.28;

export default function LaIndieMovieServiceCarousel() {
  const [ads, setAds] = useState<CarouselAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch ADS service_carousel (client, non-blocking). Fallback = hidden.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/public/ads/by-position/service_carousel?limit=${MAX_CARDS}`);
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data)) {
          const list = (json.data as CarouselAd[]).slice(0, MAX_CARDS);
          setAds(list);
          setFocusedIdx(list.length > 0 ? Math.floor((list.length - 1) / 2) : 0);
        }
      } catch {
        // empty → hidden
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Auto-rotate (skip kalau <2 ad atau paused)
  useEffect(() => {
    if (isPaused || ads.length < 2) return;
    rotationRef.current = setInterval(() => {
      setFocusedIdx(prev => (prev + 1) % ads.length);
    }, AUTO_ROTATE_MS);
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [isPaused, ads.length]);

  useEffect(() => {
    return () => {
      if (graceRef.current) clearTimeout(graceRef.current);
    };
  }, []);

  const handleHover = (idx: number) => {
    if (graceRef.current) clearTimeout(graceRef.current);
    setIsPaused(true);
    setFocusedIdx(idx);
  };

  const handleLeave = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = setTimeout(() => setIsPaused(false), HOVER_GRACE_MS);
  };

  // Fallback HIDDEN — belum ada banner = carousel ilang (sesuai keputusan).
  if (loading || ads.length === 0) return null;

  const focused = ads[Math.min(focusedIdx, ads.length - 1)];
  const focusedTitle = focused.title || focused.advertiser_name;
  const focusedTagline = focused.body || focused.advertiser_name;

  return (
    <section className="my-8">
      {/* Lean header — vertical bar + label + tagline */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <span className="inline-block" style={{ width: 4, height: 22, background: '#8B5CF6', borderRadius: 2 }} />
          <h3 className="text-[16px] md:text-[18px] font-extrabold uppercase tracking-[-0.3px] text-gray-900"
            style={{ fontFamily: "'Lora', Georgia, serif" }}>
            Layanan TeraLoka
          </h3>
        </div>
        <span className="text-[11px] text-gray-500 italic hidden md:inline"
          style={{ fontFamily: "'Lora', Georgia, serif" }}>
          Semua yang kamu butuhkan di MalUt, ADA di sini
        </span>
      </div>

      {/* Focused info (dari data ADS) */}
      <div className="text-center mb-4 min-h-[60px]">
        <p key={focused.id} className="text-[18px] md:text-[22px] font-extrabold leading-tight animate-fadeIn"
          style={{ fontFamily: "'Lora', Georgia, serif", color: '#1F2937' }}>
          {focusedTitle}
        </p>
        <p key={`${focused.id}-tag`} className="text-[12px] md:text-[13px] text-gray-600 mt-1 animate-fadeIn px-4">
          {focusedTagline}
        </p>
      </div>

      {/* Poster gallery */}
      <div className="flex items-center justify-center gap-3 md:gap-5 py-8 overflow-x-auto md:overflow-visible"
        style={{ minHeight: POSTER_H * FOCUSED_SCALE + 20 }}>
        {ads.map((ad, idx) => (
          <ServicePoster
            key={ad.id}
            ad={ad}
            isFocused={idx === focusedIdx}
            onHover={() => handleHover(idx)}
            onLeave={handleLeave}
          />
        ))}
      </div>

      {/* Dots + CTA */}
      <div className="flex flex-col items-center gap-4 mt-1">
        <div className="flex justify-center gap-1.5">
          {ads.map((ad, idx) => (
            <button
              key={ad.id}
              onClick={() => handleHover(idx)}
              onMouseLeave={handleLeave}
              className="transition-all duration-300"
              aria-label={`Pilih banner ${idx + 1}`}
              style={{
                width: idx === focusedIdx ? 22 : 6,
                height: 5,
                borderRadius: 3,
                background: idx === focusedIdx ? '#1F2937' : '#D1D5DB',
              }}
            />
          ))}
        </div>

        <a
          key={focused.id + '-cta'}
          onClick={() => queueClick(focused.id)}
          href={focused.link_url ?? '#'}
          target="_blank"
          rel="sponsored noopener noreferrer"
          className="inline-flex items-center gap-2 px-5 py-2 rounded-md text-white text-[12px] font-extrabold uppercase tracking-[0.6px] transition-all duration-300 hover:scale-105 animate-fadeIn"
          style={{ background: '#003526' }}
        >
          Lihat Detail →
        </a>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.5s ease-out; }
      `}</style>
    </section>
  );
}

// ────────────────────────────────────────────────────────────────

interface ServicePosterProps {
  ad:        CarouselAd;
  isFocused: boolean;
  onHover:   () => void;
  onLeave:   () => void;
}

function ServicePoster({ ad, isFocused, onHover, onLeave }: ServicePosterProps) {
  const vs = ad.ad_format === 'video' ? (ad.video_sources?.['service_carousel'] ?? null) : null;
  const hasVideo = !!(vs && (vs.webm || vs.mp4));
  const label = getAdLabel({ advertiser_type: ad.advertiser_type, ad_format: 'image' });
  // SESI 11: sensor impresi viewability (IAB 50%/1s, fire 1x) per poster
  const viewRef = useAdView<HTMLElement>(ad.id);

  return (
    <a
      ref={viewRef as any}
      onClick={() => queueClick(ad.id)}
      href={ad.link_url ?? '#'}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      data-ad-id={ad.id}
      data-ad-position="service_carousel"
      aria-label={`Iklan ${ad.advertiser_name}${ad.title ? `: ${ad.title}` : ''}`}
      className="block relative rounded-sm overflow-hidden cursor-pointer bg-gray-200"
      style={{
        width: `${POSTER_W}px`,
        height: `${POSTER_H}px`,
        transform: isFocused ? `scale(${FOCUSED_SCALE})` : 'scale(1)',
        transformOrigin: 'center',
        transition: 'transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.6s ease',
        zIndex: isFocused ? 10 : 1,
        boxShadow: isFocused
          ? '0 20px 40px rgba(0,0,0,0.25), 0 8px 16px rgba(0,0,0,0.15)'
          : '0 3px 10px rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
    >
      {/* Banner full-bleed: video (motion) > image (statis) */}
      {hasVideo ? (
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay loop muted playsInline
          poster={vs!.poster || ad.image_url || undefined}
        >
          {vs!.webm && <source src={vs!.webm} type="video/webm" />}
          {vs!.mp4  && <source src={vs!.mp4}  type="video/mp4" />}
        </video>
      ) : ad.image_url ? (
        <img src={ad.image_url} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-[10px]"
          style={{ background: 'linear-gradient(135deg, #374151, #1F2937)' }}>
          {ad.advertiser_name}
        </div>
      )}

      {/* Disclosure label (firewall) — conditional dari advertiser_type */}
      {label && (
        <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded text-[7px] font-extrabold tracking-[0.8px] uppercase z-[2]"
          style={{ background: '#F59E0B', color: '#fff' }}>
          {label}
        </span>
      )}

      {/* Corner bracket (focused) */}
      {isFocused && (
        <>
          <div className="absolute top-[-6px] left-[-6px] pointer-events-none" style={{ width: 16, height: 16, borderTop: '2.5px solid #F59E0B', borderLeft: '2.5px solid #F59E0B' }} />
          <div className="absolute top-[-6px] right-[-6px] pointer-events-none" style={{ width: 16, height: 16, borderTop: '2.5px solid #F59E0B', borderRight: '2.5px solid #F59E0B' }} />
          <div className="absolute bottom-[-6px] left-[-6px] pointer-events-none" style={{ width: 16, height: 16, borderBottom: '2.5px solid #F59E0B', borderLeft: '2.5px solid #F59E0B' }} />
          <div className="absolute bottom-[-6px] right-[-6px] pointer-events-none" style={{ width: 16, height: 16, borderBottom: '2.5px solid #F59E0B', borderRight: '2.5px solid #F59E0B' }} />
        </>
      )}
    </a>
  );
}

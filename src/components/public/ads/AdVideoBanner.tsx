'use client';

// ════════════════════════════════════════════════════════════════
// AD VIDEO BANNER — MP4 + WebM Fallback Renderer
// PATH: src/components/public/ads/AdVideoBanner.tsx
// ────────────────────────────────────────────────────────────────
// SESI 10 (24 Mei 2026) — Phase 1 Video Ads
//
// Render ad_format='video' per-position dari video_sources jsonb.
//   - <video muted playsinline loop> + multi <source> (mp4 → webm)
//   - poster wajib (first-paint + fallback device lama)
//   - IntersectionObserver: play saat visible, pause saat leave
//     (biar gak semua video play bareng di feed BAKABAR = berat + ganggu)
//
// Editorial-ADS Firewall (mirror AdAnimatedBanner):
//   Layer 1: IKLAN badge (top-left, amber, always visible)
//   Layer 2: advertiser attribution ("oleh X" di bawah)
//   Layer 3: disclaimer overlay (kalau ada — KPU politisi)
//   Layer 4: link_url click → new tab dengan rel noopener
//
// Autoplay policy: browser block autoplay bersuara → SELALU muted.
// play() promise bisa reject (Safari strict) → di-catch graceful.
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useCallback } from 'react';

// Mirror shared/types.ts AdVideoSource (SESI 10 lock)
export interface AdVideoSource {
  mp4:    string;
  webm:   string | null;
  poster: string;
}

export interface VideoBannerAd {
  id:                   string;
  link_url:             string | null;
  advertiser_name:      string;
  advertiser_logo_url?: string | null;
  disclaimer_text?:     string | null;
  /** Per-position video sources (Record<positionKey, AdVideoSource>). */
  video_sources:        Record<string, AdVideoSource> | null;
  /** Fallback poster default kalau position tidak punya source poster. */
  image_url?:           string | null;
}

export interface AdVideoBannerProps {
  ad:           VideoBannerAd;
  /** Posisi mana yang di-render (pick video_sources[positionKey]). */
  positionKey:  string;
  className?:   string;
  onClick?:     (adId: string) => void;
  width?:       number;
  height?:      number;
}

const DEFAULT_WIDTH = 300;
const DEFAULT_HEIGHT = 250;
const PLAY_THRESHOLD = 0.5;
const PLAY_ROOT_MARGIN = '0px 0px -50px 0px';

export default function AdVideoBanner({
  ad,
  positionKey,
  className,
  onClick,
  width = DEFAULT_WIDTH,
  height = DEFAULT_HEIGHT,
}: AdVideoBannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Pick source untuk posisi ini
  const source = ad.video_sources?.[positionKey] ?? null;
  const posterUrl = source?.poster || ad.image_url || '';

  // ─── Click handler (Firewall Layer 4) ─────────────────────────
  const handleClick = useCallback(() => {
    if (onClick) onClick(ad.id);
    if (ad.link_url) {
      window.open(ad.link_url, '_blank', 'noopener,noreferrer');
    }
  }, [onClick, ad.id, ad.link_url]);

  // ─── IntersectionObserver: play visible / pause leave ─────────
  useEffect(() => {
    const containerEl = containerRef.current;
    const videoEl = videoRef.current;
    if (!containerEl || !videoEl || !source) return;

    // SSR / unsupported guard → coba play langsung (muted aman)
    if (typeof IntersectionObserver === 'undefined') {
      videoEl.play().catch(() => { /* autoplay blocked — poster tetap tampil */ });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            videoEl.play().catch(() => { /* autoplay blocked — graceful */ });
          } else {
            videoEl.pause();
          }
        }
      },
      { threshold: PLAY_THRESHOLD, rootMargin: PLAY_ROOT_MARGIN },
    );

    observer.observe(containerEl);
    return () => observer.disconnect();
  }, [source]);

  // ─── Fallback: tidak ada source untuk posisi ini ──────────────
  // Render poster sebagai static img (graceful degradation).
  if (!source) {
    if (!posterUrl) return null;
    return (
      <div
        ref={containerRef}
        className={className}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={`Iklan oleh ${ad.advertiser_name}`}
        style={{ position: 'relative', width, maxWidth: '100%', cursor: ad.link_url ? 'pointer' : 'default' }}
      >
        <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 30 }}
          className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          IKLAN
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={posterUrl} alt={ad.advertiser_name}
          style={{ width: '100%', height: 'auto', borderRadius: 8, display: 'block' }} />
        <p className="mt-1 text-center text-[9px] text-gray-500">
          oleh <span className="font-medium">{ad.advertiser_name}</span>
        </p>
      </div>
    );
  }

  // ─── Main render: <video> multi-source ────────────────────────
  const aspectRatio = `${width} / ${height}`;

  return (
    <div
      ref={containerRef}
      className={className}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Iklan video oleh ${ad.advertiser_name}`}
      style={{ position: 'relative', width, maxWidth: '100%', cursor: ad.link_url ? 'pointer' : 'default' }}
    >
      {/* IKLAN Badge (Firewall Layer 1) */}
      <div
        style={{ position: 'absolute', top: 8, left: 8, zIndex: 30, pointerEvents: 'none' }}
        className="rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm"
      >
        IKLAN
      </div>

      {/* Video — muted+playsinline+loop wajib untuk autoplay policy */}
      <video
        ref={videoRef}
        muted
        playsInline
        loop
        preload="metadata"
        poster={posterUrl || undefined}
        style={{
          width: '100%',
          aspectRatio,
          objectFit: 'cover',
          borderRadius: 8,
          display: 'block',
          background: '#000',
        }}
      >
        {/* Browser pilih source pertama yang didukung: mp4 dulu (universal), webm kedua */}
        <source src={source.mp4} type="video/mp4" />
        {source.webm && <source src={source.webm} type="video/webm" />}
        {/* Fallback teks (browser super lawas tanpa <video>) */}
        Browser Anda tidak mendukung video.
      </video>

      {/* Disclaimer overlay (Firewall Layer 3 — KPU politisi) */}
      {ad.disclaimer_text && (
        <div
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 20, pointerEvents: 'none' }}
          className="bg-amber-100/95 px-2 py-1 text-[9px] leading-tight text-amber-900"
        >
          {ad.disclaimer_text}
        </div>
      )}

      {/* Advertiser attribution (Firewall Layer 2) */}
      <p className="mt-1 text-center text-[9px] text-gray-500">
        oleh <span className="font-medium">{ad.advertiser_name}</span>
      </p>
    </div>
  );
}

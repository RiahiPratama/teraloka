'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — DCA Top Leaderboard v1.0 (Mission 7 Sub-Phase 7-B-2)
// PATH: src/components/bakabar/DCATopLeaderboard.tsx
// ────────────────────────────────────────────────────────────────
// Hero banner above-the-fold full-width, 220px height.
// Replace hardcoded TopLeaderboardAd → fetch public.ads
// /by-position/top_leaderboard. DCA-ready if creative_frames present.
//
// Pattern reuse: layout dari TopLeaderboardAd.tsx existing (Mockup
// spec .ad-leaderboard-big), rotation logic dari DCABanner.
//
// Empty state: gak ada ad → return null (slot hilang gracefully).
//
// PRD: 02-PRD-DCA-v1.1
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';
// SESI 5E Phase 3c: Kumparan-style disclosure label
import { getAdLabel } from '@/lib/ads/getAdLabel';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

export interface TopLeaderboardFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

interface TopLeaderboardAd {
  id:                  string;
  title:               string | null;
  body:                string | null;
  link_url:            string | null;
  image_url:           string | null;
  advertiser_name:     string;
  advertiser_type:     'umum' | 'politisi' | 'pemerintah' | 'komersial';
  creative_frames:     TopLeaderboardFrame[] | null;
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

export default function DCATopLeaderboard() {
  const [ad, setAd] = useState<TopLeaderboardAd | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/public/ads/by-position/top_leaderboard?limit=1`);
        const json = await res.json();
        if (!cancelled && json?.success && Array.isArray(json.data) && json.data[0]) {
          setAd(json.data[0] as TopLeaderboardAd);
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
      data-ad-position="top_leaderboard"
      data-ad-mode={isDCA ? 'dca' : 'static'}
      className="block"
    >
      <LeaderboardInner ad={ad} isDCA={isDCA} />
    </a>
  );
}

function LeaderboardInner({ ad, isDCA }: { ad: TopLeaderboardAd; isDCA: boolean }) {
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

  const handleEnter = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    setIsPaused(true);
  };
  const handleLeave = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = setTimeout(() => setIsPaused(false), HOVER_GRACE_MS);
  };

  const displayTitle = isDCA && currentFrame ? currentFrame.headline : (ad.title ?? '');
  const overline = ad.advertiser_name.toUpperCase();
  const visualSymbol = ad.advertiser_name.charAt(0).toUpperCase();

  return (
    <div
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="relative w-full h-[220px] rounded-xl overflow-hidden flex items-center justify-between px-12 text-white cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #0F4C81 0%, #1E6FA5 60%, #312E81 100%)',
      }}
    >
      {/* Radial decorations */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background:
          'radial-gradient(circle at 80% 50%, rgba(255,255,255,0.12) 0%, transparent 50%), radial-gradient(circle at 15% 80%, rgba(245,158,11,0.18) 0%, transparent 50%)',
      }} />

      {/* SESI 5E Phase 3c: Kumparan-style conditional disclosure
          - politisi → "Iklan Kampanye"
          - pemerintah → "IKLAN"
          - else (umum/komersial/premium) → no label (natural) */}
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

      {/* Content */}
      <div className="relative z-[2] max-w-[60%]">
        <p className="text-[11px] font-extrabold tracking-[2px] uppercase opacity-75 mb-3 truncate">
          {overline}
        </p>
        <h2
          key={`tl-${currentIdx}`}
          className="text-[32px] font-bold leading-[1.1] tracking-[-0.6px] mb-2.5 animate-tl-fade"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          {displayTitle}
        </h2>
        {!isDCA && ad.body && (
          <p className="text-[13px] leading-[1.4] opacity-85 line-clamp-2 mb-4 max-w-[480px]">
            {ad.body}
          </p>
        )}
        <span className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-white text-[#0F4C81] text-[12px] font-extrabold uppercase tracking-[0.6px]">
          Lihat Detail →
        </span>
      </div>

      {/* Visual symbol kanan (logo placeholder) */}
      <div className="relative z-[2] hidden md:flex items-center justify-center w-[180px] h-[180px] rounded-2xl shrink-0"
        style={{
          background: 'rgba(255,255,255,0.08)',
          border: '1px solid rgba(255,255,255,0.15)',
        }}>
        <span className="text-[80px] font-bold text-white opacity-90"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}>
          {visualSymbol}
        </span>
      </div>

      {/* SESI 5E Phase 3c: DCA pagination dots REMOVED — natural feel
          (pattern Kumparan). Rotation tetap aktif via setInterval di useEffect. */}

      <style jsx>{`
        @keyframes tl-fade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-tl-fade { animation: tl-fade 0.6s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .animate-tl-fade { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — La Indie Movie Hero Banner v2.2 (Sub-Batch C Fallback)
// PATH: src/components/bakabar/LaIndieMoviePoliticalBanner.tsx
// ────────────────────────────────────────────────────────────────
// PHASE 1 FALLBACK v2.2 (15 Mei 2026):
//   Fetch flow:
//     1. /public/ads/political-banner (politisi ads)
//     2. Empty? → /public/ads?position=homepage_hero_banner (fallback)
//     3. Empty? → return null (hide section)
//
//   Adaptive header:
//     - Politisi ads present  → "Kampanye Politik MalUt" + IKLAN
//     - Fallback ads          → "Pilihan Sponsor" + IKLAN
//
//   KPU Compliance maintained:
//     - Politisi: shuffle order per session + auto-rotate + equal default
//     - Non-politisi: standard rotation (no fairness mandate)
//
//   Admin Workflow:
//     - Create politisi ad → position 'political_banner' (highest priority)
//     - Create generic ad  → position 'homepage_hero_banner' (fallback)
//     - Pre-Pilkada 2029: no politisi ads → slot diisi fallback
//
// History:
//   - v1.0/v1.1: Original 9-tier (KPU violation, fixed in v2.0)
//   - v2.0: Equal default + auto-rotate (KPU compliant)
//   - v2.1: LEAN — minimal wrapper
//   - v2.2: Phase 1 Fallback Hero Banner + adaptive header
// ════════════════════════════════════════════════════════════════

import { useEffect, useState, useRef } from 'react';
// SESI 11 Batch 8 (31 Mei 2026): Banner Motion focused-only (webM poster)
import { type AdVideoSource } from '@/components/public/ads/AdVideoBanner';

interface HeroAd {
  id:                    string;
  title:                 string | null;
  body:                  string | null;
  link_url:              string | null;
  image_url:             string | null;
  advertiser_name:       string;
  advertiser_logo_url:   string | null;
  advertiser_type?:      string;
  // SESI 11 Batch 8: per-position video sources (webM/mp4 loop)
  ad_format?:            'image' | 'text' | 'animated' | 'video';
  video_sources?:        Record<string, AdVideoSource> | null;
}

type SlotMode = 'politisi' | 'fallback' | 'empty';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.teraloka.com/api/v1';

const AUTO_ROTATE_MS = 5000; // SESI 11 Batch 8 (31 Mei): seragam cadence carousel
const HOVER_GRACE_MS = 1500;
const POSTER_W       = 160;
const POSTER_H       = 240;
const FOCUSED_SCALE  = 1.30;

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// SESI 11 Batch 8: hormati prefers-reduced-motion (poster fokus → statis)
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

// Slot label config — adaptive header
const SLOT_LABELS: Record<SlotMode, { title: string; watermark: string }> = {
  politisi:  { title: 'Kampanye Politik MalUt', watermark: 'TERA POLITIK' },
  fallback:  { title: 'Pilihan Sponsor',         watermark: 'TERA SPONSOR' },
  empty:     { title: '',                         watermark: '' },
};

export default function LaIndieMoviePoliticalBanner() {
  const [ads, setAds] = useState<HeroAd[]>([]);
  const [slotMode, setSlotMode] = useState<SlotMode>('empty');
  const [loading, setLoading] = useState(true);
  const [focusedIdx, setFocusedIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const rotationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const graceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reducedMotion = useReducedMotion();

  // ── Fetch chain: politisi → fallback → empty ──────────────
  useEffect(() => {
    let cancelled = false;

    async function loadAds() {
      try {
        // STEP 1: Try politisi first
        const politRes = await fetch(`${API}/public/ads/political-banner`);
        const politJson = await politRes.json();

        if (!cancelled && politJson?.success && Array.isArray(politJson.data) && politJson.data.length > 0) {
          // Politisi ads found — shuffle for KPU fairness
          setAds(shuffle(politJson.data.slice(0, 9)));
          setSlotMode('politisi');
          return;
        }

        // STEP 2: Fallback to hero_banner position
        const fbRes = await fetch(`${API}/public/ads?position=homepage_hero_banner`);
        const fbJson = await fbRes.json();

        if (!cancelled && fbJson?.success && Array.isArray(fbJson.data) && fbJson.data.length > 0) {
          // Fallback ads — natural order (no shuffle, admin curate by priority)
          setAds(fbJson.data.slice(0, 9));
          setSlotMode('fallback');
          return;
        }

        // STEP 3: Empty
        if (!cancelled) setSlotMode('empty');
      } catch (err) {
        console.error('[HeroBanner] fetch error:', err);
        if (!cancelled) setSlotMode('empty');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadAds();
    return () => { cancelled = true; };
  }, []);

  // Auto-rotate
  useEffect(() => {
    if (isPaused || ads.length < 2) return;
    rotationRef.current = setInterval(() => {
      setFocusedIdx(prev => (prev + 1) % ads.length);
    }, AUTO_ROTATE_MS);
    return () => {
      if (rotationRef.current) clearInterval(rotationRef.current);
    };
  }, [isPaused, ads.length]);

  const handleHover = (idx: number) => {
    if (graceRef.current) clearTimeout(graceRef.current);
    setIsPaused(true);
    setFocusedIdx(idx);
  };

  const handleLeave = () => {
    if (graceRef.current) clearTimeout(graceRef.current);
    graceRef.current = setTimeout(() => setIsPaused(false), HOVER_GRACE_MS);
  };

  useEffect(() => {
    return () => {
      if (graceRef.current) clearTimeout(graceRef.current);
    };
  }, []);

  // Hide section if loading or empty
  if (loading || slotMode === 'empty' || ads.length === 0) return null;

  const focusedAd = ads[focusedIdx];
  const labels = SLOT_LABELS[slotMode];
  // SESI 11 Batch 8: key buat lookup video_sources sesuai sumber fetch
  const positionKey = slotMode === 'politisi' ? 'political_banner' : 'homepage_hero_banner';

  return (
    <section className="my-8">
      {/* Adaptive header */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block"
            style={{ width: 4, height: 22, background: '#8B5CF6', borderRadius: 2 }}
          />
          <h3
            className="text-[16px] md:text-[18px] font-extrabold uppercase tracking-[-0.3px] text-gray-900"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            {labels.title}
          </h3>
        </div>
        {/* SESI 5E Phase 3c v2: Conditional badge by slotMode.
            - 'politisi'  → "Iklan Kampanye" (KPU PKPU mandatory)
            - 'fallback'  → tanpa badge (section title "PILIHAN SPONSOR" udah disclosure)
            - 'empty'     → tanpa badge */}
        {slotMode === 'politisi' && (
          <span
            className="text-[9px] font-extrabold tracking-[0.6px] px-2 py-0.5 rounded uppercase"
            style={{ background: '#F59E0B', color: '#fff' }}
          >
            Iklan Kampanye
          </span>
        )}
      </div>

      {/* Focused title — POLITISI only (KPU: tampilkan nama kandidat).
          SPONSOR: caption dibuang, poster = creative lengkap (judul udah di gambar). */}
      {slotMode === 'politisi' && (
        <div className="text-center mb-4 min-h-[44px]">
          <p
            key={focusedAd.id}
            className="text-[15px] md:text-[17px] font-bold text-gray-900 leading-snug animate-fadeIn px-4"
            style={{ fontFamily: "'Lora', Georgia, serif" }}
          >
            {focusedAd.title}
          </p>
        </div>
      )}

      {/* Poster gallery */}
      <div
        className="flex items-center justify-center gap-3 md:gap-4 py-8 overflow-x-auto md:overflow-visible"
        style={{ minHeight: POSTER_H * FOCUSED_SCALE + 20 }}
      >
        {ads.map((ad, idx) => (
          <HeroPoster
            key={ad.id}
            ad={ad}
            isFocused={idx === focusedIdx}
            watermark={labels.watermark}
            positionKey={positionKey}
            reducedMotion={reducedMotion}
            onHover={() => handleHover(idx)}
            onLeave={handleLeave}
          />
        ))}
      </div>

      {/* Pagination dots */}
      {ads.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-1">
          {ads.map((_, idx) => (
            <button
              key={idx}
              onClick={() => handleHover(idx)}
              onMouseLeave={handleLeave}
              className="transition-all duration-300"
              aria-label={`Pilih ${idx + 1}`}
              style={{
                width: idx === focusedIdx ? 22 : 6,
                height: 5,
                borderRadius: 3,
                background: idx === focusedIdx ? '#1F2937' : '#D1D5DB',
              }}
            />
          ))}
        </div>
      )}

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

interface HeroPosterProps {
  ad:            HeroAd;
  isFocused:     boolean;
  watermark:     string;
  positionKey:   string;
  reducedMotion: boolean;
  onHover:       () => void;
  onLeave:       () => void;
}

function HeroPoster({ ad, isFocused, watermark, positionKey, reducedMotion, onHover, onLeave }: HeroPosterProps) {
  // SESI 11 Batch 8: webM focused-only (cuma poster fokus yang play)
  // SESI 11 (31 Mei): ad_format = HINT. Render video kalau posisi punya source, apa pun global format.
  const v = ad.video_sources?.[positionKey] ?? null;
  const hasVideo = !!(v && (v.webm || v.mp4));

  const handleClick = () => {
    if (!ad.link_url) return;
    fetch(`${API}/public/ads/${ad.id}/click`, { method: 'POST' }).catch(() => {});
  };

  const PosterInner = (
    <div
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      className="relative rounded-sm overflow-hidden cursor-pointer"
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
        background: '#1a1a1a',
        flexShrink: 0,
      }}
    >
      {isFocused && hasVideo && !reducedMotion ? (
        <video
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          poster={v!.poster || ad.image_url || undefined}
        >
          {/* webM-first (ringan), mp4 fallback */}
          {v!.webm && <source src={v!.webm} type="video/webm" />}
          {v!.mp4  && <source src={v!.mp4}  type="video/mp4" />}
        </video>
      ) : hasVideo && v!.poster ? (
        // Non-fokus / reduced-motion → poster statis (gak ada N video play bareng)
        <img
          src={v!.poster}
          alt={ad.title || ad.advertiser_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : ad.image_url ? (
        <img
          src={ad.image_url}
          alt={ad.title || ad.advertiser_name}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center text-white text-xs px-3 text-center"
          style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}
        >
          {ad.advertiser_name}
        </div>
      )}

      {isFocused && (
        <>
          <div className="absolute top-[-6px] left-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderTop: '2.5px solid #F59E0B', borderLeft: '2.5px solid #F59E0B' }} />
          <div className="absolute top-[-6px] right-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderTop: '2.5px solid #F59E0B', borderRight: '2.5px solid #F59E0B' }} />
          <div className="absolute bottom-[-6px] left-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderBottom: '2.5px solid #F59E0B', borderLeft: '2.5px solid #F59E0B' }} />
          <div className="absolute bottom-[-6px] right-[-6px] pointer-events-none"
            style={{ width: 16, height: 16, borderBottom: '2.5px solid #F59E0B', borderRight: '2.5px solid #F59E0B' }} />
        </>
      )}
    </div>
  );

  if (!ad.link_url) return PosterInner;

  return (
    <a
      href={ad.link_url}
      target="_blank"
      rel="sponsored noopener noreferrer"
      onClick={handleClick}
      className="block"
      aria-label={`Iklan: ${ad.title || ad.advertiser_name}`}
    >
      {PosterInner}
    </a>
  );
}

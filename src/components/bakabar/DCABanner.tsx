'use client';

// ════════════════════════════════════════════════════════════════
// BAKABAR — DCA Banner v1.0 (Mission 7 Phase 3)
// PATH: src/components/bakabar/DCABanner.tsx
// ────────────────────────────────────────────────────────────────
// Dynamic Creative Ads — multi-frame rotation untuk 1 ad slot.
// Pattern reuse dari LaIndieMoviePoliticalBanner: setInterval rotation
// + hover pause + grace period + fade transition.
//
// Adaptasi untuk trending native ad context (compact 52×52 thumbnail
// + headline rotation, bukan poster gallery).
//
// Honors prefers-reduced-motion → render frame 0 static, no rotation.
//
// PRD: 02-PRD-DCA-v1.1
// Date: 15 Mei 2026
// ════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState } from 'react';

export interface AdFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

type Props = {
  frames: AdFrame[];
};

const HOVER_GRACE_MS = 1500;
const FALLBACK_GRADIENT = 'linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%)';

// Detect reduced motion preference (accessibility — honor OS setting)
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

export default function DCABanner({ frames }: Props) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [imgFailed, setImgFailed] = useState<Record<number, boolean>>({});

  const rotationRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const graceRef    = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reducedMotion = useReducedMotion();
  const currentFrame = frames[currentIdx];
  const currentDuration = currentFrame?.duration_ms || 4000;

  // Auto-rotate (honored only when not paused + motion allowed)
  useEffect(() => {
    if (reducedMotion || isPaused || frames.length < 2) return;

    rotationRef.current = setTimeout(() => {
      setCurrentIdx((prev) => (prev + 1) % frames.length);
    }, currentDuration);

    return () => {
      if (rotationRef.current) clearTimeout(rotationRef.current);
    };
  }, [currentIdx, currentDuration, isPaused, reducedMotion, frames.length]);

  // Cleanup grace timer on unmount
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

  if (!currentFrame) return null;

  const imgFailedForCurrent = imgFailed[currentIdx];

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex gap-2 w-full"
    >
      {/* Left: rotating headline */}
      <div className="flex-1 min-w-0">
        <h4
          key={`dca-h-${currentIdx}`}
          className="text-[11.5px] font-semibold leading-[1.3] text-gray-900 line-clamp-2 animate-dca-fade"
          style={{ fontFamily: "var(--font-lora), Georgia, serif" }}
        >
          {currentFrame.headline}
        </h4>
      </div>

      {/* Right: rotating thumbnail 52×52 (preload frame 0, lazy others) */}
      <div
        className="w-[52px] h-[52px] rounded-md shrink-0 overflow-hidden relative"
        style={{ background: FALLBACK_GRADIENT }}
      >
        {currentFrame.image_url && !imgFailedForCurrent && (
          <img
            key={`dca-img-${currentIdx}`}
            src={currentFrame.image_url}
            alt=""
            className="w-full h-full object-cover animate-dca-fade"
            loading={currentIdx === 0 ? 'eager' : 'lazy'}
            onError={() => setImgFailed((prev) => ({ ...prev, [currentIdx]: true }))}
          />
        )}
      </div>

      <style jsx>{`
        @keyframes dca-fade {
          from { opacity: 0.4; }
          to   { opacity: 1; }
        }
        .animate-dca-fade {
          animation: dca-fade 0.5s ease-out;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-dca-fade {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}

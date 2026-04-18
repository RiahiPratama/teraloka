'use client';

/**
 * TeraLoka — Spinner
 * Phase 2 · Batch 3a — UI Primitives Core
 * ------------------------------------------------------------
 * SVG-based circular spinner. Dipakai standalone ATAU sebagai
 * loading indicator di dalam Button (prop `loading`).
 *
 * Pakai CSS animation (bukan JS) — smooth 60fps tanpa re-render.
 *
 * Contoh:
 *   <Spinner />                          // default md, currentColor
 *   <Spinner size="sm" />                // kecil
 *   <Spinner className="text-balapor" /> // warna custom via class
 */

import { cn } from '@/lib/utils';

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg';

interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Accessible label untuk screen reader. Default: 'Loading' */
  label?: string;
}

const SIZE_MAP: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 14,
  md: 18,
  lg: 24,
};

export function Spinner({
  size = 'md',
  className,
  label = 'Loading',
}: SpinnerProps) {
  const dim = SIZE_MAP[size];
  return (
    <span
      role="status"
      aria-label={label}
      className={cn('inline-flex items-center justify-center', className)}
    >
      <svg
        width={dim}
        height={dim}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
        aria-hidden="true"
      >
        {/* Track — pakai currentColor dengan opacity rendah */}
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="2.5"
        />
        {/* Arc aktif — 25% lingkaran */}
        <path
          d="M22 12a10 10 0 0 1-10 10"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="sr-only">{label}</span>
    </span>
  );
}

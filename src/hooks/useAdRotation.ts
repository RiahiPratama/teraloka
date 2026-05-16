'use client';

/**
 * TeraLoka — useAdRotation hook
 * Mission 8 Sub-Phase 8-D Batch C2
 * ------------------------------------------------------------
 * Shared DCA frame rotation hook untuk public ad components.
 *
 * Auto-cycle through creative_frames sesuai duration_ms per frame.
 * Loops continuously: frame[0] → frame[1] → ... → frame[N-1] → frame[0].
 *
 * Used by:
 *   - AdSidebarSlug (sidebar, dots indicator)
 *   - AdInArticle (banner middle of article, dots indicator)
 *   - AdNativeSlug (native feed, SILENT rotation per Pattern AAA — Native Ad Editorial Blend)
 *
 * History:
 *   - 16 Mei 2026: NEW (extracted dari AdSidebarSlug v2 inline hook)
 */

import { useEffect, useState, useRef } from 'react';

export interface AdFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

export interface AdRotationResult<T extends AdFrame = AdFrame> {
  /** Current active frame, atau null kalau frames empty/<2 */
  active: T | null;
  /** Current index (0-based), atau 0 saat single/no frames */
  index: number;
  /** Total frames available (0 kalau null, 1 kalau single, >=2 kalau DCA active) */
  total: number;
  /** True kalau frames >= 2 (DCA rotation aktif). Convenience flag. */
  isDCA: boolean;
}

/**
 * useAdRotation — auto-cycle creative_frames.
 *
 * @param frames Array of AdFrame OR null/undefined (no DCA)
 * @returns { active, index, total, isDCA }
 *
 * Behavior:
 *   - frames null/undefined/[] → active=null, isDCA=false, no rotation
 *   - frames length === 1 → active=frames[0], isDCA=false, no rotation
 *   - frames length >= 2 → active rotates, isDCA=true
 *
 * Cleanup:
 *   - Timeout cleared on unmount + frames change
 *   - Safe untuk SSR (useEffect only runs client-side)
 */
export function useAdRotation<T extends AdFrame = AdFrame>(
  frames: T[] | null | undefined,
): AdRotationResult<T> {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Normalize
  const safeFrames = Array.isArray(frames) ? frames : [];
  const total = safeFrames.length;
  const isDCA = total >= 2;

  useEffect(() => {
    // Reset index kalau frames berubah (avoid stale index out-of-bounds)
    if (index >= total) setIndex(0);
  }, [total, index]);

  useEffect(() => {
    if (!isDCA) return;

    const current = safeFrames[index];
    if (!current || !current.duration_ms || current.duration_ms < 100) return;

    timeoutRef.current = setTimeout(() => {
      setIndex((prev) => (prev + 1) % total);
    }, current.duration_ms);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [index, isDCA, safeFrames, total]);

  // Return values
  if (total === 0) {
    return { active: null, index: 0, total: 0, isDCA: false };
  }

  const safeIndex = Math.min(index, total - 1);
  return {
    active: safeFrames[safeIndex],
    index:  safeIndex,
    total,
    isDCA,
  };
}

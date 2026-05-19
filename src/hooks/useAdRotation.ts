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
 *   - SESI 5E Phase 2 (19 Mei 2026): Hybrid C support — accept Record<positionKey, AdFrame[]>
 *     Hook accept new optional `positionKey` arg. Resolution logic:
 *       - null/undefined → no DCA (active=null)
 *       - Array          → legacy flat (backward compat — all positions share)
 *       - Record + key   → resolve frames specific to that position
 *       - Record no key  → fallback to first available position's frames
 */

import { useEffect, useState, useRef } from 'react';

export interface AdFrame {
  order:       number;
  headline:    string;
  image_url:   string;
  duration_ms: number;
}

/**
 * SESI 5E Phase 2 (19 Mei 2026): Hybrid C creative_frames value shape.
 *
 *   - null/undefined          : static ad (no DCA)
 *   - AdFrame[]               : LEGACY flat array (all positions share — backward compat)
 *   - Record<string, AdFrame[]>: NEW per-position map (independent per posisi)
 */
export type CreativeFramesValue<T extends AdFrame = AdFrame> =
  | T[]
  | Record<string, T[]>
  | null
  | undefined;

/**
 * SESI 5E Phase 2: Type guard untuk distinguish per-position map vs legacy array.
 */
export function isPerPositionFrames<T extends AdFrame = AdFrame>(
  value: CreativeFramesValue<T>,
): value is Record<string, T[]> {
  return (
    value !== null &&
    value !== undefined &&
    !Array.isArray(value) &&
    typeof value === 'object'
  );
}

/**
 * SESI 5E Phase 2: Resolve frames untuk posisi spesifik dari hybrid shape.
 *
 * Resolution order:
 *   1. null/undefined → null (no DCA)
 *   2. Array (legacy) → return as-is (all positions share)
 *   3. Record + positionKey present in map → return that position's frames
 *   4. Record + positionKey missing → fallback to first available position's frames
 *      (safety net untuk avoid render breakage)
 *   5. Record empty → null
 */
export function resolveFramesForPosition<T extends AdFrame = AdFrame>(
  value: CreativeFramesValue<T>,
  positionKey?: string,
): T[] | null {
  if (value === null || value === undefined) return null;

  // Legacy flat array — backward compat
  if (Array.isArray(value)) return value;

  // Per-position map
  if (positionKey && value[positionKey]) {
    return value[positionKey];
  }

  // Fallback: first available position's frames (safety net)
  const firstKey = Object.keys(value)[0];
  return firstKey ? value[firstKey] : null;
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
 * SESI 5E Phase 2 (19 Mei 2026): Hybrid C support.
 * @param value      Hybrid frames value: AdFrame[] (legacy) | Record<string, AdFrame[]> (per-position) | null
 * @param positionKey Optional. Only used kalau value adalah per-position map.
 *                    Resolve frames untuk posisi spesifik. Legacy array ignore arg ini.
 * @returns { active, index, total, isDCA }
 *
 * Behavior:
 *   - value null/undefined        → active=null, isDCA=false
 *   - value Array (legacy)        → rotate flat array (positionKey ignored)
 *   - value Record + positionKey  → rotate frames untuk posisi itu
 *   - value Record no positionKey → fallback ke first position's frames (safety)
 *   - frames length === 1         → active=frame[0], isDCA=false, no rotation
 *   - frames length >= 2          → active rotates, isDCA=true
 *
 * Cleanup:
 *   - Timeout cleared on unmount + frames change
 *   - Safe untuk SSR (useEffect only runs client-side)
 */
export function useAdRotation<T extends AdFrame = AdFrame>(
  value: CreativeFramesValue<T>,
  positionKey?: string,
): AdRotationResult<T> {
  const [index, setIndex] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // SESI 5E Phase 2: Resolve frames dari hybrid shape (handles legacy + per-position)
  const resolved = resolveFramesForPosition(value, positionKey);
  const safeFrames = Array.isArray(resolved) ? resolved : [];
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

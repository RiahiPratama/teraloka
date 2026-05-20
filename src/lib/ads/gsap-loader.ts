/**
 * TeraLoka — GSAP Lazy Loader Utility
 * SESI 5H Phase 1 (20 Mei 2026) — GSAP Banner Foundation Track B
 * ────────────────────────────────────────────────────────────────
 * PATH: src/lib/ads/gsap-loader.ts
 *
 * Purpose:
 *   - Lazy load GSAP via dynamic import (code-split)
 *   - Cache instance setelah first load (idempotent)
 *   - Detect prefers-reduced-motion (accessibility)
 *   - Detect slow network (mobile fallback strategy)
 *
 * Patterns LOCKED:
 *   🆕 PPP — GSAP Lazy Load Code-Split
 *      Main bundle: 0 KB GSAP overhead
 *      Animated ad chunk: ~30-50 KB loaded once on demand
 *
 *   🆕 QQQ — prefers-reduced-motion + Network-Aware Respect
 *      Accessibility-first: respect user OS setting
 *      Network-aware: 2G/slow-2G/save-data = static fallback
 *
 * Performance Strategy:
 *   - Main bundle impact: ≤5 KB (loader code only, GSAP excluded)
 *   - GSAP loaded ONLY saat first animated ad detected
 *   - Subsequent ad uses cached instance
 *   - Mobile slow network: skip GSAP, render static fallback
 *
 * Filosofi:
 *   - BAKABAR=JANTUNG → reading experience must not be compromised
 *   - Editorial-ADS Firewall preserved (animasi enhance, gak ganggu)
 *   - Bootstrap-friendly: zero recurring cost, no premium tier required
 *
 * Usage example:
 *   import { loadGsap, shouldUseStaticFallback } from '@/lib/gsap-loader';
 *
 *   const useStatic = shouldUseStaticFallback();
 *   if (useStatic) {
 *     // Render static composition
 *     return <StaticBanner ... />;
 *   }
 *
 *   const gsap = await loadGsap();
 *   const tl = gsap.timeline();
 *   // ... build animation timeline
 *
 * ────────────────────────────────────────────────────────────────
 */

// ─── Types ────────────────────────────────────────────────────────

/**
 * GSAP module type — narrowed dari full gsap import.
 * Phase 1 LEAN: hanya butuh `gsap` + `gsap.timeline`.
 * Future Phase 2: add ScrollTrigger, MorphSVG, dll.
 */
type GsapModule = typeof import('gsap');

/**
 * Reason kenapa static fallback dipakai (untuk debug + analytics future).
 */
export type StaticFallbackReason =
  | 'reduce_motion'    // OS setting prefers-reduced-motion
  | 'slow_network'     // 2G / slow-2G / save-data
  | 'ssr_environment'  // running di server-side (window undefined)
  | null;              // NO fallback needed, animate full

// ─── Module-level cache (singleton GSAP instance) ────────────────

/**
 * GSAP instance cache — first load fetches, subsequent calls return cached.
 *
 * Note: Module-level state at frontend = per-route survival.
 * SSR safe: variable defined but never accessed di server side
 *           (loadGsap dipanggil dari useEffect/onMount only).
 */
let gsapInstance: GsapModule | null = null;
let loadingPromise: Promise<GsapModule> | null = null;

// ─── Public API ──────────────────────────────────────────────────

/**
 * Lazy load GSAP library via dynamic import.
 *
 * Returns:
 *   - Cached instance kalau sudah pernah loaded
 *   - Fresh fetch kalau first call (returns Promise)
 *   - Same promise kalau ada concurrent call (prevent double-fetch race)
 *
 * Throws:
 *   - Error kalau dynamic import gagal (network fail, CSP block)
 *
 * Performance:
 *   - First call: ~30-50 KB chunk download (cached by browser)
 *   - Subsequent calls: <1ms (memory reference)
 *
 * SSR safety:
 *   - Caller WAJIB di useEffect / client-side context
 *   - Function tidak guard typeof window karena dynamic import
 *     sudah throw error di SSR (next.js auto-handle)
 */
export async function loadGsap(): Promise<GsapModule> {
  // Return cached kalau sudah ada
  if (gsapInstance) {
    return gsapInstance;
  }

  // Return existing promise kalau ada concurrent loading
  // (prevent multiple parallel dynamic imports)
  if (loadingPromise) {
    return loadingPromise;
  }

  // Start fresh load
  loadingPromise = import('gsap')
    .then((mod) => {
      gsapInstance = mod;
      return mod;
    })
    .catch((err) => {
      // Reset loadingPromise kalau gagal — caller bisa retry
      loadingPromise = null;
      console.error('[gsap-loader] GSAP dynamic import failed:', err);
      throw new Error(
        'GSAP failed to load. Banner will fallback to static composition.',
      );
    });

  return loadingPromise;
}

/**
 * Check apakah user prefer reduced motion (OS-level setting).
 *
 * Returns:
 *   - true:  user has prefers-reduced-motion: reduce
 *   - false: animation OK to play
 *
 * SSR safe:
 *   - Returns false di server (default = animate)
 *   - Client-side: real-time check via matchMedia
 *
 * Use case:
 *   - User dengan motion sickness / vestibular disorder
 *   - User epilepsy / photosensitivity
 *   - User personal preference (battery saving, focus)
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof window.matchMedia !== 'function') return false;

  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // Defensive: matchMedia query syntax error (shouldn't happen)
    return false;
  }
}

/**
 * Check apakah connection user slow / save-data mode.
 *
 * Detection sources:
 *   - navigator.connection.effectiveType (2g, 3g, 4g)
 *   - navigator.connection.saveData (user enabled data saver)
 *
 * Returns:
 *   - true: connection slow (2g/slow-2g) atau save-data ON
 *   - false: connection OK (3g/4g/5g, no save-data)
 *
 * SSR safe:
 *   - Returns false di server (default = animate)
 *
 * Browser support note:
 *   - Network Information API: Chrome, Edge, Opera (Chromium)
 *   - Safari & Firefox: API undefined → returns false (default animate)
 *   - Acceptable: majoritas MalUt pakai Android Chrome → API supported
 *
 * Use case:
 *   - User di MalUt rural area dengan koneksi 3G lemah
 *   - User aktifin "Data Saver" di Chrome Mobile
 *   - User di Wi-Fi public yang slow
 */
export function isSlowNetwork(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof navigator === 'undefined') return false;

  // Network Information API (Chromium-based browsers)
  const conn =
    (navigator as any).connection ??
    (navigator as any).mozConnection ??
    (navigator as any).webkitConnection;

  if (!conn) return false;

  // User aktifin data saver — respect explicit preference
  if (conn.saveData === true) return true;

  // Slow connection types
  const slowTypes = ['slow-2g', '2g'];
  if (slowTypes.includes(conn.effectiveType)) return true;

  return false;
}

/**
 * Determine apakah harus pakai static fallback (skip animasi).
 *
 * Decision tree:
 *   1. SSR context (no window) → static (defer to client hydration)
 *   2. prefers-reduced-motion ON → static (respect accessibility)
 *   3. Slow network detected → static (respect bandwidth/battery)
 *   4. Default → animate full
 *
 * Returns:
 *   - Object dengan flag `useStatic` + `reason` (untuk debug/analytics)
 *
 * Usage:
 *   const { useStatic, reason } = shouldUseStaticFallback();
 *   if (useStatic) {
 *     console.log('[AdAnimatedBanner] Static fallback reason:', reason);
 *     return <StaticComposition ... />;
 *   }
 */
export function shouldUseStaticFallback(): {
  useStatic: boolean;
  reason:    StaticFallbackReason;
} {
  // SSR safety
  if (typeof window === 'undefined') {
    return { useStatic: true, reason: 'ssr_environment' };
  }

  // Accessibility-first
  if (prefersReducedMotion()) {
    return { useStatic: true, reason: 'reduce_motion' };
  }

  // Network-aware
  if (isSlowNetwork()) {
    return { useStatic: true, reason: 'slow_network' };
  }

  // OK to animate
  return { useStatic: false, reason: null };
}

/**
 * Reset GSAP cache (untuk testing / unit test cleanup).
 * NOT untuk production use — caller jangan call ini.
 *
 * @internal
 */
export function __resetGsapCache(): void {
  gsapInstance = null;
  loadingPromise = null;
}

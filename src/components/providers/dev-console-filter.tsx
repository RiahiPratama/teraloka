'use client';

/**
 * TeraLoka — DevConsoleFilter
 * Mei 25, 2026 — React 19 / Next.js 16.2+ False Positive Warning Filter
 * ------------------------------------------------------------
 * Filter specific dev-mode warning yang muncul karena ecosystem-wide
 * bug di React 19 + Next.js 16.2+. Tidak suppress warning lain (penting
 * untuk dev quality).
 *
 * BUG CONTEXT:
 *   React 19 warn untuk SEMUA <script> tag yang di-render di JSX component:
 *     "Encountered a script tag while rendering React component.
 *      Scripts inside React components are never executed when rendering
 *      on the client. Consider using template tag instead."
 *
 *   Ini FALSE POSITIVE untuk anti-FOUC theme scripts:
 *   - Script DOES execute saat initial SSR HTML render (browser parse normal)
 *   - Theme applied correctly, no FOUC
 *   - Warning hanya tentang client re-render (yang memang tidak perlu)
 *
 * ECOSYSTEM IMPACT:
 *   - next-themes #387, #385 (22M weekly downloads)
 *   - shadcn-ui/ui #10104, #10200
 *   - heroui-inc/heroui #6348
 *   - Generic Next.js 16.2+ apps dengan custom theme script (TeraLoka)
 *
 *   Library maintainers belum apply long-term fix (useServerInsertedHTML)
 *   karena React/Next.js diharapkan patch upstream.
 *
 * BEHAVIOR:
 *   - Dev mode ONLY (process.env.NODE_ENV === 'development')
 *   - Production: noop (component render null, console untouched)
 *   - Filter ONLY string "Encountered a script tag" — error lain tetap muncul
 *   - Safe: tidak ganggu observability error normal
 *
 * REMOVAL CONDITIONS:
 *   - React 19 patch warning ini (track react#34008 atau similar)
 *   - Atau kalau pindah ke useServerInsertedHTML pattern (proper fix)
 *
 * Reference:
 *   https://github.com/shadcn-ui/ui/issues/10104
 *   https://github.com/pacocoursey/next-themes/issues/387
 */

if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  const orig = console.error;
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Encountered a script tag')) {
      return;
    }
    orig.apply(console, args);
  };
}

export function DevConsoleFilter() {
  return null;
}

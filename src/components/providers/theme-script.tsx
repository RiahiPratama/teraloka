/**
 * TeraLoka — ThemeScript (Anti-FOUC)
 * Phase 2 · Batch 2a — Theme System
 * ------------------------------------------------------------
 * Script synchronous yang dijalankan di <head> SEBELUM React hydrate.
 * Tugasnya: baca localStorage + apply class `.dark` ke <html> sehingga
 * halaman dilukis dengan theme yang benar di frame pertama (no flicker).
 *
 * Mount di src/app/layout.tsx (di dalam <head>):
 *   <html>
 *     <head>
 *       <ThemeScript />
 *     </head>
 *     ...
 *   </html>
 *
 * Catatan:
 * - Script string SENGAJA plain (bukan import) supaya jalan sebelum
 *   React bundle di-load.
 * - Handle migrasi legacy key 'tl_admin_theme' → 'teraloka-theme'.
 * - Try/catch melindungi mode incognito strict yang ngeblock localStorage.
 *
 * React 19 / Next.js 16.2+ Dev Warning:
 *   Console muncul "Encountered a script tag while rendering React
 *   component". Ini FALSE POSITIVE ecosystem-wide bug (next-themes #387,
 *   shadcn-ui #10104, heroui #6348). Script ACTUALLY execute saat initial
 *   SSR HTML render — anti-FOUC tetap berfungsi. Warning hanya dev mode
 *   console noise, production user TIDAK terdampak.
 *
 *   Suppressed via DevConsoleFilter di layout.tsx (filter specific string
 *   "Encountered a script tag" di dev mode only).
 *
 *   Reference: https://github.com/shadcn-ui/ui/issues/10104
 */

const themeScript = `
(function() {
  try {
    var storageKey = 'teraloka-theme';
    var legacyKey = 'tl_admin_theme';
    var stored = localStorage.getItem(storageKey);

    // Migrasi dari legacy key (dipakai AdminThemeContext lama)
    if (!stored) {
      var legacy = localStorage.getItem(legacyKey);
      if (legacy === 'light' || legacy === 'dark') {
        stored = legacy;
        localStorage.setItem(storageKey, legacy);
      }
    }

    if (!stored) stored = 'system';

    var resolved;
    if (stored === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
    } else {
      resolved = stored;
    }

    if (resolved === 'dark') {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {
    // localStorage disabled / SSR leak — silent fail, default light
  }
})();
`;

export function ThemeScript() {
  return (
    <script
      suppressHydrationWarning
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}

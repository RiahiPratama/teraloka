/**
 * TeraLoka — ThemeScript (Anti-FOUC)
 * Phase 2 · Batch 2a — Theme System
 * ------------------------------------------------------------
 * Script synchronous yang dijalankan di <head> SEBELUM React hydrate.
 * Tugasnya: baca localStorage + apply class `.dark` ke <html> sehingga
 * halaman dilukis dengan theme yang benar di frame pertama (no flicker).
 *
 * Wajib mount di src/app/layout.tsx:
 *   <html>
 *     <head>
 *       <ThemeScript />
 *     </head>
 *     ...
 *   </html>
 *
 * Catatan:
 * - Script isi-nya SENGAJA string plain (bukan import) supaya jalan
 *   sebelum React bundle di-load.
 * - Script handle migrasi legacy key 'tl_admin_theme' → 'teraloka-theme'
 *   biar consistent dengan ThemeProvider di runtime.
 * - Try/catch melindungi mode incognito strict yang ngeblock localStorage.
 * - suppressHydrationWarning: React tidak bisa tahu konten script ini
 *   saat SSR — flag ini memberi tahu React untuk skip hydration mismatch
 *   check pada element ini (intentional, bukan workaround).
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
      suppressHydrationWarning  // ← FIX: script ini intentionally berbeda SSR vs client
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}

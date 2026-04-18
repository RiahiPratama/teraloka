'use client';

/**
 * TeraLoka — useTheme() hook
 * Phase 2 · Batch 2a — Theme System
 * ------------------------------------------------------------
 * Hook untuk akses theme state dari komponen apapun.
 * HARUS dipanggil di dalam <ThemeProvider> (wajib di-wrap di root layout).
 *
 * Contoh:
 *   const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme();
 *
 *   // Toggle via button
 *   <button onClick={toggleTheme}>
 *     {resolvedTheme === 'dark' ? '☀️' : '🌙'}
 *   </button>
 *
 *   // Set eksplisit
 *   <button onClick={() => setTheme('system')}>Ikut sistem</button>
 */

import { useContext } from 'react';
import { ThemeContext } from './theme-provider';

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error(
      '[TeraLoka] useTheme() harus dipanggil di dalam <ThemeProvider>. ' +
        'Pastikan ThemeProvider sudah di-mount di src/app/layout.tsx.'
    );
  }
  return ctx;
}

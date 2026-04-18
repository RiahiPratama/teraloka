'use client';

/**
 * TeraLoka — ThemeProvider
 * Phase 2 · Batch 2a — Theme System
 * ------------------------------------------------------------
 * Pure CSS class-based theme system (Tailwind v4 + CSS variables).
 * Menggantikan AdminThemeContext (deprecated, akan dihapus di Batch 7).
 *
 * Cara kerja:
 * 1. ThemeScript (di <head>) apply .dark class ke <html> sebelum hydrate
 *    → no FOUC
 * 2. ThemeProvider di-mount → baca localStorage → sync state
 * 3. setTheme() → update state + localStorage + toggle .dark class
 * 4. Tailwind utility (bg-surface, text-text, bg-bakabar, dll) auto-switch
 *    karena CSS variables di globals.css override di selector .dark
 *
 * Theme modes:
 * - 'light'  → force light
 * - 'dark'   → force dark
 * - 'system' → ikut OS (via matchMedia)
 *
 * LocalStorage keys:
 * - 'teraloka-theme' (new, primary)
 * - 'tl_admin_theme' (legacy, auto-migrated on first read)
 */

import {
  createContext,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** Theme pilihan user: 'light' | 'dark' | 'system' */
  theme: Theme;
  /** Theme aktif setelah resolve 'system': 'light' | 'dark' */
  resolvedTheme: ResolvedTheme;
  /** Set theme eksplisit */
  setTheme: (theme: Theme) => void;
  /** Toggle cepat dark ↔ light (pakai di icon button) */
  toggleTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'teraloka-theme';
const LEGACY_STORAGE_KEY = 'tl_admin_theme';

/* ─── Helpers ─── */

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    // Legacy key migration: 'tl_admin_theme' hanya punya 'light' | 'dark'
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy === 'light' || legacy === 'dark') {
      localStorage.setItem(STORAGE_KEY, legacy);
      return legacy;
    }
  } catch {
    // localStorage bisa throw di mode incognito strict — fallback ke system
  }
  return 'system';
}

function applyThemeClass(resolved: ResolvedTheme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

function resolveTheme(theme: Theme): ResolvedTheme {
  return theme === 'system' ? getSystemTheme() : theme;
}

/* ─── Provider ─── */

export function ThemeProvider({ children }: { children: ReactNode }) {
  // Default 'system' saat SSR & pre-hydration (ThemeScript sudah apply class
  // yg benar ke <html>, jadi gak ada FOUC meski state awal belum sync).
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');
  const [mounted, setMounted] = useState(false);

  // Mount: sinkronkan state dengan localStorage + class di <html>
  useEffect(() => {
    const stored = readStoredTheme();
    const resolved = resolveTheme(stored);
    setThemeState(stored);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
    setMounted(true);
  }, []);

  // Kalau mode 'system', dengarkan perubahan OS theme
  useEffect(() => {
    if (!mounted || theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved: ResolvedTheme = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyThemeClass(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme, mounted]);

  const setTheme = useCallback((next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // strict mode / disabled storage — abaikan, theme tetap apply in-memory
    }
    const resolved = resolveTheme(next);
    setThemeState(next);
    setResolvedTheme(resolved);
    applyThemeClass(resolved);
  }, []);

  const toggleTheme = useCallback(() => {
    // Toggle berbasis resolvedTheme (intuitif: klik = flip visual)
    // Kalau user di 'system', toggle akan lock ke light/dark.
    const next: Theme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(next);
  }, [resolvedTheme, setTheme]);

  return (
    <ThemeContext.Provider
      value={{ theme, resolvedTheme, setTheme, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

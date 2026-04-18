/**
 * TeraLoka — Theme module barrel export
 * Phase 2 · Batch 2a — Theme System
 * ------------------------------------------------------------
 * Import dari satu tempat:
 *   import { ThemeProvider, useTheme, type Theme } from '@/lib/theme';
 */

export { ThemeProvider, ThemeContext } from './theme-provider';
export type { Theme, ResolvedTheme } from './theme-provider';
export { useTheme } from './use-theme';

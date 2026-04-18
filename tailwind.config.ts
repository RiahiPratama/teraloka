import type { Config } from 'tailwindcss'

/**
 * TeraLoka — Tailwind v4 config
 * Phase 2 · Batch 1 — Design Foundation
 * ------------------------------------------------------------
 * Di Tailwind v4, design tokens (colors, fonts, spacing) hidup di
 * `@theme` directive di dalam globals.css — bukan di config file ini.
 * File ini cuma declare `content` paths untuk content scanning.
 *
 * CATATAN:
 * - Dulu ada `colors.primary: '#3525cd'` (ungu) di sini yang conflict
 *   sama brand teal `#003526` di @theme. Sudah dihapus — satu source
 *   of truth di globals.css.
 * - Dark mode variant sudah di-define via `@custom-variant dark` di
 *   globals.css. Pakai class `dark` pada <html>.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  plugins: [],
}

export default config

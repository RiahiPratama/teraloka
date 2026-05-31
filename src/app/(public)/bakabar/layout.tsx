import BakabarHeader from '@/components/bakabar/BakabarHeader'

// ════════════════════════════════════════════════════════════════
// BAKABAR LAYOUT (31 Mei 2026 — v4 fix double-ticker gap)
// PATH: src/app/(public)/bakabar/layout.tsx
// ────────────────────────────────────────────────────────────────
// v4 FIX (31 Mei 2026) — GAP 36px hero vs skyscraper:
//   AKAR: <Ticker /> dirender DUA KALI.
//     1. (public)/layout.tsx (parent) — global single-source-of-truth.
//     2. layout INI (child) — DUPLIKAT (leftover sebelum global aktif).
//   Tiap Ticker punya spacer in-flow 36px. Dua render = 72px spacer.
//   Reserve benar = ticker(36) + header(56) = 92px. Tapi:
//     global ticker spacer(36) + paddingTop override(56) = 92 ✓
//     + ticker DUPLIKAT spacer(36) = 128 → KELEBIHAN 36px = gap.
//   SOLUSI: HAPUS <Ticker /> duplikat dari sini. Global ticker
//   (parent) tetap tampil di semua public page termasuk bakabar.
//   Scoped ke bakabar — TIDAK menyentuh (public)/layout (shared).
//
// v3 (29 Mei): Override parent paddingTop 72 → 56 (sync BakabarHeader
//   height 56) + hide Navbar global. (DIPERTAHANKAN.)
// ════════════════════════════════════════════════════════════════

export default function BakabarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide Navbar global (yang di-render parent (public)/layout) */
        body:has([data-bakabar-route]) header:not([data-bakabar-header] header) {
          display: none !important;
        }
        /* Override parent paddingTop 72 → 56 untuk sync BakabarHeader bottom.
           (ticker spacer 36 + 56 = 92 = bawah header fixed) */
        body:has([data-bakabar-route]) > div[style*="padding-top: 72"],
        body:has([data-bakabar-route]) > div[style*="padding-top:72"] {
          padding-top: 56px !important;
        }
      `}} />

      <div data-bakabar-route style={{ display: 'none' }} aria-hidden="true" />

      {/* v4: <Ticker /> DIHAPUS — global ticker dari (public)/layout sudah
          tampil di semua public page. Render kedua = duplikat (gap 36px). */}

      <div data-bakabar-header>
        <BakabarHeader />
      </div>

      {children}
    </>
  )
}

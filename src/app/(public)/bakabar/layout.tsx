import Ticker from '@/components/layout/Ticker'
import BakabarHeader from '@/components/bakabar/BakabarHeader'

// ════════════════════════════════════════════════════════════════
// BAKABAR LAYOUT (29 Mei 2026 — v3 close gap)
// PATH: src/app/(public)/bakabar/layout.tsx
// ────────────────────────────────────────────────────────────────
// Fix gap besar antara CategoryTabs dan content BakabarPage:
//   - Parent (public)/layout punya <div paddingTop:72> wrapping
//     CategoryTabs + main → reserved space untuk Navbar global lama
//   - Bakabar layout v2 sebelumnya tambah <div paddingTop:56> sendiri
//   - TOTAL gap = 72 + 56 = 128px MATI
//
// Solusi v3:
//   1. Override parent paddingTop via CSS [style*="padding-top"]
//      from 72 → 56 (sesuai BakabarHeader height)
//   2. HAPUS wrapper <div paddingTop:56> dari Bakabar layout — sudah
//      diakomodasi oleh parent override
//   3. Hide global Navbar (existing rule)
// ════════════════════════════════════════════════════════════════

export default function BakabarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide Navbar global (yang di-render parent (public)/layout) */
        body:has([data-bakabar-route]) header:not([data-bakabar-header] header) {
          display: none !important;
        }
        /* Override parent paddingTop 72 → 56 untuk sync BakabarHeader bottom */
        body:has([data-bakabar-route]) > div[style*="padding-top: 72"],
        body:has([data-bakabar-route]) > div[style*="padding-top:72"] {
          padding-top: 56px !important;
        }
      `}} />

      <div data-bakabar-route style={{ display: 'none' }} aria-hidden="true" />

      <Ticker />

      <div data-bakabar-header>
        <BakabarHeader />
      </div>

      {children}
    </>
  )
}

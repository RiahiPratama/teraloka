import BakabarHeader from '@/components/bakabar/BakabarHeader'

// ════════════════════════════════════════════════════════════════
// BAKABAR LAYOUT (WS-5d — 13 Jun 2026: fix gap header↔tabs + sticky)
// PATH: src/app/(public)/bakabar/layout.tsx
// ────────────────────────────────────────────────────────────────
// WS-5d (13 Jun 2026) — 2 fix, scoped bakabar-only (:has([data-bakabar-route])):
//
//   1. GAP 16px header↔CategoryTabs:
//      `bk-chrome-pad` (di ConditionalChrome) punya inline paddingTop:72.
//      Override lama pakai selector `> div[style*=padding-top:72]` GAGAL —
//      bk-chrome-pad bukan anak LANGSUNG body (ke-nest di PublicChrome).
//      → Target by CLASS `.bk-chrome-pad`. Ticker spacer 36 + 56 = 92 =
//        bawah BakabarHeader fixed (top:36 h:56) → flush, no gap.
//
//   2. STICKY CategoryTabs lepas saat scroll:
//      CategoryTabs (sticky top:92) dibungkus `.bk-chrome-top` yang PENDEK
//      + sibling <main>. Sticky cuma nempel dalam batas parent → parent
//      kependekan → lepas. `display:contents` hapus box pembungkus →
//      parent sticky jadi `.bk-chrome-pad` (tinggi, span page) → sticky hidup.
//      AMAN: `.bk-chrome-top` gak punya style visual (cuma hook hide
//      immersive di globals.css; bakabar NON-immersive).
//
//   🛡️ ConditionalChrome (shared semua route public) TIDAK disentuh.
//
// v4 PRIOR (31 Mei): hapus <Ticker /> duplikat (global ticker sudah tampil).
// v3 (29 Mei): hide Navbar global + sync header height. (DIPERTAHANKAN.)
// ════════════════════════════════════════════════════════════════

export default function BakabarLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Hide Navbar global (di-render parent (public)/layout) — pakai
           BakabarHeader sebagai gantinya. (DIPERTAHANKAN dari v3.) */
        body:has([data-bakabar-route]) header:not([data-bakabar-header] header) {
          display: none !important;
        }

        /* FIX GAP (WS-5d): override paddingTop bk-chrome-pad 72 -> 56.
           Target by CLASS (selector lama div anak-langsung-body gagal:
           bk-chrome-pad ke-nest, bukan anak langsung body).
           36 (ticker spacer) + 56 = 92 = bawah header. */
        body:has([data-bakabar-route]) .bk-chrome-pad {
          padding-top: 56px !important;
        }

        /* FIX STICKY (WS-5d): hapus box wrapper .bk-chrome-top (pendek)
           → parent sticky CategoryTabs jadi .bk-chrome-pad (span page)
           → sticky top:92 nempel beneran saat scroll. */
        body:has([data-bakabar-route]) .bk-chrome-pad > .bk-chrome-top {
          display: contents;
        }
      `}} />

      <div data-bakabar-route style={{ display: 'none' }} aria-hidden="true" />

      <div data-bakabar-header>
        <BakabarHeader />
      </div>

      {children}
    </>
  )
}

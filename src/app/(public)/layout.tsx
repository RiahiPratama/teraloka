import Ticker from '@/components/layout/Ticker'
import Navbar from '@/components/layout/Navbar'
import CategoryTabs from '@/components/layout/CategoryTabs'
import Footer from '@/components/layout/Footer'
import Fab from '@/components/layout/Fab'

// ════════════════════════════════════════════════════════════════
// PUBLIC LAYOUT
// ────────────────────────────────────────────────────────────────
// Layout untuk semua public-facing pages (kampanye, laporan, news, dll).
//
// History:
//   - 7 Mei 2026: HAPUS <BottomNav /> hardcoded — delegated ke
//     ConditionalBottomNav di root layout (single source of truth).
//
// Mengapa hapus dari sini:
//   - <BottomNav /> hardcoded di sini OVERRIDE ConditionalBottomNav root
//   - FOCUS_MODE_PATTERNS (/donate, /konfirmasi, /terima-kasih) gak fire
//     karena BottomNav tetap render dari layout (public) ini
//   - Result: tombol CTA "Konfirmasi Donasi" ke-overlap BottomNav,
//     user GAK BISA submit donasi (revenue blocker)
//
// Architectural lock:
//   - ConditionalBottomNav di root layout = SINGLE SOURCE OF TRUTH
//   - Layout group (public/owner/dll) JANGAN render BottomNav langsung
// ════════════════════════════════════════════════════════════════

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Ticker />
      <Navbar />
      <div style={{ paddingTop: 72 }}>
        <CategoryTabs />
        {/* pb-nav: padding bawah di mobile agar konten tidak ketutupan BottomNav */}
        <main className="pb-nav">{children}</main>
      </div>
      <Footer />
      <Fab />
      {/* <BottomNav /> dihandle di src/app/layout.tsx via <ConditionalBottomNav /> */}
    </>
  )
}

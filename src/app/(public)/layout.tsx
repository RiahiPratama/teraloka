import Navbar from '@/components/layout/Navbar'
import CategoryTabs from '@/components/bakabar/CategoryTabs'
import Footer from '@/components/layout/Footer'
import Fab from '@/components/layout/Fab'

// ════════════════════════════════════════════════════════════════
// PUBLIC LAYOUT
// ────────────────────────────────────────────────────────────────
// Layout untuk semua public-facing pages.
//
// History:
//   - 7 Mei 2026: HAPUS <BottomNav /> hardcoded (delegated ke ConditionalBottomNav)
//   - 15 Mei 2026 (Batch B): RETIRE <Ticker /> scrolling marquee
//   - 15 Mei 2026 (Batch B v5a — Folder Refactor):
//     Import CategoryTabs path update:
//       FROM: '@/components/layout/CategoryTabs'
//       TO:   '@/components/bakabar/CategoryTabs'
//     Per Pattern (XX) Semantic Folder Match Domain Scope.
//     CategoryTabs cuma render di /bakabar — semantic-nya BAKABAR-domain,
//     bukan global layout. Co-located dengan PrayerBreakingBar di bakabar/.
//
// Folder convention LOCKED:
//   - src/components/layout/ = persistent global UI (Navbar, Footer, Fab, BottomNav)
//   - src/components/bakabar/ = BAKABAR-spec UI (CategoryTabs, PrayerBreakingBar, etc)
//
// Architectural lock:
//   - ConditionalBottomNav di root layout = SINGLE SOURCE OF TRUTH for BottomNav
//   - Layout group (public/owner/dll) JANGAN render BottomNav langsung
// ════════════════════════════════════════════════════════════════

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* <Ticker /> RETIRED 15 Mei Batch B. PrayerBreakingBar di-render INSIDE 
          CategoryTabs (BAKABAR-spec, sticky bareng). */}
      <Navbar />
      <div style={{ paddingTop: 72 }}>
        <CategoryTabs />
        <main className="pb-nav">{children}</main>
      </div>
      <Footer />
      <Fab />
      {/* <BottomNav /> dihandle di src/app/layout.tsx via <ConditionalBottomNav /> */}
    </>
  )
}

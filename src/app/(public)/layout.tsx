import Ticker from '@/components/layout/Ticker'
import Navbar from '@/components/layout/Navbar'
import CategoryTabs from '@/components/bakabar/CategoryTabs'
import Footer from '@/components/layout/Footer'
import { RegionProvider } from '@/contexts/RegionContext'
import { RegionPickerModal } from '@/components/public/RegionPicker'
import { PublicChrome } from '@/components/layout/ConditionalChrome'

// ════════════════════════════════════════════════════════════════
// PUBLIC LAYOUT (Server Component)
// ────────────────────────────────────────────────────────────────
// Chrome (Ticker/Navbar/CategoryTabs/Footer) di-render DI SINI (server)
// lalu dioper sebagai PROPS ke <PublicChrome> (client). Pola resmi
// Next.js: Server Component → props ke Client Component. PublicChrome
// hanya mengatur tampil/sembunyi (immersive slug, mobile-only via CSS).
//
// ⚠️ JANGAN import Ticker/Navbar/Footer ke dalam PublicChrome — mereka
//    async Server Components; di-import ke client → error "async Client
//    Component". Harus dioper sebagai props dari sini.
//
// History:
//   - 7 Mei 2026: HAPUS <BottomNav /> hardcoded (→ ConditionalBottomNav)
//   - 15 Mei 2026: CategoryTabs path → '@/components/bakabar/CategoryTabs'
//   - 16 Mei 2026: ADD <RegionProvider> + <RegionPickerModal />
//   - 30 Mei 2026: <Ticker /> RE-ACTIVATED
//   - 10 Jun 2026: <Fab /> retired (slot → <SosFab />)
//   - 12 Jun 2026: chrome → <PublicChrome> (immersive slug, server-via-props)
//
// Architectural lock:
//   - ConditionalBottomNav (root) = SSOT BottomNav
//   - PublicChrome (here)          = SSOT chrome atas + footer public
// ════════════════════════════════════════════════════════════════

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <RegionProvider>
      <PublicChrome
        topChrome={<><Ticker /><Navbar /></>}
        categoryTabs={<CategoryTabs />}
        footer={<Footer />}
      >
        {children}
      </PublicChrome>

      {/* Region Picker Modal — global */}
      <RegionPickerModal />

      {/* <BottomNav /> dihandle di src/app/layout.tsx via <ConditionalBottomNav /> */}
    </RegionProvider>
  )
}

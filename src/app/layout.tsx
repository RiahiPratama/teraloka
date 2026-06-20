import type { Metadata, Viewport } from 'next'
import { Lora, Inter, Sora, Plus_Jakarta_Sans, Outfit } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'
import { ThemeScript } from '@/components/providers/theme-script'
import { DevConsoleFilter } from '@/components/providers/dev-console-filter'
import { AuthProvider } from '@/components/providers/AuthProvider'
import { PostHogProvider } from '@/components/providers/PostHogProvider'
import { ToastProvider } from '@/components/ui/Toast'
import { ModalProvider } from '@/components/providers/ModalProvider'
import ConditionalBottomNav from '@/components/layout/ConditionalBottomNav'
import { SosFab } from '@/components/balapor/sos-fab' // ← Day 12 Step 6 (10 Mei 2026)
import { SosLiftProvider } from '@/components/providers/SosLiftProvider'

// ════════════════════════════════════════════════════════════════
// FONT LOADING — next/font/google (29 Mei 2026)
// ────────────────────────────────────────────────────────────────
// PERF FIX KOMPLET: SEMUA 5 font keluarga (Sora, Plus Jakarta Sans,
// Outfit, Lora, Inter) self-hosted via next/font. Total Google Fonts
// CDN request: ZERO.
//
// Sebelumnya (28 Mei):
//   - globals.css @import: Sora + Plus Jakarta + Outfit + Lora (CDN)
//   - bakabar/page.tsx @import: Lora FULL weight 400-800 + italic (3.9 MB)
//   - bakabar/[slug]/page.tsx @import: Lora + Inter (CDN duplicate)
//   - bakabar/sponsored/[slug]/page.tsx @import: Lora + Inter (CDN duplicate)
//   = 4 lokasi @import, font duplikat load, render-blocking, 17.5s DCL
//
// Sekarang (29 Mei):
//   - SEMUA via next/font/google self-hosted
//   - Variable diekspos via <html className> — accessible everywhere via
//     var(--font-sora), var(--font-jakarta), dst.
//   - Globals.css @theme tokens TETAP intact (Tailwind v4 utility class
//     generation depends on them; nilainya jadi fallback kalau next/font
//     gagal load, walaupun seharusnya gak akan)
//   - body + h1-h4 rule di globals.css di-update pakai var(--font-*)
//     supaya literal 'Plus Jakarta Sans' / 'Sora' gak fallback ke system
//     font (karena CDN @import dihapus)
//
// Weight subset per actual usage di codebase:
//   - Sora:    400, 600, 700, 800 (headlines h1-h4)
//   - Jakarta: 300, 400, 500, 600, 700 (body default + utility)
//   - Outfit:  400, 500, 600, 700 (admin dashboard accent)
//   - Lora:    400, 500, 600, 700 normal + 400, 500 italic (editorial article)
//   - Inter:   400, 500, 600 (slug page rule .article-body sibling)
//
// Expected impact: 4 CDN request → 0. ~3.9 MB → ~250-400 KB total fonts.
// Zero CLS via font-display swap + size-adjust automatic.
// ════════════════════════════════════════════════════════════════

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800'],
  display: 'swap',
  variable: '--font-sora',
  fallback: ['system-ui', 'sans-serif'],
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-jakarta',
  fallback: ['system-ui', 'sans-serif'],
})

const outfit = Outfit({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-outfit',
  fallback: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
})

const lora = Lora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
  display: 'swap',
  variable: '--font-lora',
  fallback: ['Georgia', 'serif'],
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  variable: '--font-inter',
  fallback: ['system-ui', 'sans-serif'],
})

export const metadata: Metadata = {
  title: 'TeraLoka — Gerbang Digital Maluku Utara',
  description: 'Platform digital super app untuk warga Maluku Utara: berita lokal, transportasi laut, kos & properti, donasi kemanusiaan.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TeraLoka',
  },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#003526',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning di <html>: ThemeScript modify class sebelum
    // React hydrate — tanpa flag ini React bakal warning ketidakcocokan
    // class antara server-render vs DOM actual.
    //
    // className `${sora.variable} ${jakarta.variable} ...` mengekspos CSS var
    // --font-sora, --font-jakarta, --font-outfit, --font-lora, --font-inter
    // ke seluruh DOM tree (self-hosted via next/font, no external request).
    <html
      lang="id"
      suppressHydrationWarning
      className={`${sora.variable} ${jakarta.variable} ${outfit.variable} ${lora.variable} ${inter.variable}`}
    >
      <head>
        {/* DevConsoleFilter HARUS first di <head> supaya module-level
            side effect (filter console.error) aktif sebelum React 19 emit
            false-positive warning untuk ThemeScript <script> tag.
            Render null (no DOM output), dev-mode only, production noop.
            Track: TD-REACT19-001 — remove kalau React 19 patch warning ini. */}
        <DevConsoleFilter />

        {/* ThemeScript di <head> supaya execute sebelum paint → no FOUC
            pada page load. Anti-flicker baik di light maupun dark.
            React 19 warn false-positive di dev console — handled oleh
            DevConsoleFilter di atas. */}
        <ThemeScript />

        {/* Material Symbols icon font — AXIS SUBSET (TD-PERF-004, 13 Jun 2026).
            Strategi: pangkas RANGE AXIS (biang gembung 3.8 MB), BUKAN icon_names.
            Alasan: icon dipakai tersebar (literal + config 70+ + fungsi dinamis
            spt facIcon yg return shower/kitchen/tv/dll) → whitelist icon_names
            RAPUH (kelewat = kotak kosong senyap di layanan manapun). Axis-only
            jaga SEMUA icon hidup utk seluruh app (BAKABAR/BALAPOR/BADONASI/
            BALAJU/BAKOS) sambil tetap hemat besar.
            @24,400,0..1,0 = opsz 24, wght 400, FILL 0..1 (star/favorite terisi),
            GRAD 0. Dari range penuh (opsz 20..48 × wght 100..700 × FILL 0..1 ×
            GRAD -50..200) → 1 set. Hasil: 3.8 MB → ~445 KB.
            display=swap (13 Jun): font TAK render-blocking → LCP turun. Icon
            mungkin flicker sesaat saat load pertama (kotak→icon), tapi trade-off
            worth utk LCP. Kalau flicker ganggu, balik ke block. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0&display=swap"
          rel="stylesheet"
        />

        {/* PERF (4 Jun 2026, WS-5c): preconnect ke Supabase Storage.
            Gambar artikel di-serve dari domain TERPISAH (lhga...supabase.co),
            BUKAN vercel.app. Tanpa ini, browser baru buka koneksi DNS+TCP+TLS
            saat <img> ketemu di body → Lighthouse: LCP "resource load delay"
            2.1 dtk. preconnect TANPA crossOrigin (match <img> biasa no-cors,
            cegah double-fetch). Global di root = reader + archive ikut dapet. */}
        <link rel="preconnect" href="https://lhgabgslspfnnnhpmvmg.supabase.co" />
        <link rel="dns-prefetch" href="https://lhgabgslspfnnnhpmvmg.supabase.co" />
      </head>
      <body suppressHydrationWarning={true}>
        {/* Provider order (outer to inner):
            - PostHogProvider: track semua (anonymous + authenticated)
            - ThemeProvider: theme available di semua page
            - AuthProvider: auth context untuk authenticated features
            - ToastProvider: global toast notification system
            - ModalProvider: global modal counter (BottomNav auto-hide saat modal open)

            Note: Suspense wrapping ditangani di dalam PostHogProvider sendiri
            kalau butuh (saat pakai useSearchParams). Simplified di sini.

            ModalProvider HARUS membungkus {children} DAN <ConditionalBottomNav />
            karena both side perlu akses state — modal (registerModal) dan
            BottomNav (isAnyModalOpen).

            SosFab juga di mount di sini sebagai sibling — visible di SEMUA
            pages (panic button always-on, Day 12 Step 6, 10 Mei 2026). */}
        <PostHogProvider>
          <ThemeProvider>
            <AuthProvider>
              <ToastProvider>
                <ModalProvider>
                  <SosLiftProvider>
                    {children}
                    <ConditionalBottomNav />
                    <SosFab />
                  </SosLiftProvider>
                </ModalProvider>
              </ToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </PostHogProvider>
      </body>
    </html>
  )
}

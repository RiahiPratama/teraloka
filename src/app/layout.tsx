import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ThemeProvider } from '@/lib/theme'
import { ThemeScript } from '@/components/providers/theme-script'
import { AuthProvider } from '@/components/providers/AuthProvider'
import ConditionalBottomNav from '@/components/layout/ConditionalBottomNav'

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
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* ThemeScript harus di awal <head> supaya execute sebelum paint →
            no FOUC pada page load. Anti-flicker baik di light maupun dark. */}
        <ThemeScript />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning={true}>
        {/* ThemeProvider di luar AuthProvider:
            theme harus available di page non-authed (login, landing) juga. */}
        <ThemeProvider>
          <AuthProvider>
            {children}
            <ConditionalBottomNav />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

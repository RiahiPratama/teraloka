import type { Metadata, Viewport } from 'next'
import './globals.css'
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
    <html lang="id">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
          rel="stylesheet"
        />
      </head>
      <body suppressHydrationWarning={true}>
        <AuthProvider>
          {children}
          <ConditionalBottomNav />
        </AuthProvider>
      </body>
    </html>
  )
}

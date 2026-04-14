import type { Metadata } from 'next'
import './globals.css'
import { AuthProvider } from '@/components/providers/AuthProvider'

export const metadata: Metadata = {
  title: 'TeraLoka — Gerbang Digital Maluku Utara',
  description: 'Platform digital super app untuk warga Maluku Utara: berita lokal, transportasi laut, kos & properti, donasi kemanusiaan.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body suppressHydrationWarning={true}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

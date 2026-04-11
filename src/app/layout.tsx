import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Header } from '@/components/layout/header';
import { Ticker } from '@/components/layout/ticker';
import { BottomNav } from '@/components/layout/bottom-nav';

export const metadata: Metadata = {
  title: 'TeraLoka — Super App Maluku Utara',
  description: 'Semua yang kamu butuhkan di Maluku Utara, ADA di sini.',
  manifest: '/manifest.json',
  icons: { apple: '/icons/icon-192.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#1B6B4A',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className="min-h-screen bg-background text-foreground">
        <Header />
        <Ticker />
        <main className="pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}

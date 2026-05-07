/**
 * (citizen) Route Group — Layout (Server Component)
 * ------------------------------------------------------------
 * Layout untuk halaman citizen-specific yang butuh user login (any role).
 *
 * Architecture:
 *   - Layout = Server Component (NO 'use client') — bisa render Ticker (async SC)
 *   - Auth guard = Client Component (./AuthGuard) — pakai useAuth hook
 *   - Pattern konsisten dengan (public)/* yang juga Server Component
 *
 * Filosofi: Server layout + Client auth boundary
 *   - Halaman di dalam (citizen)/* OTOMATIS dilindungi auth check
 *   - Tidak perlu copy-paste useAuth+redirect di tiap page
 *   - Future page tinggal drop in, security otomatis applied
 *   - Chrome (Ticker + Navbar) konsisten dengan (public)/*
 *
 * Pages saat ini (7 Mei 2026):
 *   - /my-reports    → list laporan BALAPOR pelapor
 *   - /my-donations  → riwayat donasi donatur
 *
 * Cocok untuk citizen-specific aja:
 *   - JANGAN masukin /profile (universal, multi-role page)
 *   - JANGAN masukin /owner, /operator, /office, /admin (role-specific groups)
 *
 * Auth strategy: Client-side guard via AuthGuard component.
 * Future: bisa migrate ke server-side check via httpOnly cookie (TD-017).
 *
 * Layout chrome (match public/* pattern):
 *   - <Ticker />            : breaking news strip top (height ~36px, async SC)
 *   - <Navbar />            : 5 layanan TeraLoka (positioned top-[44/52px])
 *   - paddingTop: 72        : push content below Navbar+Ticker
 *   - <main pb-nav>         : bottom padding mobile (BottomNav floating)
 *   - <AuthGuard>           : client-side auth check + redirect
 *   - SKIP CategoryTabs, Footer, Fab — citizen pages = focused user activity
 *
 * History:
 *   - 7 Mei 2026: bikin group baru (Sprint 1B atomic addition)
 *   - 7 Mei 2026 (Sub-Sprint 1C-B.3): refactor untuk fix navigation issue
 *     - Layout pisah jadi Server Component (chrome) + Client AuthGuard (auth)
 *     - Sebelumnya layout 'use client' bikin error: Ticker async SC tidak
 *       bisa dirender dari Client Component.
 *     - Pattern sekarang konsisten dengan (public)/* yang juga Server Component.
 */

import Ticker from '@/components/layout/Ticker';
import Navbar from '@/components/layout/Navbar';
import AuthGuard from './AuthGuard';

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Ticker />
      <Navbar />
      <div style={{ paddingTop: 72 }}>
        {/* pb-nav: padding bawah di mobile agar konten tidak ketutupan BottomNav */}
        <main className="pb-nav">
          <AuthGuard>{children}</AuthGuard>
        </main>
      </div>
    </>
  );
}

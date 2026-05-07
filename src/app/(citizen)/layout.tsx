'use client';

/**
 * (citizen) Route Group — Shared Auth Guard
 * ------------------------------------------------------------
 * Layout untuk halaman citizen-specific yang butuh user login (any role).
 *
 * Filosofi: Security via folder structure
 *   - Halaman di dalam (citizen)/* OTOMATIS dilindungi auth check
 *   - Tidak perlu copy-paste useAuth+redirect di tiap page
 *   - Future page tinggal drop in, security otomatis applied
 *
 * Pages saat ini (7 Mei 2026):
 *   - /my-reports    → list laporan BALAPOR pelapor
 *   - /my-donations  → riwayat donasi donatur
 *
 * Cocok untuk citizen-specific aja:
 *   - JANGAN masukin /profile (universal, multi-role page)
 *   - JANGAN masukin /owner, /operator, /office, /admin (role-specific groups)
 *
 * Auth strategy: Client-side guard via useAuth hook (match existing pattern).
 * Future: bisa migrate ke server-side check via httpOnly cookie (TD-017).
 *
 * History:
 *   - 7 Mei 2026: bikin group baru (Sprint 1B atomic addition)
 *     - Migrate /my-reports + /profile/donations → /my-donations
 *     - Hapus folder kosong src/app/(auth)/
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function CitizenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Tunggu auth state ready dulu (avoid premature redirect saat refresh page)
    if (isLoading) return;

    // User belum login → redirect ke login dengan redirect-back param
    if (!user) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [user, isLoading, router, pathname]);

  // Loading state — tunggu auth check selesai
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-balapor" />
          <p className="text-sm text-gray-500">Memuat...</p>
        </div>
      </div>
    );
  }

  // Anonymous — render null while redirect in progress
  // (useEffect di atas akan trigger redirect ke /login)
  if (!user) {
    return null;
  }

  // Authenticated — render page content
  return <>{children}</>;
}

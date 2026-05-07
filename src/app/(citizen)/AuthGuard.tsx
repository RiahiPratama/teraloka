'use client';

/**
 * (citizen) Route Group — Auth Guard (Client Component)
 * ------------------------------------------------------------
 * Auth check + redirect logic untuk citizen pages.
 *
 * Dipisah dari CitizenLayout supaya:
 *   - CitizenLayout bisa Server Component (render async Ticker)
 *   - Auth logic tetap Client Component (pakai useAuth hook)
 *
 * Pattern: Server layout + Client boundary.
 *
 * History:
 *   - 7 Mei 2026 (Sub-Sprint 1C-B.3): split dari layout.tsx
 *     untuk resolve "Ticker async Client Component" error.
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function AuthGuard({
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
      <div className="flex min-h-[60vh] items-center justify-center">
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

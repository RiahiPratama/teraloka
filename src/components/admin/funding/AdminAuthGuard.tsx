'use client';

/**
 * AdminAuthGuard — Reusable wrapper untuk halaman admin BADONASI
 *
 * Mengecek 3 hal:
 *   1. Auth loading? → tampilkan spinner
 *   2. Belum login? → redirect ke /login dengan return URL
 *   3. Login tapi role bukan super_admin/admin_funding? → tampilkan "Akses Ditolak"
 *
 * Cara pakai:
 *   return (
 *     <AdminAuthGuard>
 *       <div>...halaman admin content...</div>
 *     </AdminAuthGuard>
 *   );
 *
 * Reference pattern: AppAdminFundingSettingpage + AppAdminFundingDonationsIDpage
 * Filosofi: WAJAH (frontend) sebagai layer pertahanan kedua.
 *           Backend tetap source of truth untuk auth (JWT validation).
 */

import { useEffect, useContext } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { AdminThemeContext } from '@/components/admin/AdminThemeContext';

const ADMIN_ROLES = ['super_admin', 'admin_funding'];

// ── Icons ─────────────────────────────────────────────────────
const Icons = {
  Loader: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ animation: 'spin 1s linear infinite' }}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Alert: () => (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  ),
};

interface Props {
  children: React.ReactNode;
}

export default function AdminAuthGuard({ children }: Props) {
  const { user, isLoading: authLoading } = useAuth();
  const { t } = useContext(AdminThemeContext);
  const router = useRouter();
  const pathname = usePathname();

  // ─── Redirect kalau belum login ────────────────────────────
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      const redirectUrl = pathname ? `/login?redirect=${encodeURIComponent(pathname)}` : '/login';
      router.push(redirectUrl);
    }
  }, [user, authLoading, pathname, router]);

  // ─── Loading state ─────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.textDim,
      }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        <Icons.Loader />
      </div>
    );
  }

  // ─── Belum login → null sambil redirect (avoid flash) ──────
  if (!user) return null;

  // ─── Login tapi role salah → Denied screen ─────────────────
  if (!ADMIN_ROLES.includes(user.role)) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}>
        <div style={{
          maxWidth: 400,
          background: t.mainBg,
          border: `1px solid ${t.sidebarBorder}`,
          borderRadius: 16,
          padding: 32,
          textAlign: 'center',
        }}>
          <div style={{
            margin: '0 auto 16px',
            width: 56, height: 56, borderRadius: '50%',
            background: 'rgba(239,68,68,0.1)',
            color: '#EF4444',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icons.Alert />
          </div>
          <h2 style={{
            fontSize: 18, fontWeight: 800,
            color: t.textPrimary,
            marginBottom: 8,
          }}>
            Akses Ditolak
          </h2>
          <p style={{
            fontSize: 13,
            color: t.textDim,
            lineHeight: 1.5,
            marginBottom: 20,
          }}>
            Halaman ini hanya dapat diakses oleh super admin atau admin funding.
            Hubungi pengelola TeraLoka jika Anda merasa ini adalah kesalahan.
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              padding: '10px 20px',
              background: '#EC4899',
              color: '#fff',
              fontSize: 13,
              fontWeight: 700,
              borderRadius: 10,
              textDecoration: 'none',
            }}
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    );
  }

  // ─── Auth OK → render children ─────────────────────────────
  return <>{children}</>;
}

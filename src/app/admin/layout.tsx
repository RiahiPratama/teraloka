'use client';

/**
 * TeraLoka — Admin Layout (ROOT)
 * Phase 2 · Batch 5c — Layout Shell
 * ------------------------------------------------------------
 * Rewrite lengkap dari admin layout lama. Mempreserve semua behavior
 * kritikal + compose komponen sidebar/header baru dari Batch 5a/5b/5c.
 *
 * ┌─ PRESERVED BEHAVIORS ───────────────────────────────────────
 * │ ✓ Auth guard: redirect /login?redirect=/admin kalau tidak authed
 * │ ✓ admin_content role: auto-redirect ke /office/newsroom/bakabar
 * │ ✓ BAKABAR portal pass-through: /office/newsroom/bakabar/* gak pakai
 * │   admin shell, langsung children (portal punya layout sendiri)
 * │ ✓ Loading state saat isLoading
 * │ ✓ Fetch /admin/stats untuk MissionControl + BAKABAR badge
 * │ ✓ Token dari useAuth
 * └─────────────────────────────────────────────────────────────
 *
 * ┌─ NEW (Batch 5a/5b/5c composition) ──────────────────────────
 * │ + Sidebar container (drawer mobile via sidebarOpen state)
 * │ + SidebarBrand (logo gradient + sunrise dot)
 * │ + SidebarSearch (⌘K placeholder)
 * │ + SidebarMissionControl (compact, fetches shared stats)
 * │ + SidebarNav (20 services, 7 groups, BAKABAR dropdown)
 * │ + SidebarTeamLive (current user online)
 * │ + SidebarProfile (avatar + logout)
 * │ + HeaderBar (date, theme toggle, API live)
 * └─────────────────────────────────────────────────────────────
 *
 * ┌─ MIGRATION BRIDGE ──────────────────────────────────────────
 * │ Pages lama (users, reports, listings, ads) masih import
 * │ AdminThemeContext dari @/components/admin/AdminThemeContext.
 * │ Layout ini WRAP children dengan AdminThemeContext.Provider,
 * │ sinkronin dark/t dari useTheme() hook baru → pages lama tetap
 * │ dapat theme values yang benar tanpa perubahan apa-apa.
 * │
 * │ AdminThemeContext akan di-deprecate resmi di Session 10+
 * │ setelah semua page migrasi ke CSS variables baru.
 * └─────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import {
  AdminThemeContext,
  DARK_THEME,
  LIGHT_THEME,
} from '@/components/admin/AdminThemeContext';
import { Sidebar, SidebarScrollArea } from '@/components/layout/admin/sidebar';
import { SidebarBrand } from '@/components/layout/admin/sidebar-brand';
import { SidebarSearch } from '@/components/layout/admin/sidebar-search';
import { SidebarMissionControl } from '@/components/layout/admin/sidebar-mission-control';
import { SidebarNav } from '@/components/layout/admin/sidebar-nav';
import { SidebarTeamLive } from '@/components/layout/admin/sidebar-team-live';
import { SidebarProfile } from '@/components/layout/admin/sidebar-profile';
import { HeaderBar } from '@/components/layout/admin/header-bar';

const API =
  process.env.NEXT_PUBLIC_API_URL ?? 'https://teraloka-api.vercel.app/api/v1';

/* ─── AdminStats shape (subset dari /admin/stats response) ─── */

interface AdminStats {
  users?: { total: number };
  listings?: { total: number; pending: number };
  articles?: { total: number; draft: number };
  campaigns?: { total: number; pending: number };
  reports?: { total: number; pending: number };
}

/* ─── Component ─── */

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, token, isLoading, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);

  // ── Auth guards (preserve dari layout lama) ───────────────
  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login?redirect=/admin');
    }
    if (!isLoading && user && user.role === 'admin_content') {
      if (
        !pathname.startsWith('/office/newsroom/bakabar') &&
        !pathname.startsWith('/admin/rss')
      ) {
        router.replace('/office/newsroom/bakabar');
      }
    }
  }, [user, isLoading, router, pathname]);

  // ── Fetch stats (dipakai MissionControl + BAKABAR badge) ──
  useEffect(() => {
    if (!user || !token) return;
    let cancelled = false;
    fetch(`${API}/admin/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled && d?.success && d?.data) {
          setStats(d.data as AdminStats);
        }
      })
      .catch(() => {
        /* silent — MissionControl akan handle error state sendiri */
      });
    return () => {
      cancelled = true;
    };
  }, [user, token]);

  // ── AdminThemeContext bridge value (backward compat) ──────
  const dark = resolvedTheme === 'dark';
  const adminThemeValue = {
    dark,
    t: dark ? DARK_THEME : LIGHT_THEME,
  };

  // ── Route flags ────────────────────────────────────────────
  // BAKABAR portal punya layout sendiri — admin shell skip total
  const isBakabarPortalRoute =
    pathname === '/office/newsroom/bakabar' ||
    pathname.startsWith('/office/newsroom/bakabar/');

  // ── Loading state (preserve dari layout lama) ─────────────
  if (isLoading) {
    return (
      <div
        className={cn(
          'min-h-screen flex items-center justify-center',
          'bg-background'
        )}
      >
        <div className="text-center">
          <div
            className={cn(
              'mx-auto mb-4',
              'h-12 w-12 rounded-full',
              'border-[3px] border-brand-teal-lighter border-t-transparent',
              'animate-spin'
            )}
          />
          <p className="text-sm text-text-muted">Memuat Admin Portal...</p>
        </div>
      </div>
    );
  }

  // ── Not authed — return null (redirect sudah di-fire) ─────
  if (!user) return null;

  // ── BAKABAR portal pass-through ───────────────────────────
  if (isBakabarPortalRoute) {
    return (
      <AdminThemeContext.Provider value={adminThemeValue}>
        {children}
      </AdminThemeContext.Provider>
    );
  }

  const closeDrawer = () => setSidebarOpen(false);

  return (
    <AdminThemeContext.Provider value={adminThemeValue}>
      <div className="min-h-screen bg-background font-outfit">
        {/* ── SIDEBAR ── */}
        <Sidebar isOpen={sidebarOpen} onClose={closeDrawer}>
          <SidebarBrand />
          <SidebarSearch />
          <SidebarMissionControl stats={stats ?? undefined} />
          <SidebarScrollArea>
            <SidebarNav
              currentPath={pathname ?? '/admin'}
              userRole={user.role}
              draftCount={stats?.articles?.draft ?? 0}
              onNavigate={closeDrawer}
            />
          </SidebarScrollArea>
          <SidebarTeamLive currentUser={{ name: user.name }} />
          <SidebarProfile
            user={{ name: user.name, role: user.role }}
            onLogout={logout}
          />
        </Sidebar>

        {/* ── MAIN ── */}
        <div className="md:ml-[256px] flex flex-col min-h-screen min-w-0">
          <HeaderBar onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-5 md:p-6 overflow-x-hidden">
            {children}
          </main>
        </div>
      </div>
    </AdminThemeContext.Provider>
  );
}

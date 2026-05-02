'use client';

// ════════════════════════════════════════════════════════════════
// OWNER BOTTOM NAV
// ────────────────────────────────────────────────────────────────
// Bottom nav khusus untuk /owner/* section.
// 4 tab: Dashboard, Pencairan, Laporan, Profile
//
// Design: konsisten dengan BottomNav publik (var(--primary), blur,
// safe-area, mobile-only via md:hidden).
//
// Behavior:
//   - Auto-hide saat virtual keyboard muncul
//   - Smart context: kalau di campaign detail, tab Pencairan/Laporan
//     link ke campaign-specific path (/owner/funding/campaigns/[id]/...)
//
// ⭐ REFACTOR May 2, 2026: Domain umbrella /owner/funding/* (schema-based)
//    Konsisten dengan /admin/funding/* dan DB schema funding.
// ════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Banknote, ClipboardList, User } from 'lucide-react';
import { useKeyboardOpen } from '@/utils/pwa-utils';

interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: any;
}

export default function OwnerBottomNav() {
  const pathname = usePathname();
  const keyboardOpen = useKeyboardOpen();

  // Extract campaignId from path if we're in /owner/funding/campaigns/[id]/*
  const campaignMatch = pathname.match(/^\/owner\/funding\/campaigns\/([^/]+)/);
  const campaignId = campaignMatch?.[1];

  const items: NavItem[] = [
    {
      key: 'dashboard',
      label: 'Dashboard',
      href: '/owner',
      icon: LayoutDashboard,
    },
    {
      key: 'pencairan',
      label: 'Pencairan',
      href: campaignId
        ? `/owner/funding/campaigns/${campaignId}/disbursements`
        : '/owner/funding/disbursements',
      icon: Banknote,
    },
    {
      key: 'laporan',
      label: 'Laporan',
      href: campaignId
        ? `/owner/funding/campaigns/${campaignId}/reports`
        : '/owner/funding/reports',
      icon: ClipboardList,
    },
    {
      key: 'profile',
      label: 'Profile',
      href: '/owner/profile',
      icon: User,
    },
  ];

  function isActive(item: NavItem) {
    if (item.key === 'dashboard') {
      // Dashboard active saat: di /owner exact, atau di /owner/funding/campaigns/[id] tanpa sub-path action
      return (
        pathname === '/owner' ||
        (pathname.startsWith('/owner/funding/campaigns/') &&
          !pathname.match(/(disbursements|reports|profile)$/) &&
          !pathname.includes('/disbursements/') &&
          !pathname.includes('/reports/'))
      );
    }
    if (item.key === 'pencairan') return pathname.includes('/disbursements');
    if (item.key === 'laporan')   return pathname.includes('/reports');
    if (item.key === 'profile')   return pathname === '/owner/profile';
    return false;
  }

  // Hide bottom nav saat keyboard muncul
  if (keyboardOpen) return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-light, #E5E7EB)',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.06)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <div className="flex items-center justify-around px-2" style={{ height: 60 }}>
        {items.map(item => {
          const active = isActive(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              href={item.href}
              className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-opacity active:opacity-70"
            >
              <Icon
                size={22}
                style={{ color: active ? 'var(--primary, #003526)' : '#9CA3AF' }}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                style={{
                  fontSize: 10,
                  fontWeight: active ? 700 : 500,
                  color: active ? 'var(--primary, #003526)' : '#9CA3AF',
                  letterSpacing: '0.01em',
                }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

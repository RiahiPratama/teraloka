'use client';

/**
 * TeraLoka — SidebarNav
 * Phase 2 · Batch 5b — Layout Shell (Navigation)
 * Hotfix 2026-04-18: BAKABAR moved to INFORMASI section (first item),
 *                    removed isBakabarAnchor mechanism.
 * ------------------------------------------------------------
 * Organism — renders seluruh nav sidebar dari config NAV_SECTIONS.
 * 7 grup × 20 services sesuai PRD section 3.1.
 *
 * Features:
 * - Role-based filtering (item.roles array check)
 * - Active state detection via pathname matching
 * - BAKABAR dropdown handled special (injected as first child di INFORMASI section)
 * - Path-based active (exact untuk Overview, startsWith untuk lain)
 * - Grouped sections dengan divider optional
 *
 * Contoh:
 *   <SidebarNav
 *     currentPath={pathname}
 *     userRole={user.role}
 *     draftCount={stats?.articles?.draft}
 *     onNavigate={closeMobileDrawer}
 *   />
 *
 * NOTE: Link destination untuk service yg belum implement full admin page
 * akan di-route ke halaman yg ada (mis BADONASI → /admin/funding) atau
 * ke placeholder /admin/coming-soon (dibuat di Batch 6).
 */

import { useMemo, type ReactNode } from 'react';
import {
  Zap,
  Building2,
  Car,
  Package,
  Ship,
  Compass,
  Receipt,
  CalendarClock,
  Wallet,
  Megaphone,
  AlignJustify,
  MessageSquare,
  BarChart3,
  Activity,
  Shield,
  KeyRound,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BalaporIcon,
  BadonasiIcon,
  BakosIcon,
  UsersIcon,
} from '@/components/icons/service-icons';
import { type ServiceKey } from '@/components/ui/badge';
import { SidebarGroup } from './sidebar-group';
import { SidebarItem } from './sidebar-item';
import { SidebarBakabarDropdown } from './sidebar-bakabar-dropdown';

/* ─── Nav config (single source of truth untuk sidebar) ─── */

interface NavItemConfig {
  href: string;
  label: string;
  sublabel?: string;
  service?: ServiceKey;
  icon: ReactNode;
  /** Roles yg boleh akses. Kosong = super_admin only (default behavior). */
  roles?: string[];
  exact?: boolean;
  disabled?: boolean;
}

interface NavSectionConfig {
  label: string;
  items: NavItemConfig[];
  withDivider?: boolean;
  /** Kalau true, BAKABAR dropdown di-inject di awal section ini */
  withBakabarDropdown?: boolean;
}

const ALL_ADMINS = ['super_admin'];

const NAV_SECTIONS: NavSectionConfig[] = [
  {
    label: 'UTAMA',
    items: [
      {
        href: '/admin',
        label: 'Overview',
        sublabel: 'Dashboard utama',
        icon: <Zap size={15} />,
        exact: true,
        roles: ALL_ADMINS,
      },
    ],
  },
  {
    label: 'INFORMASI',
    withBakabarDropdown: true,
    items: [
      // BAKABAR dropdown di-inject via withBakabarDropdown flag (posisi pertama)
      {
        href: '/admin/reports',
        label: 'BALAPOR',
        sublabel: 'Laporan warga',
        service: 'balapor',
        icon: <BalaporIcon size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/funding',
        label: 'BADONASI',
        sublabel: 'Kampanye donasi',
        service: 'badonasi',
        icon: <BadonasiIcon size={15} />,
        roles: ALL_ADMINS,
      },
    ],
  },
  {
    label: 'PROPERTI & SEWA',
    items: [
      {
        href: '/admin/listings?type=kos',
        label: 'BAKOS',
        sublabel: 'Kos & penginapan',
        service: 'bakos',
        icon: <BakosIcon size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/listings?type=properti',
        label: 'Properti',
        sublabel: 'Rumah, tanah, ruko',
        service: 'properti',
        icon: <Building2 size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/listings?type=kendaraan',
        label: 'Kendaraan',
        sublabel: 'Jual & sewa',
        service: 'kendaraan',
        icon: <Car size={15} />,
        roles: ALL_ADMINS,
      },
    ],
  },
  {
    label: 'MOBILITAS',
    items: [
      {
        href: '/admin/coming-soon?service=baantar',
        label: 'BAANTAR',
        sublabel: 'Delivery & jastip',
        service: 'baantar',
        icon: <Package size={15} />,
        roles: ALL_ADMINS,
        disabled: true,
      },
      {
        href: '/admin/transport',
        label: 'BAPASIAR',
        sublabel: 'Kapal lokal & speed',
        service: 'bapasiar',
        icon: <Ship size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/coming-soon?service=baronda',
        label: 'BARONDA',
        sublabel: 'Antar-provinsi',
        service: 'baronda',
        icon: <Compass size={15} />,
        roles: ALL_ADMINS,
        disabled: true,
      },
    ],
  },
  {
    label: 'DAILY SERVICES',
    items: [
      {
        href: '/admin/coming-soon?service=ppob',
        label: 'PPOB',
        sublabel: 'Pembayaran tagihan',
        service: 'ppob',
        icon: <Receipt size={15} />,
        roles: ALL_ADMINS,
        disabled: true,
      },
      {
        href: '/admin/coming-soon?service=event',
        label: 'Event',
        sublabel: 'Acara & tiket',
        service: 'event',
        icon: <CalendarClock size={15} />,
        roles: ALL_ADMINS,
        disabled: true,
      },
    ],
  },
  {
    label: 'BISNIS',
    withDivider: true,
    items: [
      {
        href: '/admin/financial',
        label: 'Finansial',
        sublabel: 'Revenue & transaksi',
        service: 'finansial',
        icon: <Wallet size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/ads',
        label: 'Ads',
        sublabel: 'Iklan & performa',
        service: 'ads',
        icon: <Megaphone size={15} />,
        roles: ALL_ADMINS,
      },
    ],
  },
  {
    label: 'KOMUNIKASI',
    items: [
      {
        href: '/admin/ticker',
        label: 'Ticker',
        sublabel: 'Running text',
        service: 'ticker',
        icon: <AlignJustify size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/notifications',
        label: 'Notifikasi WA',
        sublabel: 'Push & blast',
        service: 'notifwa',
        icon: <MessageSquare size={15} />,
        roles: ALL_ADMINS,
      },
    ],
  },
  {
    label: 'INTELLIGENCE',
    withDivider: true,
    items: [
      {
        href: '/admin/analytics',
        label: 'Analytics',
        sublabel: 'Trafik & engagement',
        service: 'analytics',
        icon: <BarChart3 size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/system-health',
        label: 'System Health',
        sublabel: 'Server & API',
        service: 'syshealth',
        icon: <Activity size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/trust-safety',
        label: 'Trust & Safety',
        sublabel: 'Fraud & abuse',
        service: 'trustsafety',
        icon: <Shield size={15} />,
        roles: ALL_ADMINS,
      },
    ],
  },
  {
    label: 'PLATFORM',
    items: [
      {
        href: '/admin/users',
        label: 'Users',
        sublabel: 'Manajemen akun',
        service: 'users',
        icon: <UsersIcon size={15} />,
        roles: ALL_ADMINS,
      },
      {
        href: '/admin/coming-soon?service=roles',
        label: 'Roles & Access',
        sublabel: 'RBAC management',
        service: 'roles',
        icon: <KeyRound size={15} />,
        roles: ALL_ADMINS,
        disabled: true,
      },
    ],
  },
];

/* ─── Props ─── */

export interface SidebarNavProps {
  currentPath: string;
  userRole?: string | null;
  /** Draft count dari /admin/stats (untuk BAKABAR badge) */
  draftCount?: number;
  /** Callback saat navigate (close mobile drawer, dll) */
  onNavigate?: () => void;
  className?: string;
}

/* ─── Active state detection ─── */

function isItemActive(
  pathname: string,
  href: string,
  exact?: boolean
): boolean {
  const basePath = href.split('?')[0];
  if (exact) return pathname === basePath;

  // Listings has type-based filtering — special handling
  if (basePath === '/admin/listings' && href.includes('type=')) {
    if (pathname !== '/admin/listings') return false;
    if (typeof window === 'undefined') return false;
    const queryType = href.split('type=')[1];
    return window.location.search.includes(`type=${queryType}`);
  }

  return pathname.startsWith(basePath);
}

/* ─── Component ─── */

export function SidebarNav({
  currentPath,
  userRole,
  draftCount = 0,
  onNavigate,
  className,
}: SidebarNavProps) {
  // Filter sections berdasarkan role
  const filteredSections = useMemo(() => {
    return NAV_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (!item.roles || item.roles.length === 0) return true;
        if (!userRole) return false;
        return item.roles.includes(userRole);
      }),
    })).filter((section) => {
      // Section dengan BAKABAR dropdown tetap tampil meski items-nya kosong
      // (BAKABAR sendiri rendered via dropdown, bukan dari items array)
      if (section.withBakabarDropdown) return true;
      return section.items.length > 0;
    });
  }, [userRole]);

  return (
    <nav
      className={cn('flex flex-col pb-4', className)}
      aria-label="Admin sections"
    >
      {filteredSections.map((section) => (
        <SidebarGroup
          key={section.label}
          label={section.label}
          withDivider={section.withDivider}
        >
          {/* BAKABAR dropdown injected di awal section INFORMASI */}
          {section.withBakabarDropdown && (
            <SidebarBakabarDropdown
              currentPath={currentPath}
              draftCount={draftCount}
              onNavigate={onNavigate}
            />
          )}

          {section.items.map((item) => (
            <SidebarItem
              key={item.href}
              href={item.href}
              icon={item.icon}
              label={item.label}
              sublabel={item.sublabel}
              service={item.service}
              active={isItemActive(currentPath, item.href, item.exact)}
              disabled={item.disabled}
              onNavigate={onNavigate}
            />
          ))}
        </SidebarGroup>
      ))}
    </nav>
  );
}

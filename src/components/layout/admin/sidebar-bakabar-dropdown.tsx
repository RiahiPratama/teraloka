'use client';

/**
 * TeraLoka — SidebarBakabarDropdown (FLAT — Wave 2, 1 Juni 2026)
 * ------------------------------------------------------------
 * Dropdown DIHAPUS. Semua sub-fungsi (Editor Hub, Draft, Review,
 * Publikasi, Archived, RSS) sekarang jadi TAB di BAKABAR Command
 * Center (/admin/content). Sidebar cukup 1 link flat.
 *
 * Nama export & props dipertahankan supaya import di admin layout
 * gak patah (draftCount masih diterima → badge parent).
 */

import { SidebarItem } from './sidebar-item';
import { BakabarIcon } from '@/components/icons/service-icons';

export interface SidebarBakabarDropdownProps {
  currentPath: string;
  draftCount?: number;
  href?: string;
  onNavigate?: () => void;
  className?: string;
}

function isBakabarActive(pathname: string): boolean {
  return (
    pathname === '/admin/content' ||
    pathname.startsWith('/admin/content/') ||
    pathname.startsWith('/admin/rss') ||
    pathname === '/office/newsroom/bakabar' ||
    pathname.startsWith('/office/newsroom/bakabar/')
  );
}

export function SidebarBakabarDropdown({
  currentPath,
  draftCount = 0,
  href = '/admin/content',
  onNavigate,
  className,
}: SidebarBakabarDropdownProps) {
  return (
    <SidebarItem
      href={href}
      icon={
        <span className="flex items-center justify-center h-7 w-7 rounded-md bg-bakabar/15 text-bakabar">
          <BakabarIcon size={15} />
        </span>
      }
      label="BAKABAR"
      sublabel="Portal berita lokal"
      active={isBakabarActive(currentPath)}
      onNavigate={onNavigate}
      badge={draftCount > 0 ? { count: draftCount, tone: 'critical' } : undefined}
      className={className}
    />
  );
}

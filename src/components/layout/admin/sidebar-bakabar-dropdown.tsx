'use client';

/**
 * TeraLoka — SidebarBakabarDropdown
 * Phase 2 · Batch 5b — Layout Shell (Navigation)
 * Hotfix 2026-04-18: default href /admin/content (Super Admin moderation)
 * ------------------------------------------------------------
 * Special nav item — BAKABAR dropdown dengan children.
 * Mempreserve behavior existing admin layout:
 * - Auto-expand saat di halaman BAKABAR (/office/newsroom/bakabar/* atau /admin/rss)
 * - Klik parent: toggle + navigate ke Super Admin moderation view (/admin/content)
 * - Badge count untuk draft
 * - Sub-items nested (Editor Hub, Draft, Review, Publikasi, Archived, RSS Feed)
 *
 * Semantic clarity:
 * - PARENT link    → /admin/content    (Super Admin moderation view — approve/reject/archive)
 * - CHILDREN links → /office/newsroom/bakabar/hub* (writer portal, cross-portal shortcut)
 *                    + /admin/rss      (admin RSS management)
 *
 * Data source:
 * - `draftCount` di-pass dari parent (fetched via /admin/stats di AdminLayout)
 *
 * Contoh:
 *   <SidebarBakabarDropdown
 *     draftCount={7}
 *     currentPath={pathname}
 *     onNavigate={closeMobileDrawer}
 *   />
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BakabarIcon } from '@/components/icons/service-icons';
import { SidebarItem } from './sidebar-item';

/* ─── Sub-items config (preserve dari existing admin layout) ─── */

interface BakabarChild {
  href: string;
  label: string;
  icon: string;
  primary?: boolean;
  /** Kalau true, pakai `draftCount` sebagai badge */
  showDraftBadge?: boolean;
}

const BAKABAR_CHILDREN: BakabarChild[] = [
  { href: '/office/newsroom/bakabar/hub', label: 'Editor Hub', icon: '📰', primary: true },
  { href: '/office/newsroom/bakabar/hub?status=draft', label: 'Draft', icon: '📝', showDraftBadge: true },
  { href: '/office/newsroom/bakabar/hub?status=review', label: 'Review', icon: '🔍' },
  { href: '/office/newsroom/bakabar/hub?status=published', label: 'Publikasi', icon: '✅' },
  { href: '/office/newsroom/bakabar/hub?status=archived', label: 'Archived', icon: '🗂️' },
  { href: '/admin/rss', label: 'RSS Feed', icon: '📡' },
];

/* ─── Props ─── */

export interface SidebarBakabarDropdownProps {
  /** Current pathname untuk detect active state + auto-expand */
  currentPath: string;
  /** Draft count (dari /admin/stats) — untuk badge parent + child Draft */
  draftCount?: number;
  /** Target href parent link. Default: /admin/content (Super Admin moderation) */
  href?: string;
  /** Callback saat navigate (mis buat close mobile drawer) */
  onNavigate?: () => void;
  className?: string;
}

/* ─── Path match helpers ─── */

function isBakabarActive(pathname: string): boolean {
  return (
    pathname === '/office/newsroom/bakabar' ||
    pathname.startsWith('/office/newsroom/bakabar/') ||
    pathname === '/admin/content' ||
    pathname.startsWith('/admin/content/') ||
    pathname.startsWith('/admin/rss')
  );
}

function isChildActive(pathname: string, childHref: string): boolean {
  // Strip query params untuk compare base path
  const basePath = childHref.split('?')[0];
  const childQuery = childHref.includes('?')
    ? childHref.split('?')[1]
    : null;

  if (pathname !== basePath) return false;

  // Kalau childHref punya query (?status=draft), check apakah URL current match
  if (childQuery && typeof window !== 'undefined') {
    const currentQuery = window.location.search.slice(1);
    return currentQuery.includes(childQuery);
  }
  return !childQuery;
}

/* ─── Component ─── */

export function SidebarBakabarDropdown({
  currentPath,
  draftCount = 0,
  href = '/admin/content',
  onNavigate,
  className,
}: SidebarBakabarDropdownProps) {
  const active = isBakabarActive(currentPath);
  const [open, setOpen] = useState(false);

  // Auto-expand kalau di BAKABAR area
  useEffect(() => {
    if (active) setOpen(true);
  }, [active]);

  const toggleOpen = () => setOpen((o) => !o);

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Parent — BAKABAR */}
      <div className="relative">
        <Link
          href={href}
          onClick={() => {
            setOpen(true);
            onNavigate?.();
          }}
          className="no-underline block"
          aria-current={active ? 'page' : undefined}
        >
          <div
            className={cn(
              'group relative flex items-center gap-2.5 rounded-lg',
              'px-2 py-[7px] transition-colors duration-150 cursor-pointer',
              active ? 'bg-white/[0.08]' : 'hover:bg-white/[0.05]'
            )}
          >
            {/* Active accent bar */}
            {active && (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-bakabar"
              />
            )}

            {/* Icon bubble */}
            <div
              className={cn(
                'flex items-center justify-center shrink-0',
                'h-7 w-7 rounded-md',
                'bg-bakabar/15 text-bakabar'
              )}
            >
              <BakabarIcon size={15} />
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-[12.5px] leading-tight truncate',
                  active ? 'text-white font-semibold' : 'text-white/85 font-medium'
                )}
              >
                BAKABAR
              </div>
              <div className="text-[10.5px] text-white/45 mt-0.5 leading-tight truncate">
                Portal berita lokal
              </div>
            </div>

            {/* Draft badge */}
            {draftCount > 0 && (
              <span
                className={cn(
                  'shrink-0 inline-flex items-center justify-center',
                  'text-[10px] font-bold tabular-nums',
                  'px-1.5 h-[18px] min-w-[18px] rounded-full',
                  'bg-status-critical text-white'
                )}
              >
                {draftCount > 99 ? '99+' : draftCount}
              </span>
            )}

            {/* Chevron toggle — separate click area */}
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleOpen();
              }}
              aria-label={open ? 'Tutup submenu BAKABAR' : 'Buka submenu BAKABAR'}
              aria-expanded={open}
              className={cn(
                'shrink-0 p-1 -mr-1 rounded',
                'text-white/50 hover:text-white/80 hover:bg-white/5',
                'transition-transform duration-200',
                open && 'rotate-180'
              )}
            >
              <ChevronDown size={12} />
            </button>
          </div>
        </Link>
      </div>

      {/* Children — nested sub-items */}
      <div
        className={cn(
          'overflow-hidden transition-[max-height,opacity] duration-250 ease-out',
          open ? 'max-h-[400px] opacity-100 mt-0.5' : 'max-h-0 opacity-0'
        )}
      >
        <div className="flex flex-col gap-0.5 mb-1">
          {BAKABAR_CHILDREN.map((child) => {
            const childActive = isChildActive(currentPath, child.href);
            const showBadge = child.showDraftBadge && draftCount > 0;
            return (
              <SidebarItem
                key={`${child.href}-${child.label}`}
                href={child.href}
                icon={<span className="text-sm">{child.icon}</span>}
                label={child.label}
                active={childActive}
                nested
                onNavigate={onNavigate}
                badge={
                  showBadge
                    ? { count: draftCount, tone: 'critical' }
                    : undefined
                }
                className={cn(child.primary && 'font-semibold')}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

/**
 * TeraLoka — SidebarGroup
 * Phase 2 · Batch 5b — Layout Shell (Navigation)
 * ------------------------------------------------------------
 * Molecule nav — eyebrow label (INFORMASI, PROPERTI, dll) + list item.
 * Dipakai sebagai wrapper untuk SidebarItem di dalam section.
 *
 * Support:
 * - Collapsible (optional) — untuk compact mode future
 * - Divider visual antara group (via margin)
 *
 * Contoh:
 *   <SidebarGroup label="INFORMASI">
 *     <SidebarItem href="/admin/articles" ... />
 *     <SidebarItem href="/admin/reports" ... />
 *     <SidebarItem href="/admin/funding" ... />
 *   </SidebarGroup>
 */

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SidebarGroupProps {
  label: string;
  children: ReactNode;
  /** Tampilkan divider line horizontal sebelum group ini */
  withDivider?: boolean;
  className?: string;
}

export function SidebarGroup({
  label,
  children,
  withDivider = false,
  className,
}: SidebarGroupProps) {
  return (
    <div
      className={cn(
        'flex flex-col',
        withDivider && 'mt-2 pt-4 border-t border-white/[0.06]',
        !withDivider && 'mt-4 first:mt-2',
        className
      )}
    >
      {/* Eyebrow label */}
      <div
        className={cn(
          'px-3 mb-1.5',
          'text-[9.5px] font-bold uppercase tracking-[0.12em]',
          'text-white/40'
        )}
      >
        {label}
      </div>

      {/* Items */}
      <div className="flex flex-col gap-0.5 px-2">{children}</div>
    </div>
  );
}

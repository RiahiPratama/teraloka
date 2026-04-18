'use client';

/**
 * TeraLoka — SidebarBrand
 * Phase 2 · Batch 5a — Layout Shell
 * ------------------------------------------------------------
 * Header sidebar: logo TeraLoka + label sub-product (default: SUPER ADMIN).
 *
 * Desain:
 * - Logo bubble: T hijau (#1B6B4A) dengan titik orange (#E8963A) di pojok
 *   (mewakili "sunrise" brand philosophy)
 * - Label: "TeraLoka" 700 + subtitle uppercase tracking wide
 * - Klik logo → link ke /admin (home)
 *
 * Contoh:
 *   <SidebarBrand />
 *   <SidebarBrand subtitle="NEWSROOM" href="/office/newsroom/bakabar/hub" />
 */

import Link from 'next/link';
import { cn } from '@/lib/utils';

export interface SidebarBrandProps {
  /** Label sub-product di bawah "TeraLoka". Default "SUPER ADMIN" */
  subtitle?: string;
  /** Link target saat diklik. Default "/admin" */
  href?: string;
  className?: string;
}

export function SidebarBrand({
  subtitle = 'Super Admin',
  href = '/admin',
  className,
}: SidebarBrandProps) {
  return (
    <div
      className={cn(
        'shrink-0 px-4 py-[18px] border-b border-white/[0.06]',
        className
      )}
    >
      <Link
        href={href}
        className="flex items-center gap-2.5 no-underline group"
      >
        {/* Logo bubble */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'flex items-center justify-center',
              'w-9 h-9 rounded-[10px]',
              'bg-gradient-to-br from-brand-teal-lighter to-brand-blue',
              'text-white font-bold text-base leading-none',
              'shadow-[0_0_16px_rgba(27,107,74,0.35)]',
              'transition-all duration-200',
              'group-hover:shadow-[0_0_20px_rgba(27,107,74,0.5)]'
            )}
          >
            T
          </div>
          {/* Orange sunrise dot — corner accent */}
          <span
            aria-hidden="true"
            className={cn(
              'absolute -bottom-0.5 -right-0.5',
              'w-2.5 h-2.5 rounded-full',
              'bg-brand-orange ring-2 ring-brand-sidebar',
              'shadow-[0_0_8px_rgba(232,150,58,0.6)]'
            )}
          />
        </div>

        {/* Text */}
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-bold text-white leading-tight tracking-tight">
            TeraLoka
          </div>
          <div className="text-[9.5px] font-bold text-brand-teal-mint leading-tight tracking-[0.12em] uppercase mt-0.5">
            {subtitle}
          </div>
        </div>
      </Link>
    </div>
  );
}

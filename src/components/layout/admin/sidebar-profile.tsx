'use client';

/**
 * TeraLoka — SidebarProfile
 * Phase 2 · Batch 5c — Layout Shell (Footer)
 * ------------------------------------------------------------
 * Kartu user di bagian paling bawah sidebar. Nampilin:
 * - Avatar circle dengan inisial (gradient brand)
 * - Nama + role label
 * - Tombol logout (hover red)
 *
 * Contoh:
 *   <SidebarProfile
 *     user={{ name: 'Riahi Pratama', role: 'super_admin' }}
 *     onLogout={logout}
 *   />
 */

import { LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin',
  admin_content: 'Admin Konten',
  admin_transport: 'Admin Transport',
  admin_listing: 'Admin Listing',
  admin_funding: 'Admin Funding',
};

export interface ProfileUser {
  name?: string | null;
  role?: string | null;
}

export interface SidebarProfileProps {
  user: ProfileUser;
  onLogout?: () => void;
  className?: string;
}

export function SidebarProfile({
  user,
  onLogout,
  className,
}: SidebarProfileProps) {
  const initial = (user.name?.charAt(0) ?? '?').toUpperCase();
  const roleLabel = user.role ? (ROLE_LABEL[user.role] ?? user.role) : '';

  return (
    <div
      className={cn(
        'shrink-0 border-t border-white/[0.06] p-3',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2.5 px-2 py-2 rounded-lg',
          'bg-white/[0.04] hover:bg-white/[0.06] transition-colors'
        )}
      >
        {/* Avatar circle */}
        <div
          className={cn(
            'flex items-center justify-center shrink-0',
            'h-8 w-8 rounded-full',
            'bg-gradient-to-br from-brand-teal-lighter to-brand-blue',
            'text-white font-bold text-[13px] leading-none',
            'ring-2 ring-white/[0.08]'
          )}
          aria-hidden="true"
        >
          {initial}
        </div>

        {/* Name + role */}
        <div className="flex-1 min-w-0">
          <div className="text-[12.5px] font-semibold text-white leading-tight truncate">
            {user.name ?? 'Admin'}
          </div>
          {roleLabel && (
            <div className="text-[10.5px] text-brand-teal-mint leading-tight mt-0.5 truncate">
              {roleLabel}
            </div>
          )}
        </div>

        {/* Logout button */}
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            aria-label="Logout"
            title="Logout"
            className={cn(
              'shrink-0 inline-flex items-center justify-center',
              'h-7 w-7 rounded-md',
              'text-white/50 hover:text-status-critical hover:bg-status-critical/10',
              'transition-colors',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-status-critical/50'
            )}
          >
            <LogOut size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
